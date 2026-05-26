import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { normalizeTodayMatch } from './footystats.normalizer';
import { buildIntelXPreGame } from './matches.intelx';
import { FootyStoreService } from './footy-store.service';
import { getBogotaDateKey } from './utils/footy-date.util';

type MatchesTab = 'today' | 'live' | 'upcoming' | 'finished' | 'all';

@Injectable()
export class FootystatsService {
  private readonly logger = new Logger(FootystatsService.name);

  private readonly baseUrl: string;
  private readonly detailsBaseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly store: FootyStoreService,
  ) {
    this.baseUrl = (
      this.config.get<string>('FOOTYSTATS_API_BASE') ||
      'https://api.footystats.org'
    ).replace(/\/$/, '');

    this.detailsBaseUrl = (
      this.config.get<string>('FOOTYSTATS_DETAILS_BASE') ||
      'https://api.football-data-api.com'
    ).replace(/\/$/, '');

    this.apiKey = this.config.get<string>('FOOTYSTATS_API_KEY') || '';
    this.timeoutMs = Number(
      this.config.get<string>('FOOTYSTATS_TIMEOUT_MS') || 12000,
    );

    if (!this.apiKey) this.logger.error('❌ FOOTYSTATS_API_KEY is missing');
  }

  // ------------------------------------------------------------
  // Extra: DB info
  // ------------------------------------------------------------
  async getDbInfo() {
    return this.store.getDbInfo();
  }

  // ------------------------------------------------------------
  // HTTP helpers
  // ------------------------------------------------------------
  async get<T = any>(
    path: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const finalParams = { ...params, key: this.apiKey };

    try {
      const res$ = this.http.get<T>(url, {
        params: finalParams,
        timeout: this.timeoutMs,
      });
      const { data } = await firstValueFrom(res$);
      return data;
    } catch (e: any) {
      const status = e?.response?.status;
      const apiMsg = e?.response?.data?.message;

      this.logger.error(
        `FootyStats GET failed -> ${url} :: status=${status} msg=${apiMsg || e?.message}`,
      );

      throw new BadGatewayException({
        ok: false,
        provider: 'footystats',
        url,
        status,
        message: apiMsg || e?.message,
      });
    }
  }

  async getDetails<T = any>(
    path: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    const url = `${this.detailsBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const finalParams = { ...params, key: this.apiKey };

    try {
      const res$ = this.http.get<T>(url, {
        params: finalParams,
        timeout: this.timeoutMs,
      });
      const { data } = await firstValueFrom(res$);
      return data;
    } catch (e: any) {
      const status = e?.response?.status;
      const apiMsg = e?.response?.data?.message;

      this.logger.error(
        `MatchDetails GET failed -> ${url} :: status=${status} msg=${apiMsg || e?.message}`,
      );

      throw new BadGatewayException({
        ok: false,
        provider: 'football-data-api',
        url,
        status,
        message: apiMsg || e?.message,
      });
    }
  }

  // ------------------------------------------------------------
  // Leagues API (para arreglar TS2339)
  // ------------------------------------------------------------
  async getLeagues(params?: { country_id?: number; season_id?: number }) {
    return this.get('/league-list', {
      ...(params?.country_id ? { country_id: params.country_id } : {}),
      ...(params?.season_id ? { season_id: params.season_id } : {}),
    });
  }

  async getLeagueMatches(params: {
    league_id: number;
    page?: number;
    max_per_page?: number;
  }) {
    return this.get('/league-matches', {
      league_id: params.league_id,
      page: params.page ?? 1,
      max_per_page: params.max_per_page ?? 200,
    });
  }

  // ------------------------------------------------------------
  // Daily matches (provider)
  // ------------------------------------------------------------
  private async fetchAllTodayMatchesPaged(params: {
    dateKey: string;
    timezone: string;
    maxPages?: number;
  }): Promise<any[]> {
    const { dateKey, timezone } = params;
    const maxPages = params.maxPages ?? 30;

    const all: any[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const raw = await this.get('/todays-matches', {
        timezone,
        date: dateKey,
        page,
      });
      const items = Array.isArray((raw as any)?.data) ? (raw as any).data : [];
      if (!items.length) break;
      all.push(...items);
    }
    return all;
  }

  async getTodayMatches(): Promise<any> {
    const dateKey = getBogotaDateKey();
    const timezone = 'America/Bogota';
    const items = await this.fetchAllTodayMatchesPaged({
      dateKey,
      timezone,
      maxPages: 30,
    });
    return { data: items };
  }

  // ------------------------------------------------------------
  // Controller needs: getMatches()
  // ------------------------------------------------------------
  async getMatches(params: {
    tab: string;
    competitionId?: number;
    force?: boolean;
  }) {
    const tab = (params.tab || 'today').toLowerCase() as MatchesTab;
    const dateKey = getBogotaDateKey();

    const TTL_MS =
      tab === 'live'
        ? 2 * 60_000
        : tab === 'finished'
          ? 5 * 60_000
          : 10 * 60_000;

    const meta = await this.store.getDailySnapshotMeta(dateKey);
    const nowMs = Date.now();

    const snapshotAgeMsRaw = meta?.fetchedAt
      ? nowMs - meta.fetchedAt.getTime()
      : Infinity;
    const snapshotAgeMs =
      snapshotAgeMsRaw === Infinity ? Infinity : Math.max(0, snapshotAgeMsRaw);
    const isFresh = snapshotAgeMs <= TTL_MS;

    let source: 'db' | 'provider' = 'db';

    if (!meta || !isFresh || params.force) {
      if (params.force) await this.store.deleteDaily(dateKey);

      const raw = await this.getTodayMatches();
      const items = Array.isArray(raw?.data) ? raw.data : [];

      const normalized = items.map((x: any) => {
        const n = normalizeTodayMatch(x);
        return {
          id: n.id,
          competitionId: n.competitionId ?? null,
          kickoffUnix: n.kickoffUnix ?? null,
          statusRaw: n.statusRaw ?? null,
          state: n.state ?? 'unknown',
          home: { id: n.home?.id, name: n.home?.name },
          away: { id: n.away?.id, name: n.away?.name },
          payload: n,
        };
      });

      await this.store.upsertDailyMatches(dateKey, normalized);
      source = 'provider';
    }

    const matches = await this.store.getDailyMatches({
      dateKey,
      tab,
      competitionId: params.competitionId,
    });

    const meta2 = await this.store.getDailySnapshotMeta(dateKey);
    const diffMs = meta2?.fetchedAt
      ? Date.now() - meta2.fetchedAt.getTime()
      : null;
    const snapshotAgeSecRaw =
      diffMs === null ? null : Math.trunc(diffMs / 1000);
    const snapshotAgeSec =
      snapshotAgeSecRaw === null ? null : Math.max(0, snapshotAgeSecRaw);

    return {
      ok: true,
      tab,
      count: matches.length,
      items: matches,
      source,
      snapshotAgeSec,
      ttlSec: Math.floor(TTL_MS / 1000),
      dateKey,
    };
  }

  // ------------------------------------------------------------
  // Match details
  // ------------------------------------------------------------
  async getMatchDetails(match_id: number): Promise<any> {
    return this.getDetails('/match', { match_id });
  }

  async getMatchRaw(matchId: number) {
    const raw = await this.getMatchDetails(matchId);
    return { ok: true, matchId, raw };
  }

  // ------------------------------------------------------------
  // IntelX helpers
  // ------------------------------------------------------------
  private pickFirstMatch(raw: any) {
    if (!raw) return null;
    if (Array.isArray(raw?.data) && raw.data.length) return raw.data[0];
    if (raw?.data?.match) return raw.data.match;
    if (raw?.match) return raw.match;
    return raw?.data ?? raw;
  }

  private detectHasLineups(item: any): boolean {
    const candidates = [
      item?.lineups,
      item?.lineup,
      item?.starting_xi,
      item?.startingXI,
      item?.starting11,
      item?.home_lineup,
      item?.away_lineup,
      item?.home_team_lineup,
      item?.away_team_lineup,
    ];

    for (const c of candidates) {
      if (Array.isArray(c) && c.length > 0) return true;
      if (c && typeof c === 'object' && Object.keys(c).length > 0) return true;
    }
    return false;
  }

  /**
   * ✅ CLAVE PARA IA:
   * - Guarda SIEMPRE footy_match_details
   */
  async getMatchIntel(matchId: number) {
    const raw = await this.getMatchDetails(matchId);
    const item = this.pickFirstMatch(raw);

    if (!item) return { ok: false, matchId, message: 'Match details empty' };

    const hasLineups = this.detectHasLineups(item);

    // ✅ guardar details siempre
    await this.store.upsertMatchDetails(matchId, item, hasLineups);

    // ✅ traer prematch desde el daily cache (porque /match muchas veces NO trae xg/ppg)
    const dateKey = getBogotaDateKey();
    const daily = await this.store.getDailyMatchPayload(dateKey, matchId);

    const prematch = daily?.prematch ?? {};
    const dailyKickoffUnix = daily?.kickoffUnix ?? null;
    const dailyCompetitionId = daily?.competitionId ?? null;

    const kickoffUnix =
      (typeof item?.date_unix === 'number' ? item.date_unix : null) ??
      dailyKickoffUnix;

    const competitionId =
      (typeof item?.competition_id === 'number'
        ? item.competition_id
        : item?.competition_id != null
          ? Number(item.competition_id)
          : null) ?? dailyCompetitionId;

    const status = String(item?.status || '').toLowerCase();
    const state =
      status === 'complete'
        ? 'finished'
        : status === 'incomplete'
          ? 'scheduled'
          : 'unknown';

    const adapted = {
      ...item,

      kickoffUnix,
      competitionId,
      state,

      // ✅ PPG (details -> daily.prematch fallback)
      home_ppg:
        item?.home_ppg ??
        item?.pre_match_home_ppg ??
        prematch?.homePpg ??
        prematch?.home_ppg ??
        null,

      away_ppg:
        item?.away_ppg ??
        item?.pre_match_away_ppg ??
        prematch?.awayPpg ??
        prematch?.away_ppg ??
        null,

      // ✅ XG (details -> daily.prematch fallback)
      team_a_xg:
        item?.team_a_xg ??
        item?.team_a_xg_prematch ??
        prematch?.xgHome ??
        prematch?.team_a_xg ??
        null,

      team_b_xg:
        item?.team_b_xg ??
        item?.team_b_xg_prematch ??
        prematch?.xgAway ??
        prematch?.team_b_xg ??
        null,

      total_xg:
        item?.total_xg ??
        item?.total_xg_prematch ??
        prematch?.xgTotal ??
        prematch?.total_xg ??
        null,

      // ✅ Potentials (details -> daily.prematch fallback)
      btts_potential: item?.btts_potential ?? prematch?.bttsPotential ?? null,
      corners_potential:
        item?.corners_potential ?? prematch?.cornersPotential ?? null,
      cards_potential:
        item?.cards_potential ?? prematch?.cardsPotential ?? null,
      offsides_potential:
        item?.offsides_potential ?? prematch?.offsidesPotential ?? null,
    };

    return {
      ok: true,
      matchId,
      hasLineups,
      intelx: buildIntelXPreGame(adapted),
    };
  }

  // ...tu archivo completo igual, SOLO asegúrate de tener esto al final (o donde quieras)
  // agrega este método dentro de FootystatsService (al final está bien)
  // en FootystatsService (o donde tengas el método)
  // dentro de FootystatsService

  async getMatchAnalysis(matchId: number) {
    const data = await this.store.getAnalysisJson(matchId);

    // respuesta estable para front/scripts
    if (!data) {
      return {
        ok: true, // 👈 mejor true para que el front no lo trate como error HTTP lógico
        matchId,
        status: 'MISSING',
        analyzedAt: null,
        error: null,
        analysis: null,
      };
    }

    // si existe fila, siempre devuelve shape estable
    return {
      ok: true,
      matchId: data.matchId ?? matchId,
      status: data.status ?? 'UNKNOWN',
      analyzedAt: data.analyzedAt ?? null,
      error: data.error ?? null,
      analysis: data.analysis ?? null,
    };
  }

  async enqueueAnalysis(matchId: number) {
    // crea/reescribe estado PENDING y limpia campos para re-análisis
    await this.store.upsertAnalysis({
      matchId,
      status: 'PENDING',
      analysisVersion: 1,
      inputHash: null,
      analysisJson: null,
      error: null,
      analyzedAt: null,
    });

    return { ok: true, matchId, status: 'PENDING' };
  }

  // lastx (team form + recent matches)
  async getLastX(params: { team_id: number; last?: number }) {
    return this.getDetails('/lastx', {
      team_id: params.team_id,
      ...(params.last ? { last: params.last } : {}),
    });
  }

  // league baselines
  async getLeagueSeason(params: { season_id: number }) {
    return this.getDetails('/league-season', { season_id: params.season_id });
  }
}

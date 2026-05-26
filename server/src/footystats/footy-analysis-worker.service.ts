// src/footystats/footy-analysis-worker.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { FootyStoreService } from './footy-store.service';
import { FootystatsService } from './footystats.service';
import { FootyAiService } from './ai/footy-ai.service';
import { buildIntelXAiInput, buildFormPackFromLastX } from './ai/footy-ai-input.builder';

@Injectable()
export class FootyAnalysisWorkerService {
  private readonly logger = new Logger(FootyAnalysisWorkerService.name);

  private readonly maxPerTick = 3;
  private readonly detailsRefetchIfOlderThanMs = 60_000;
  private readonly retryCooldownMs = 90_000;

  private readonly lastxTtlMs = 6 * 60 * 60_000;
  private readonly lastxDefaultLast = 15;

  constructor(
    private readonly store: FootyStoreService,
    private readonly footy: FootystatsService,
    private readonly ai: FootyAiService,
  ) {}

  @Cron('*/1 * * * *', { timeZone: 'America/Bogota' })
  async processPending(): Promise<void> {
    const pending = await this.store.listPendingAnalysis(this.maxPerTick, this.retryCooldownMs);
    if (!pending.length) return;

    for (const a of pending) {
      const matchId = Number(a.matchId);
      const claimed = await this.store.claimPending(matchId);
      if (!claimed) continue;

      try {
        const details = await this.ensureDetails(matchId);

        if (!details) {
          await this.store.upsertAnalysis({
            matchId,
            status: 'FAILED',
            error: 'details_missing',
            analyzedAt: new Date(),
          });
          continue;
        }

        // ✅ Prematch: NO bloqueamos por lineups
        // details.hasLineups se usará solo como señal / risk flag en el output
        const homeTeamId = Number(
          details.payload?.homeID ??
            details.payload?.home_id ??
            details.payload?.home_team_id ??
            0,
        );
        const awayTeamId = Number(
          details.payload?.awayID ??
            details.payload?.away_id ??
            details.payload?.away_team_id ??
            0,
        );

        const homeLastX = await this.getOrFetchLastX(homeTeamId);
        const awayLastX = await this.getOrFetchLastX(awayTeamId);

        const homePack = homeLastX?.payload
          ? buildFormPackFromLastX(homeTeamId, homeLastX.payload)
          : null;

        const awayPack = awayLastX?.payload
          ? buildFormPackFromLastX(awayTeamId, awayLastX.payload)
          : null;

        const generatedAt = new Date().toISOString();

        let aiInput = buildIntelXAiInput({
          matchId,
          generatedAt,
          detailsPayload: details.payload,
          formHome: homePack?.form,
          formAway: awayPack?.form,
          recentHome: homePack?.recent ?? [],
          recentAway: awayPack?.recent ?? [],
          // (si luego agregas h2h real, lo pasas aquí)
        });

        // ✅ Compact input (sin romper shape)
        aiInput = this.compactAiInput(aiInput, {
          hasLineups: !!details.hasLineups,
          homeLastxLen: Array.isArray(homeLastX?.payload?.data) ? homeLastX?.payload?.data?.length : null,
          awayLastxLen: Array.isArray(awayLastX?.payload?.data) ? awayLastX?.payload?.data?.length : null,
        });

        const inputHash = createHash('sha256')
          .update(JSON.stringify(aiInput))
          .digest('hex');

        const existing = await this.store.getAnalysis(matchId);
        if (existing && existing.status === 'ANALYZED' && existing.inputHash === inputHash) {
          await this.store.upsertAnalysis({
            matchId,
            status: 'ANALYZED',
            inputHash,
            analyzedAt: new Date(),
            error: null,
          });
          this.logger.log(`✅ Skip OpenAI (same inputHash) matchId=${matchId}`);
          continue;
        }

        const { analysis, usage, model } = await this.ai.analyzeMatch(aiInput);

        await this.store.upsertAnalysis({
          matchId,
          status: 'ANALYZED',
          analysisVersion: a.analysisVersion ?? 1,
          inputHash,
          analysisJson: {
            ...analysis,
            _usage: usage ?? null,
            _model: model ?? null,
          },
          analyzedAt: new Date(),
          error: null,
        });

        this.logger.log(
          `🤖 Analyzed match ${matchId} -> saved` +
            (usage?.total_tokens ? ` (tokens=${usage.total_tokens})` : ''),
        );
      } catch (e: any) {
        const msg = e?.message || String(e);
        const now = new Date();

        if (this.isTransientOpenAiError(msg)) {
          await this.store.upsertAnalysis({
            matchId,
            status: 'PENDING',
            error: `transient:${msg}`.slice(0, 900),
            analyzedAt: now,
          });
          this.logger.warn(`⏳ Transient error -> requeue matchId=${matchId}: ${msg}`);
          continue;
        }

        await this.store.upsertAnalysis({
          matchId,
          status: 'FAILED',
          error: msg.slice(0, 900),
          analyzedAt: now,
        });
        this.logger.error(`❌ Analyze failed match ${matchId}: ${msg}`);
      }
    }
  }

  private compactAiInput(aiInput: any, debug?: Record<string, any>) {
    // 1) recent matches: max 6 y solo essentials
    const trimRecent = (arr: any[]) =>
      (Array.isArray(arr) ? arr : [])
        .slice(0, 6)
        .map((m) => ({
          matchId: m.matchId,
          dateUnix: m.dateUnix,
          competitionId: m.competitionId ?? null,
          score: m.score ?? null,
          xg: m.xg ?? null,
        }));

    if (aiInput?.recentMatches) {
      aiInput.recentMatches.home = trimRecent(aiInput.recentMatches.home);
      aiInput.recentMatches.away = trimRecent(aiInput.recentMatches.away);
      if (Array.isArray(aiInput.recentMatches.h2h)) {
        aiInput.recentMatches.h2h = trimRecent(aiInput.recentMatches.h2h);
      }
    }

    // 2) lineups: max 11, solo campos ligeros
    const trimLineup = (lu: any) => {
      if (!lu || !Array.isArray(lu.players)) return lu;
      lu.players = lu.players
        .slice(0, 11)
        .map((p: any) => ({ name: p.name, position: p.position ?? null, number: p.number ?? null }));
      return lu;
    };

    if (aiInput?.lineups) {
      aiInput.lineups.home = trimLineup(aiInput.lineups.home);
      aiInput.lineups.away = trimLineup(aiInput.lineups.away);
    }

    // 3) debug mínimo (no rompe contrato, pero NO lo mandes al UI output)
    if (debug) {
      aiInput.meta = aiInput.meta || {};
      (aiInput.meta as any)._dbg = debug;
    }

    return aiInput;
  }

  private async getOrFetchLastX(teamId: number): Promise<{ payload: any } | null> {
    if (!teamId || !Number.isFinite(teamId)) return null;

    const fresh = await this.store.isTeamLastXFresh(teamId, this.lastxTtlMs);
    if (fresh) {
      const row = await this.store.getTeamLastX(teamId);
      return row ? ({ payload: (row as any).payload } as any) : null;
    }

    try {
      const raw = await this.footy.getLastX({ team_id: teamId, last: this.lastxDefaultLast });
      await this.store.upsertTeamLastX(teamId, raw, this.lastxDefaultLast);
      return { payload: raw };
    } catch (e: any) {
      this.logger.warn(`lastx fetch failed teamId=${teamId} :: ${e?.message || e}`);
      const row = await this.store.getTeamLastX(teamId);
      return row ? ({ payload: (row as any).payload } as any) : null;
    }
  }

  private isTransientOpenAiError(msg: string): boolean {
    const m = (msg || '').toLowerCase();
    return (
      m.includes('429') ||
      m.includes('rate limit') ||
      m.includes('timeout') ||
      m.includes('etimedout') ||
      m.includes('econnreset') ||
      m.includes('gateway') ||
      m.includes('503') ||
      m.includes('502') ||
      m.includes('overloaded')
    );
  }

  private async ensureDetails(matchId: number) {
    const existing = await this.store.getMatchDetails(matchId);

    const shouldFetch =
      !existing ||
      (!existing.hasLineups && this.isOlderThan(existing.fetchedAt, this.detailsRefetchIfOlderThanMs));

    if (!shouldFetch) return existing;

    try {
      const raw = await this.footy.getMatchDetails(matchId);
      const item = this.pickFirstMatch(raw);

      if (!item) {
        this.logger.warn(`ensureDetails: provider returned empty match matchId=${matchId}`);
        return existing ?? null;
      }

      const hasLineups = this.detectHasLineups(item);
      await this.store.upsertMatchDetails(matchId, item, hasLineups);

      return await this.store.getMatchDetails(matchId);
    } catch (e: any) {
      this.logger.warn(`ensureDetails: provider fetch failed matchId=${matchId} :: ${e?.message || e}`);
      return existing ?? null;
    }
  }

  private isOlderThan(dt: Date | null, ms: number): boolean {
    if (!dt) return true;
    return Date.now() - new Date(dt).getTime() > ms;
  }

  private pickFirstMatch(raw: any) {
    if (!raw) return null;
    if (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return (raw.data as any).match ?? raw.data;
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

    const lu = item?.lineups;
    if (lu && typeof lu === 'object') {
      const subCandidates = [lu?.home, lu?.away, lu?.team_a, lu?.team_b, lu?.startingXI, lu?.starting_xi, lu?.starting11];
      for (const s of subCandidates) {
        if (Array.isArray(s) && s.length > 0) return true;
        if (s && typeof s === 'object' && Object.keys(s).length > 0) return true;
      }
    }

    return false;
  }
}

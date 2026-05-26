// src/footystats/footy-store.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  FootyDailyMatchEntity,
  FootyMatchState,
} from './entities/footy-daily-match.entity';
import { FootyMatchDetailsEntity } from './entities/footy-match-details.entity';
import { FootyMatchAnalysisEntity } from './entities/footy-match-analysis.entity';
import { FootyTeamLastXEntity } from './entities/footy-team-lastx.entity';
import { FootyLeagueSeasonEntity } from './entities/footy-league-season.entity';

@Injectable()
export class FootyStoreService {
  constructor(
    @InjectRepository(FootyDailyMatchEntity)
    private readonly dailyRepo: Repository<FootyDailyMatchEntity>,

    @InjectRepository(FootyMatchDetailsEntity)
    private readonly detailsRepo: Repository<FootyMatchDetailsEntity>,

    @InjectRepository(FootyMatchAnalysisEntity)
    private readonly analysisRepo: Repository<FootyMatchAnalysisEntity>,

    @InjectRepository(FootyTeamLastXEntity)
    private readonly lastxRepo: Repository<FootyTeamLastXEntity>,

    @InjectRepository(FootyLeagueSeasonEntity)
    private readonly leagueSeasonRepo: Repository<FootyLeagueSeasonEntity>,
  ) {}

  // ============================================================
  // DAILY MATCHES (todays-matches)
  // ============================================================

  async countDaily(dateKey: string): Promise<number> {
    return this.dailyRepo
      .createQueryBuilder('m')
      .where('m.dateKey = :dateKey', { dateKey })
      .andWhere('m.matchId > 0')
      .getCount();
  }

  async upsertDailyMatches(
    dateKey: string,
    items: Array<{
      id: number;
      competitionId?: number | null;
      kickoffUnix?: number | null;
      statusRaw?: string | null;
      state?: FootyMatchState;
      home?: { id?: number; name?: string };
      away?: { id?: number; name?: string };
      payload: any;
    }>,
  ): Promise<void> {
    const fetchedAt = new Date();
    const META_MATCH_ID = -1;

    if (!items.length) {
      await this.dailyRepo.upsert(
        [
          {
            dateKey,
            matchId: META_MATCH_ID,
            competitionId: null,
            kickoffUnix: null,
            statusRaw: null,
            state: 'unknown',
            homeId: null,
            homeName: null,
            awayId: null,
            awayName: null,
            payload: { meta: true, dateKey },
            fetchedAt,
          } as any,
        ],
        ['dateKey', 'matchId'],
      );
      return;
    }

    const rows = items.map((m) => ({
      dateKey,
      matchId: m.id,
      competitionId: m.competitionId ?? null,
      kickoffUnix: m.kickoffUnix ?? null,
      statusRaw: m.statusRaw ?? null,
      state: (m.state ?? 'unknown') as FootyMatchState,
      homeId: m.home?.id ?? null,
      homeName: m.home?.name ?? null,
      awayId: m.away?.id ?? null,
      awayName: m.away?.name ?? null,
      payload: m.payload,
      fetchedAt,
    }));

    rows.push({
      dateKey,
      matchId: META_MATCH_ID,
      competitionId: null,
      kickoffUnix: null,
      statusRaw: null,
      state: 'unknown',
      homeId: null,
      homeName: null,
      awayId: null,
      awayName: null,
      payload: { meta: true, dateKey },
      fetchedAt,
    } as any);

    await this.dailyRepo.upsert(rows as any, ['dateKey', 'matchId']);
  }

  async getDailyMatches(params: {
    dateKey: string;
    competitionId?: number;
    tab?: 'today' | 'live' | 'upcoming' | 'finished' | 'all';
  }): Promise<any[]> {
    const tab = (params.tab ?? 'today') as any;

    const qb = this.dailyRepo.createQueryBuilder('m');
    qb.where('m.dateKey = :dateKey', { dateKey: params.dateKey });
    qb.andWhere('m.matchId > 0');

    if (params.competitionId) {
      qb.andWhere('m.competitionId = :cid', { cid: params.competitionId });
    }

    if (tab === 'live') qb.andWhere('m.state = :s', { s: 'live' });
    if (tab === 'upcoming') qb.andWhere('m.state = :s', { s: 'upcoming' });
    if (tab === 'finished') qb.andWhere('m.state = :s', { s: 'finished' });

    qb.orderBy(
      `CASE
        WHEN m.state = 'live' THEN 0
        WHEN m.state = 'upcoming' THEN 1
        WHEN m.state = 'unknown' THEN 2
        WHEN m.state = 'finished' THEN 3
        ELSE 4
      END`,
      'ASC',
    );

    qb.addOrderBy('m.kickoffUnix', 'ASC');

    const rows = await qb.getMany();
    return rows.map((r) => r.payload);
  }

  async getDailyMatchPayload(
    dateKey: string,
    matchId: number,
  ): Promise<any | null> {
    const row = await this.dailyRepo.findOne({
      where: { dateKey, matchId } as any,
      select: ['payload'] as any,
    });
    return row?.payload ?? null;
  }

  async getDailySnapshotMeta(
    dateKey: string,
  ): Promise<{ fetchedAt: Date } | null> {
    const row = await this.dailyRepo
      .createQueryBuilder('m')
      .select('MAX(m.fetchedAt)', 'fetchedAt')
      .where('m.dateKey = :dateKey', { dateKey })
      .getRawOne<{ fetchedAt: string | null }>();

    if (!row?.fetchedAt) return null;
    return { fetchedAt: new Date(row.fetchedAt) };
  }

  async deleteDaily(dateKey: string): Promise<void> {
    await this.dailyRepo.delete({ dateKey } as any);
  }

  async getDailyMatchIds(dateKey: string): Promise<number[]> {
    const rows = await this.dailyRepo
      .createQueryBuilder('m')
      .select('m.matchId', 'matchId')
      .where('m.dateKey = :dateKey', { dateKey })
      .andWhere('m.matchId > 0')
      .getRawMany<{ matchId: number }>();

    return rows
      .map((r) => Number(r.matchId))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  // ============================================================
  // MATCH DETAILS
  // ============================================================

  async upsertMatchDetails(
    matchId: number,
    payload: any,
    hasLineups: boolean,
  ): Promise<void> {
    const now = new Date();
    const lineupsUpdatedAtUnix = hasLineups
      ? Math.floor(now.getTime() / 1000)
      : null;

    await this.detailsRepo.upsert(
      [
        {
          matchId,
          payload,
          hasLineups,
          lineupsUpdatedAtUnix,
          fetchedAt: now,
        } as any,
      ],
      ['matchId'],
    );
  }

  async getMatchDetails(
    matchId: number,
  ): Promise<FootyMatchDetailsEntity | null> {
    return this.detailsRepo
      .createQueryBuilder('d')
      .where('d.matchId = :matchId', { matchId })
      .getOne();
  }

  async findDetailsMissingLineups(matchIds: number[]): Promise<number[]> {
    if (!matchIds.length) return [];

    const rows = await this.detailsRepo.find({
      select: ['matchId', 'hasLineups'] as any,
      where: { matchId: In(matchIds) },
    });

    const have = new Set(
      rows.filter((r) => r.hasLineups).map((r) => Number(r.matchId)),
    );
    return matchIds.filter((id) => !have.has(id));
  }

  // ============================================================
  // ANALYSIS
  // ============================================================

  async getAnalysis(matchId: number): Promise<FootyMatchAnalysisEntity | null> {
    return this.analysisRepo.findOne({ where: { matchId } });
  }

  async getAnalysisJson(matchId: number): Promise<any | null> {
    const row = await this.analysisRepo.findOne({
      where: { matchId } as any,
      select: ['analysisJson', 'status', 'analyzedAt', 'error'] as any,
    });

    if (!row) return null;

    return {
      matchId,
      status: (row as any).status ?? null,
      analyzedAt: (row as any).analyzedAt ?? null,
      error: (row as any).error ?? null,
      analysis: (row as any).analysisJson ?? null,
    };
  }

  /**
   * ✅ FIX: evita error "entity id is not set"
   * No usar repository.upsert() porque intenta hidratar con PK autogenerada.
   * Usar insert + orUpdate + updateEntity(false).
   */
  // Reemplaza SOLO el método upsertAnalysis por este:

  // dentro de FootyStoreService

  // dentro de FootyStoreService
async upsertAnalysis(params: {
  matchId: number;
  status: 'PENDING' | 'READY' | 'ANALYZED' | 'FAILED';
  analysisVersion?: number;
  inputHash?: string | null;
  analysisJson?: any | null;
  error?: string | null;
  analyzedAt?: Date | null;
}): Promise<void> {
  const matchId = Number(params.matchId);

  const analysisVersion = params.analysisVersion ?? 1;
  const inputHash = params.inputHash ?? null;
  const error = params.error ?? null;

  // MySQL JSON: pásalo como string (driver lo castea bien)
  const analysisJson =
    params.analysisJson == null ? null : JSON.stringify(params.analysisJson);

  // MySQL DATETIME: si pasas Date, mysql2 lo serializa; si no, null.
  const analyzedAt = params.analyzedAt ?? null;

  await this.analysisRepo.query(
    `
    INSERT INTO footy_match_analysis
      (matchId, status, analysisVersion, inputHash, analysisJson, error, analyzedAt)
    VALUES
      (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      analysisVersion = VALUES(analysisVersion),
      inputHash = VALUES(inputHash),
      analysisJson = VALUES(analysisJson),
      error = VALUES(error),
      analyzedAt = VALUES(analyzedAt)
    `,
    [matchId, params.status, analysisVersion, inputHash, analysisJson, error, analyzedAt],
  );
}


  /**
   * ✅ LIST PENDING con cooldown
   */
  async listPendingAnalysis(
    limit = 5,
    retryCooldownMs = 0,
  ): Promise<FootyMatchAnalysisEntity[]> {
    const qb = this.analysisRepo.createQueryBuilder('a');
    qb.where('a.status = :s', { s: 'PENDING' });

    if (retryCooldownMs > 0) {
      qb.andWhere(
        '(a.analyzedAt IS NULL OR a.analyzedAt < (NOW() - INTERVAL :sec SECOND))',
        { sec: Math.floor(retryCooldownMs / 1000) },
      );
    }

    qb.orderBy('a.matchId', 'ASC').limit(limit);
    return qb.getMany();
  }

  /**
   * ✅ Claim: PENDING -> READY
   */
  async claimPending(matchId: number): Promise<number> {
    const res = await this.analysisRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'READY' as any, error: null as any })
      .where('matchId = :matchId', { matchId })
      .andWhere('status = :s', { s: 'PENDING' })
      .execute();

    return res.affected ?? 0;
  }

  /**
   * ✅ FIX: bulk upsert pending sin repo.upsert()
   */
  async markManyAnalysisPending(
    matchIds: number[],
    version = 1,
  ): Promise<void> {
    if (!matchIds.length) return;

    const rows = matchIds.map((matchId) => ({
      matchId,
      status: 'PENDING',
      analysisVersion: version,
      inputHash: null,
      analysisJson: null,
      error: null,
      analyzedAt: null,
    }));

    const overwrite = [
      'status',
      'analysisVersion',
      'inputHash',
      'analysisJson',
      'error',
      'analyzedAt',
    ];

    await this.analysisRepo
      .createQueryBuilder()
      .insert()
      .into(FootyMatchAnalysisEntity)
      .values(rows as any)
      .orUpdate(overwrite as any, ['matchId'] as any)
      .updateEntity(false) // ✅ CLAVE
      .execute();
  }

  async getDbInfo(): Promise<any> {
    const rows = await this.detailsRepo.query(`
      SELECT
        DATABASE() AS db,
        @@hostname AS host,
        @@port AS port,
        @@version AS version
    `);
    return rows?.[0] ?? null;
  }

  // ============================================================
  // TEAM LASTX CACHE
  // ============================================================

  async getTeamLastX(teamId: number) {
    return this.lastxRepo.findOne({ where: { teamId } as any });
  }

  async upsertTeamLastX(
    teamId: number,
    payload: any,
    last: number | null = null,
  ) {
    const now = new Date();
    await this.lastxRepo.upsert(
      [{ teamId, last, payload, fetchedAt: now } as any],
      ['teamId'],
    );
  }

  async isTeamLastXFresh(teamId: number, ttlMs: number): Promise<boolean> {
    const row = await this.getTeamLastX(teamId);
    if (!row?.fetchedAt) return false;
    return Date.now() - new Date(row.fetchedAt).getTime() <= ttlMs;
  }

  // ============================================================
  // LEAGUE SEASON CACHE
  // ============================================================

  async getLeagueSeason(seasonId: number) {
    return this.leagueSeasonRepo.findOne({ where: { seasonId } as any });
  }

  async upsertLeagueSeason(seasonId: number, payload: any) {
    const now = new Date();
    await this.leagueSeasonRepo.upsert(
      [{ seasonId, payload, fetchedAt: now } as any],
      ['seasonId'],
    );
  }

  async isLeagueSeasonFresh(seasonId: number, ttlMs: number): Promise<boolean> {
    const row = await this.getLeagueSeason(seasonId);
    if (!row?.fetchedAt) return false;
    return Date.now() - new Date(row.fetchedAt).getTime() <= ttlMs;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { FootystatsService } from './footystats.service';
import { FootyStoreService } from './footy-store.service';
import { getBogotaDateKey } from './utils/footy-date.util';
import { normalizeTodayMatch } from './footystats.normalizer';

@Injectable()
export class FootySyncService {
  private readonly logger = new Logger(FootySyncService.name);

  constructor(
    private readonly footy: FootystatsService,
    private readonly store: FootyStoreService,
  ) {}

  /**
   * 00:00 todos los días (America/Bogota)
   */
  @Cron('0 0 * * *', { timeZone: 'America/Bogota' })
  async dailySnapshot(): Promise<void> {
    const dateKey = getBogotaDateKey();
    this.logger.log(`🗓️ Daily snapshot start -> ${dateKey}`);

    const raw = await this.footy.getTodayMatches();
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
    this.logger.log(`✅ Daily snapshot saved -> ${normalized.length} matches`);
  }
}

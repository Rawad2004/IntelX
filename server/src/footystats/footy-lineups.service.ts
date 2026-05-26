import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { FootyStoreService } from './footy-store.service';
import { FootystatsService } from './footystats.service';
import { getBogotaDateKey } from './utils/footy-date.util';

@Injectable()
export class FootyLineupsService {
  private readonly logger = new Logger(FootyLineupsService.name);

  // ventana para empezar a pedir alineaciones (2 horas antes)
  // Línea 14 - CAMBIAR
  // Más realista:
  private readonly windowBeforeKickoffSec = 2 * 60 * 60; // 15 minutos // 5 minutos antes

  // límite de matches por ciclo para controlar rate-limit
  private readonly maxPerTick = 15;

  constructor(
    private readonly store: FootyStoreService,
    private readonly footy: FootystatsService,
  ) {}

  /**
   * Cada 5 minutos:
   * - mira partidos del día
   * - filtra: kickoff cercano (<= 2h) + aún no tenemos lineups
   * - pide /match?match_id=...
   */
  @Cron('*/1 * * * *', { timeZone: 'America/Bogota' })
  async refreshLineupsNearKickoff(): Promise<void> {
    const dateKey = getBogotaDateKey();
    const nowUnix = Math.floor(Date.now() / 1000);

    const matchIds = await this.store.getDailyMatchIds(dateKey);
    if (!matchIds.length) return;

    // solo los que aún no tienen lineups guardados
    const missingLineups = await this.store.findDetailsMissingLineups(matchIds);
    if (!missingLineups.length) return;

    // Necesitamos kickoff para elegir solo cercanos.
    // Lo sacamos de la tabla daily (payload)
    const daily = await this.store.getDailyMatches({ dateKey, tab: 'all' });

    const eligible = daily
      .filter((m: any) => missingLineups.includes(Number(m.id)))
      .filter((m: any) => {
        const k = Number(m.kickoffUnix || 0);
        if (!k) return false;
        const diff = k - nowUnix;
        return diff <= this.windowBeforeKickoffSec && diff >= -30 * 60; // hasta 30 min después por si algo
      })
      .slice(0, this.maxPerTick);

    if (!eligible.length) return;

    this.logger.log(
      `🧩 Checking lineups (${eligible.length}) within 2h window...`,
    );

    for (const m of eligible) {
      const matchId = Number(m.id);
      try {
        // OJO: en tu service ahora tienes getMatchDetails(match_id)
        const details = await this.footy.getMatchDetails(matchId);

        const data = details?.data ?? details; // depende cómo venga el wrapper
        const lineups = data?.lineups;
        const hasLineups =
          !!lineups &&
          (Array.isArray(lineups?.team_a) || Array.isArray(lineups?.team_b)) &&
          ((lineups?.team_a?.length ?? 0) > 0 ||
            (lineups?.team_b?.length ?? 0) > 0);

        await this.store.upsertMatchDetails(matchId, data, hasLineups);

        if (hasLineups) {
          // ya tiene todo: lo ponemos como PENDING para análisis OpenAI
          await this.store.upsertAnalysis({
            matchId,
            status: 'PENDING',
            analysisVersion: 1,
            inputHash: null,
          });

          this.logger.log(
            `✅ Lineups ready -> match ${matchId} queued (PENDING)`,
          );
        }
      } catch (e: any) {
        this.logger.warn(
          `⚠️ match details failed (${matchId}): ${e?.message || e}`,
        );
      }
    }
  }
}

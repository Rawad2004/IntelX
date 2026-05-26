/**
 * Analysis Scheduler Service
 *
 * Cron job que pre-genera análisis comportamentales cuando:
 * - El partido está próximo (< 3 horas)
 * - Se confirman las alineaciones
 *
 * Ubicación: src/footystats/services/analysis-scheduler.service.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchAnalysisRepository } from '../repositories/match-analysis.repository';
import { BehavioralAnalysisService } from './behavioral-analysis.service';
import { MatchesService } from '../api/controllers/matches.service';

@Injectable()
export class AnalysisSchedulerService {
  private readonly logger = new Logger(AnalysisSchedulerService.name);
  private isProcessing = false;

  constructor(
    private readonly repository: MatchAnalysisRepository,
    private readonly behavioralService: BehavioralAnalysisService,
    private readonly matchesService: MatchesService,
  ) {}

  /**
   * Cada 15 minutos: Busca partidos próximos con lineups y genera análisis
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async processUpcomingMatches(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Previous processing still running, skipping...');
      return;
    }

    this.isProcessing = true;
    this.logger.log('🔄 Starting scheduled analysis processing...');

    try {
      // 1. Obtener partidos de hoy
      const todayMatches = await this.matchesService.getTodayMatches();

      if (!todayMatches || todayMatches.length === 0) {
        this.logger.log('No matches today');
        return;
      }

      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // 2. Filtrar partidos próximos (< 3 horas)
      const upcomingMatches = todayMatches.filter((match: any) => {
        const matchDate = match.date_unix
          ? new Date(match.date_unix * 1000)
          : null;

        if (!matchDate) return false;

        return matchDate > now && matchDate < twoHoursFromNow; // ✅ 2 horas
      });

      this.logger.log(
        `Found ${upcomingMatches.length} upcoming matches (next 3 hours)`,
      );

      // 3. Para cada partido, verificar si necesita análisis
      let generated = 0;
      let skipped = 0;

      for (const match of upcomingMatches) {
        try {
          // Verificar si ya tiene análisis
          const hasAnalysis = await this.behavioralService.hasReadyAnalysis(
            match.id,
          );

          if (hasAnalysis) {
            skipped++;
            continue;
          }

          // Verificar si tiene lineups (simplificado - el orchestrator lo verifica internamente)
          // En un sistema real, consultarías el endpoint de lineups primero

          this.logger.log(
            `Generating analysis for match ${match.id}: ${match.home_name} vs ${match.away_name}`,
          );

          const result = await this.behavioralService.generateAnalysis(
            match.id,
            false,
          );

          if (result.status === 'ready') {
            generated++;
            this.logger.log(`✅ Analysis generated for match ${match.id}`);
          } else if (result.status === 'pending') {
            this.logger.log(
              `⏳ Match ${match.id} still pending (${(result as any).reason?.code})`,
            );
          } else {
            this.logger.warn(`❌ Failed to generate for match ${match.id}`);
          }

          // Pequeña pausa entre análisis para no saturar la API de OpenAI
          await this.sleep(2000);
        } catch (error) {
          this.logger.error(
            `Error processing match ${match.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `📊 Processing complete: ${generated} generated, ${skipped} skipped`,
      );
    } catch (error) {
      this.logger.error(`Scheduler error: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Cada hora: Limpia análisis expirados
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredAnalyses(): Promise<void> {
    this.logger.log('🧹 Cleaning up expired analyses...');

    try {
      const cleaned = await this.repository.cleanupExpired();
      this.logger.log(`Cleaned up ${cleaned} expired analyses`);
    } catch (error) {
      this.logger.error(`Cleanup error: ${error.message}`);
    }
  }

  /**
   * Cada 6 horas: Log de estadísticas
   */
  @Cron('0 */6 * * *')
  async logStats(): Promise<void> {
    try {
      const stats = await this.repository.getStats();
      this.logger.log(`📈 Analysis stats: ${JSON.stringify(stats)}`);
    } catch (error) {
      this.logger.error(`Stats error: ${error.message}`);
    }
  }

  /**
   * Helper para pausas
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Método manual para procesar un partido específico
   */
  async processMatch(matchId: number): Promise<void> {
    this.logger.log(`Manual processing for match ${matchId}`);
    await this.behavioralService.generateAnalysis(matchId, true);
  }

  /**
   * Método para obtener status del scheduler
   */
  getStatus(): { isProcessing: boolean; lastRun?: Date } {
    return {
      isProcessing: this.isProcessing,
    };
  }
}

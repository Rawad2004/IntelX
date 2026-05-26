/**
 * Match Analysis Repository
 * 
 * Repositorio para operaciones de base de datos de análisis comportamentales.
 * 
 * Ubicación: src/footystats/repositories/match-analysis.repository.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { 
  MatchAnalysis, 
  AnalysisStatus, 
  BehavioralAnalysisData,
  CBWState,
} from '../entities/match-analysis.entity';

@Injectable()
export class MatchAnalysisRepository {
  private readonly logger = new Logger(MatchAnalysisRepository.name);

  constructor(
    @InjectRepository(MatchAnalysis)
    private readonly repo: Repository<MatchAnalysis>,
  ) {}

  /**
   * Busca análisis por matchId
   */
  async findByMatchId(matchId: number): Promise<MatchAnalysis | null> {
    return this.repo.findOne({ where: { matchId } });
  }

  /**
   * Busca análisis listos para múltiples partidos
   */
  async findReadyByMatchIds(matchIds: number[]): Promise<MatchAnalysis[]> {
    if (matchIds.length === 0) return [];
    
    return this.repo.find({
      where: {
        matchId: In(matchIds),
        status: 'ready',
      },
    });
  }

  /**
   * Crea o actualiza un análisis pendiente
   */
  async createPending(
    matchId: number,
    reason: MatchAnalysis['pendingReason'],
    matchInfo: {
      homeTeamName: string;
      awayTeamName: string;
      leagueId: number;
      leagueName: string;
      matchDate: Date;
    },
  ): Promise<MatchAnalysis> {
    const existing = await this.findByMatchId(matchId);
    
    if (existing) {
      // Solo actualizar si no está listo
      if (existing.status !== 'ready') {
        existing.status = 'pending';
        existing.pendingReason = reason;
        existing.homeTeamName = matchInfo.homeTeamName;
        existing.awayTeamName = matchInfo.awayTeamName;
        existing.leagueId = matchInfo.leagueId;
        existing.leagueName = matchInfo.leagueName;
        existing.matchDate = matchInfo.matchDate;
        return this.repo.save(existing);
      }
      return existing;
    }

    const analysis = this.repo.create({
      matchId,
      status: 'pending',
      pendingReason: reason,
      ...matchInfo,
    });

    return this.repo.save(analysis);
  }

  /**
   * Marca un análisis como "processing"
   */
  async markProcessing(matchId: number): Promise<void> {
    await this.repo.update(matchId, {
      status: 'processing',
      pendingReason: null,
    });
  }

  /**
   * Guarda un análisis completado
   */
  async saveCompleted(
    matchId: number,
    analysis: BehavioralAnalysisData,
    signals: Record<string, any>,
    meta: {
      hasLineups: boolean;
      hasReferee: boolean;
      dataQuality: 'high' | 'medium' | 'low';
      homeTeamName: string;
      awayTeamName: string;
      leagueId: number;
      leagueName: string;
      matchDate: Date;
    },
  ): Promise<MatchAnalysis> {
    const now = new Date();
    
    // Expiración: 24h después del partido o 48h desde ahora (lo que sea mayor)
    const matchExpiry = new Date(meta.matchDate.getTime() + 24 * 60 * 60 * 1000);
    const minExpiry = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const expiresAt = matchExpiry > minExpiry ? matchExpiry : minExpiry;

    const entity = await this.findByMatchId(matchId);
    
    if (entity) {
      entity.status = 'ready';
      entity.pendingReason = null;
      entity.errorMessage = null;
      entity.analysis = analysis;
      entity.signals = signals;
      entity.cbwState = analysis.cbw.state;
      entity.hasLineups = meta.hasLineups;
      entity.hasReferee = meta.hasReferee;
      entity.dataQuality = meta.dataQuality;
      entity.homeTeamName = meta.homeTeamName;
      entity.awayTeamName = meta.awayTeamName;
      entity.leagueId = meta.leagueId;
      entity.leagueName = meta.leagueName;
      entity.matchDate = meta.matchDate;
      entity.analyzedAt = now;
      entity.expiresAt = expiresAt;
      
      return this.repo.save(entity);
    }

    const newEntity = this.repo.create({
      matchId,
      status: 'ready',
      analysis,
      signals,
      cbwState: analysis.cbw.state,
      hasLineups: meta.hasLineups,
      hasReferee: meta.hasReferee,
      dataQuality: meta.dataQuality,
      homeTeamName: meta.homeTeamName,
      awayTeamName: meta.awayTeamName,
      leagueId: meta.leagueId,
      leagueName: meta.leagueName,
      matchDate: meta.matchDate,
      analyzedAt: now,
      expiresAt,
    });

    return this.repo.save(newEntity);
  }

  /**
   * Marca un análisis como error
   */
  async markError(matchId: number, errorMessage: string): Promise<void> {
    await this.repo.update(matchId, {
      status: 'error',
      errorMessage,
      pendingReason: null,
    });
  }

  /**
   * Busca partidos pendientes que necesitan análisis
   * (tienen lineups y están próximos)
   */
  async findPendingForProcessing(limit: number = 10): Promise<MatchAnalysis[]> {
    const now = new Date();
    const soon = new Date(now.getTime() + 3 * 60 * 60 * 1000); // Próximas 3 horas

    return this.repo.find({
      where: {
        status: 'pending',
        pendingReason: 'waiting_lineups',
        matchDate: LessThan(soon),
      },
      order: {
        matchDate: 'ASC',
      },
      take: limit,
    });
  }

  /**
   * Limpia análisis expirados
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    
    const result = await this.repo.update(
      {
        expiresAt: LessThan(now),
        status: 'ready',
      },
      {
        status: 'expired',
      },
    );

    return result.affected || 0;
  }

  /**
   * Obtiene estadísticas del repositorio
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<AnalysisStatus, number>;
    byCBW: Record<CBWState, number>;
  }> {
    const total = await this.repo.count();
    
    const statusCounts = await this.repo
      .createQueryBuilder('analysis')
      .select('analysis.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('analysis.status')
      .getRawMany();

    const cbwCounts = await this.repo
      .createQueryBuilder('analysis')
      .select('analysis.cbwState', 'cbwState')
      .addSelect('COUNT(*)', 'count')
      .where('analysis.cbwState IS NOT NULL')
      .groupBy('analysis.cbwState')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    statusCounts.forEach(row => {
      byStatus[row.status] = parseInt(row.count, 10);
    });

    const byCBW: Record<string, number> = {};
    cbwCounts.forEach(row => {
      byCBW[row.cbwState] = parseInt(row.count, 10);
    });

    return {
      total,
      byStatus: byStatus as Record<AnalysisStatus, number>,
      byCBW: byCBW as Record<CBWState, number>,
    };
  }
}
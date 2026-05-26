/**
 * Behavioral Analysis Service
 * 
 * Servicio que maneja la lógica de análisis comportamentales IntelX.
 * Coordina entre el repositorio, el orquestador y la IA.
 * 
 * Ubicación: src/footystats/services/behavioral-analysis.service.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { MatchAnalysisRepository } from '../repositories/match-analysis.repository';
import { AnalysisOrchestrator } from './analysis.orchestrator';
import { 
  BehavioralAnalysisResponseDTO,
  BehavioralDTOBuilder,
  BehavioralPendingDTO,
} from '../api/dto/behavioral-analysis.dto';
import { 
  MatchAnalysis, 
  BehavioralAnalysisData,
} from '../entities/match-analysis.entity';

@Injectable()
export class BehavioralAnalysisService {
  private readonly logger = new Logger(BehavioralAnalysisService.name);

  constructor(
    private readonly repository: MatchAnalysisRepository,
    private readonly orchestrator: AnalysisOrchestrator,
  ) {}

  /**
   * Obtiene el análisis comportamental para un partido
   */
  async getAnalysis(matchId: number): Promise<BehavioralAnalysisResponseDTO> {
    this.logger.log(`Getting behavioral analysis for match ${matchId}`);

    try {
      // 1. Buscar en DB
      const existing = await this.repository.findByMatchId(matchId);

      if (existing) {
        return this.buildResponseFromEntity(existing);
      }

      // 2. No existe - obtener datos básicos para crear pending
      const aggregatedData = await this.orchestrator.getAggregatedData(matchId);
      
      // 3. Determinar si podemos generar análisis o está pending
      const hasLineups = aggregatedData.meta.hasLineups;
      const hasReferee = aggregatedData.meta.hasReferee;
      const matchDate = aggregatedData.match?.date_unix 
        ? new Date(aggregatedData.match.date_unix * 1000)
        : null;

      // 4. Crear registro pending
      const pendingReason = this.determinePendingReason(hasLineups, matchDate);
      
      await this.repository.createPending(matchId, pendingReason, {
        homeTeamName: aggregatedData.match?.home_name || 'Unknown',
        awayTeamName: aggregatedData.match?.away_name || 'Unknown',
        leagueId: aggregatedData.match?.competition_id || 0,
        leagueName: aggregatedData.match?.competition?.name || 'Unknown',
        matchDate: matchDate || new Date(),
      });

      // 5. Retornar pending
      return BehavioralDTOBuilder.buildPending(
        matchId,
        pendingReason,
        matchDate,
        {
          teamStats: true,
          h2h: !!aggregatedData.h2h,
          leagueContext: !!aggregatedData.leagueStats,
          signals: true,
          lineups: hasLineups,
          referee: hasReferee,
        },
      );

    } catch (error) {
      this.logger.error(`Error getting analysis for match ${matchId}: ${error.message}`);
      return BehavioralDTOBuilder.buildError(matchId, 'FETCH_ERROR', error.message);
    }
  }

  /**
   * Genera el análisis para un partido (llamado por cron o manualmente)
   */
  async generateAnalysis(matchId: number, force: boolean = false): Promise<BehavioralAnalysisResponseDTO> {
    this.logger.log(`Generating behavioral analysis for match ${matchId} (force: ${force})`);

    try {
      // 1. Verificar si ya existe y está listo
      if (!force) {
        const existing = await this.repository.findByMatchId(matchId);
        if (existing?.status === 'ready') {
          this.logger.log(`Analysis already exists for match ${matchId}`);
          return this.buildResponseFromEntity(existing);
        }
      }

      // 2. Marcar como processing
      await this.repository.markProcessing(matchId);

      // 3. Obtener datos agregados primero (para tener hasReferee)
      const aggregatedData = await this.orchestrator.getAggregatedData(matchId);

      // 4. Ejecutar análisis completo
      const result = await this.orchestrator.analyze(matchId, true);

      if (!result.success || !result.data) {
        await this.repository.markError(matchId, result.error || 'Analysis failed');
        return BehavioralDTOBuilder.buildError(matchId, 'ANALYSIS_FAILED', result.error || 'Unknown error');
      }

      // 5. Transformar resultado de IA a BehavioralAnalysisData
      const behavioralData = this.transformToBehavioralData(result.data);

      // 6. Guardar en DB
      const matchDate = result.data.match?.date 
        ? new Date(result.data.match.date)
        : new Date();

      const saved = await this.repository.saveCompleted(
        matchId,
        behavioralData,
        result.data.signals,
        {
          hasLineups: result.data.meta.hasLineups,
          hasReferee: aggregatedData.meta.hasReferee,  // ← Viene del aggregatedData
          dataQuality: result.data.meta.dataQuality as 'high' | 'medium' | 'low',
          homeTeamName: result.data.match?.home?.name || 'Unknown',
          awayTeamName: result.data.match?.away?.name || 'Unknown',
          leagueId: result.data.match?.league?.id || 0,
          leagueName: result.data.match?.league?.name || 'Unknown',
          matchDate,
        },
      );

      this.logger.log(`Analysis saved for match ${matchId}`);
      return this.buildResponseFromEntity(saved);

    } catch (error) {
      this.logger.error(`Error generating analysis for match ${matchId}: ${error.message}`);
      await this.repository.markError(matchId, error.message);
      return BehavioralDTOBuilder.buildError(matchId, 'GENERATION_ERROR', error.message);
    }
  }

  /**
   * Obtiene análisis para múltiples partidos (para listas)
   */
  async getBatchAnalyses(matchIds: number[]): Promise<Record<number, { status: string; cbw?: string }>> {
    const results: Record<number, { status: string; cbw?: string }> = {};
    
    const existing = await this.repository.findReadyByMatchIds(matchIds);
    
    existing.forEach(analysis => {
      results[analysis.matchId] = {
        status: analysis.status,
        cbw: analysis.cbwState || undefined,
      };
    });

    matchIds.forEach(id => {
      if (!results[id]) {
        results[id] = { status: 'pending' };
      }
    });

    return results;
  }

  /**
   * Verifica si un partido tiene análisis listo
   */
  async hasReadyAnalysis(matchId: number): Promise<boolean> {
    const analysis = await this.repository.findByMatchId(matchId);
    return analysis?.status === 'ready';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  private buildResponseFromEntity(entity: MatchAnalysis): BehavioralAnalysisResponseDTO {
    switch (entity.status) {
      case 'ready':
        if (!entity.analysis) {
          return BehavioralDTOBuilder.buildError(entity.matchId, 'NO_DATA', 'Analysis data missing');
        }
        return BehavioralDTOBuilder.buildReady(
          entity.matchId,
          entity.analysis,
          {
            analyzedAt: entity.analyzedAt?.toISOString() || new Date().toISOString(),
            hasLineups: entity.hasLineups,
            hasReferee: entity.hasReferee,
            dataQuality: entity.dataQuality || 'medium',
            dataQualityLabel: this.getDataQualityLabel(entity.dataQuality),
            expiresAt: entity.expiresAt?.toISOString() || '',
          },
        );

      case 'pending':
      case 'processing':
        return BehavioralDTOBuilder.buildPending(
          entity.matchId,
          entity.pendingReason || 'waiting_lineups',
          entity.matchDate,
          {
            teamStats: true,
            h2h: true,
            leagueContext: true,
            signals: true,
            lineups: entity.hasLineups,
            referee: entity.hasReferee,
          },
        );

      case 'error':
        return BehavioralDTOBuilder.buildError(
          entity.matchId,
          'PREVIOUS_ERROR',
          entity.errorMessage || 'Previous analysis attempt failed',
        );

      case 'expired':
        return BehavioralDTOBuilder.buildError(
          entity.matchId,
          'EXPIRED',
          'Analysis has expired',
        );

      default:
        return BehavioralDTOBuilder.buildError(
          entity.matchId,
          'UNKNOWN_STATUS',
          `Unknown status: ${entity.status}`,
        );
    }
  }

  private determinePendingReason(
    hasLineups: boolean,
    matchDate: Date | null,
  ): BehavioralPendingDTO['reason']['code'] {
    if (!matchDate) {
      return 'insufficient_data';
    }

    const now = new Date();
    const hoursUntilMatch = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilMatch > 24) {
      return 'match_too_far';
    }

    if (!hasLineups) {
      return 'waiting_lineups';
    }

    return 'waiting_scheduled';
  }

  private transformToBehavioralData(analysisResult: any): BehavioralAnalysisData {
    const aiAnalysis = analysisResult.analysis || {};
    const signals = analysisResult.signals || {};
    const cbw = analysisResult.cbw || { state: 'medium', confidence: 50, reasons: [] };

    const dominantSignals = Object.entries(signals)
      .filter(([_, signal]: [string, any]) => signal?.band !== 'MEDIUM')
      .map(([id, signal]: [string, any]) => ({
        id,
        name: signal.name || id,
        band: signal.band || 'MEDIUM',
        explanation: signal.explanation || signal.factors?.join('. ') || '',
      }))
      .slice(0, 5);

    const envelope = aiAnalysis.narrative || 
                     aiAnalysis.summary?.verdict ||
                     this.generateFallbackEnvelope(signals, cbw);

    const structuralFactors = {
      pressure: aiAnalysis.keyFactors?.positive?.[0] || 'No determinado',
      resolution: aiAnalysis.keyFactors?.neutral?.[0] || 'No determinado',
      leagueContext: `Liga con promedio de ${analysisResult.match?.league?.avgGoals?.toFixed(1) || '?'} goles`,
    };

    const contradictions: string[] = [];
    if (aiAnalysis.keyFactors?.negative?.length > 0) {
      contradictions.push(...aiAnalysis.keyFactors.negative);
    }

    const riskFlags = aiAnalysis.disclaimers || [];
    if (cbw.state === 'wide') {
      riskFlags.unshift('CBW WIDE: Alta incertidumbre en el análisis');
    }

    const governanceNote = cbw.state === 'narrow'
      ? 'CBW NARROW indica alta alineación de señales. El análisis estructural es confiable, pero IntelX no predice resultados. Este es un mapa comportamental, no una predicción.'
      : cbw.state === 'wide'
      ? 'CBW WIDE indica múltiples factores en conflicto. El análisis tiene incertidumbre significativa. Considere los datos con cautela.'
      : 'CBW MEDIUM indica confianza moderada. Algunos factores son claros, otros presentan ambigüedad.';

    return {
      envelope,
      cbw: {
        state: cbw.state,
        confidence: cbw.confidence,
        reasons: cbw.reasons || [],
      },
      dominantSignals,
      structuralFactors,
      contradictions,
      riskFlags,
      governanceNote,
      model: {
        name: aiAnalysis.model || 'gpt-4',
        version: '2.0.0',
        tokensUsed: aiAnalysis.tokens || 0,
      },
    };
  }

  private generateFallbackEnvelope(signals: any, cbw: any): string {
    const signalDescriptions: string[] = [];
    
    Object.entries(signals).forEach(([id, signal]: [string, any]) => {
      if (signal?.band === 'HIGH') {
        signalDescriptions.push(`${signal.name || id} elevado`);
      } else if (signal?.band === 'LOW') {
        signalDescriptions.push(`${signal.name || id} bajo`);
      }
    });

    if (signalDescriptions.length === 0) {
      return 'Análisis basado en señales comportamentales. No se detectaron patrones dominantes claros.';
    }

    return `Este enfrentamiento presenta: ${signalDescriptions.join(', ')}. CBW ${cbw.state} indica ${
      cbw.state === 'narrow' ? 'alta confianza' : 
      cbw.state === 'wide' ? 'baja confianza' : 'confianza moderada'
    } en el análisis estructural.`;
  }

  private getDataQualityLabel(quality: string | null): string {
    switch (quality) {
      case 'high': return 'Excelente';
      case 'medium': return 'Buena';
      case 'low': return 'Limitada';
      default: return 'Desconocida';
    }
  }
}
/**
 * Analysis Service
 * 
 * SERVICIO PRINCIPAL que orquesta todo el flujo de análisis IntelX.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MatchDataService, RawMatchData } from './match-data.service';
import { NormalizerService } from '../normalization';
import { SignalCalculatorService } from '../signals';
import { CBWGovernanceService } from '../governance';
import { FootyAiService } from '../ai/footy-ai.service';
import { SignalTransformer, MatchTransformer } from '../api/transformers';
import type {
  NormalizedMatchDetails,
  SignalInput,
  BehavioralSignalStack,
  CBWResult,
  FormValidation,
} from '@shared/types';
import type {
  MatchAnalysisDTO,
  AnalysisPreviewDTO,
  SignalDTO,
  CBWDTO,
  FormValidationDTO,
  StructuralMatchupDTO,
  LeagueContextDTO,
  RiskFlagDTO,
  MatchListItemDTO,
} from '../api/dto';

/**
 * Resultado interno del análisis (antes de transformar a DTO)
 */
interface AnalysisResult {
  matchDetails: NormalizedMatchDetails;
  signalInput: SignalInput;
  signals: BehavioralSignalStack;
  cbw: CBWResult;
  formValidation: FormValidation;
  behavioralEnvelope: string;
  aiAnalysis?: any;
  dataCompleteness: number;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly matchDataService: MatchDataService,
    private readonly normalizerService: NormalizerService,
    private readonly signalCalculatorService: SignalCalculatorService,
    private readonly cbwGovernanceService: CBWGovernanceService,
    private readonly footyAiService: FootyAiService,
    private readonly signalTransformer: SignalTransformer,
    private readonly matchTransformer: MatchTransformer,
  ) {}

  // ===========================================================================
  // ANÁLISIS COMPLETO
  // ===========================================================================

  /**
   * Ejecuta análisis completo de un partido
   */
  async analyzeMatch(matchId: number, forceRefresh = false): Promise<MatchAnalysisDTO> {
    this.logger.log(`Starting full analysis for match ${matchId}`);
    const startTime = Date.now();

    try {
      // 1. Obtener datos crudos
      const rawData = await this.matchDataService.getMatchData(matchId);

      // 2. Ejecutar análisis interno
      const result = await this.executeAnalysis(rawData);

      // 3. Transformar a DTO
      const dto = this.buildAnalysisDTO(matchId, result);

      const elapsed = Date.now() - startTime;
      this.logger.log(`Analysis complete for match ${matchId} in ${elapsed}ms`);

      return dto;

    } catch (error) {
      this.logger.error(`Analysis failed for match ${matchId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene solo preview del análisis (para listas)
   */
  async getPreview(matchId: number): Promise<AnalysisPreviewDTO> {
    this.logger.log(`Getting preview for match ${matchId}`);

    try {
      const rawData = await this.matchDataService.getMatchData(matchId);
      const result = await this.executeAnalysis(rawData);

      return this.buildPreviewDTO(matchId, result);

    } catch (error) {
      this.logger.error(`Preview failed for match ${matchId}: ${error.message}`);
      
      return {
        matchId,
        cbw: 'medium',
        cbwColor: 'yellow',
        headline: 'Análisis no disponible',
        riskFlagsCount: 0,
      };
    }
  }

  /**
   * Obtiene previews para múltiples partidos
   */
  async getBatchPreviews(matchIds: number[]): Promise<{
    analyses: Record<number, AnalysisPreviewDTO>;
    errors: Record<number, string>;
  }> {
    this.logger.log(`Getting batch previews for ${matchIds.length} matches`);

    const analyses: Record<number, AnalysisPreviewDTO> = {};
    const errors: Record<number, string> = {};

    const batchSize = 5;
    for (let i = 0; i < matchIds.length; i += batchSize) {
      const batch = matchIds.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(id => this.getPreview(id))
      );

      results.forEach((result, index) => {
        const matchId = batch[index];
        if (result.status === 'fulfilled') {
          analyses[matchId] = result.value;
        } else {
          errors[matchId] = result.reason?.message || 'Unknown error';
        }
      });
    }

    return { analyses, errors };
  }

  /**
   * Obtiene solo señales de un partido
   */
  async getSignals(matchId: number): Promise<SignalDTO[]> {
    const rawData = await this.matchDataService.getMatchData(matchId);
    const result = await this.executeAnalysis(rawData);
    
    return this.signalTransformer.toDTOs(result.signals.signals);
  }

  /**
   * Obtiene solo CBW de un partido
   */
  async getCBW(matchId: number): Promise<CBWDTO> {
    const rawData = await this.matchDataService.getMatchData(matchId);
    const result = await this.executeAnalysis(rawData);
    
    return this.buildCBWDTO(result.cbw);
  }

  // ===========================================================================
  // LISTAS DE PARTIDOS
  // ===========================================================================

  /**
   * Obtiene partidos de hoy con previews
   */
  async getTodayMatchesWithPreviews(timezone?: string): Promise<MatchListItemDTO[]> {
    const { matches } = await this.matchDataService.getTodayMatches(timezone);
    
    const normalized = this.normalizerService.normalizeMatches(matches);
    
    const matchIds = normalized.map(m => m.id);
    const { analyses } = await this.getBatchPreviews(matchIds);
    
    return normalized.map(match => {
      const preview = analyses[match.id];
      return this.matchTransformer.toListItem(
        match,
        preview?.cbw || 'medium',
        preview?.headline,
      );
    });
  }

  // ===========================================================================
  // ANÁLISIS INTERNO
  // ===========================================================================

  /**
   * Ejecuta el análisis interno (sin transformar a DTO)
   */
  private async executeAnalysis(rawData: RawMatchData): Promise<AnalysisResult> {
    // 1. Normalizar datos
    const { matchDetails, signalInput, formValidation } = 
      await this.normalizerService.prepareForAnalysis(
        rawData.match,
        rawData.homeTeam,
        rawData.awayTeam,
        rawData.homeLastX,
        rawData.awayLastX,
        rawData.league,
        rawData.referee,
      );

    // 2. Calcular señales determinísticamente
    const signals = await this.signalCalculatorService.calculateAll(signalInput);

    // 3. Determinar CBW basado en señales y forma
    const cbw = this.cbwGovernanceService.determine(signals, formValidation);

    // 4. Generar análisis con AI usando FootyAiService.analyzeMatch()
    let behavioralEnvelope = '';
    let aiAnalysis: any = null;
    
    try {
      // Construir input para el AI service existente
      const aiInput = this.buildAiInput(matchDetails, signals, cbw, formValidation);
      
      // Usar el método correcto: analyzeMatch
      const aiResult = await this.footyAiService.analyzeMatch(aiInput);
      aiAnalysis = aiResult.analysis;
      
      // Extraer el canonical summary como behavioral envelope
      behavioralEnvelope = aiAnalysis?.sections?.canonicalSummary || 
                           aiAnalysis?.ui?.headline ||
                           this.generateFallbackNarrative(signals, cbw);
                           
    } catch (error) {
      this.logger.warn(`AI narrative generation failed: ${error.message}`);
      behavioralEnvelope = this.generateFallbackNarrative(signals, cbw);
    }

    return {
      matchDetails,
      signalInput,
      signals,
      cbw,
      formValidation,
      behavioralEnvelope,
      aiAnalysis,
      dataCompleteness: rawData.dataCompleteness,
    };
  }

  /**
   * Construye el input para FootyAiService.analyzeMatch()
   */
  private buildAiInput(
    matchDetails: NormalizedMatchDetails,
    signals: BehavioralSignalStack,
    cbw: CBWResult,
    formValidation: FormValidation,
  ): any {
    return {
      meta: {
        matchId: matchDetails.id,
        generatedAt: new Date().toISOString(),
      },
      match: {
        id: matchDetails.id,
        homeTeam: matchDetails.homeTeam,
        awayTeam: matchDetails.awayTeam,
        league: matchDetails.league,
        // Usar date en lugar de dateTime si no existe
        date: (matchDetails as any).date || (matchDetails as any).dateTime || new Date().toISOString(),
      },
      signals: signals.signals.map(s => ({
        signal: s.id,
        reading: s.explanation,
        strength: s.band.toLowerCase() as 'low' | 'medium' | 'high',
      })),
      cbw: {
        state: cbw.state,
        confidence: cbw.confidence,
        reasons: cbw.reasons,
      },
      form: {
        home: formValidation.home,
        away: formValidation.away,
        hasContradiction: formValidation.hasContradiction,
      },
      teamStats: {
        home: matchDetails.homeTeamFull,
        away: matchDetails.awayTeamFull,
      },
    };
  }

  // ===========================================================================
  // TRANSFORMACIÓN A DTOs
  // ===========================================================================

  /**
   * Construye el DTO de análisis completo
   */
  private buildAnalysisDTO(matchId: number, result: AnalysisResult): MatchAnalysisDTO {
    const { signals, cbw, formValidation, matchDetails, behavioralEnvelope, aiAnalysis, dataCompleteness } = result;

    // Usar datos del AI si están disponibles
    const aiSections = aiAnalysis?.sections || {};

    return {
      matchId,
      
      cbw: this.buildCBWDTO(cbw),
      
      behavioralEnvelope: aiSections.canonicalSummary || behavioralEnvelope,
      
      signals: this.signalTransformer.toDTOs(signals.signals),
      
      signalSummary: this.signalTransformer.toSummary(signals),
      
      formValidation: this.buildFormValidationDTO(formValidation),
      
      structuralMatchup: this.buildStructuralMatchupDTO(matchDetails),
      
      leagueContext: this.buildLeagueContextDTO(matchDetails),
      
      riskFlags: this.buildRiskFlags(signals, cbw, formValidation, dataCompleteness, aiSections.riskFlags),
      
      meta: {
        generatedAt: new Date().toISOString(),
        dataCompleteness,
        dataCompletenessLabel: this.getCompletenessLabel(dataCompleteness),
        modelVersion: '2.0.0',
        cacheHit: false,
      },
    };
  }

  /**
   * Construye preview simplificado
   */
  private buildPreviewDTO(matchId: number, result: AnalysisResult): AnalysisPreviewDTO {
    const { signals, cbw, aiAnalysis } = result;
    
    // Usar headline del AI si existe
    const headline = aiAnalysis?.ui?.headline || this.generateHeadline(signals, cbw);
    
    const topSignal = signals.signals
      .filter(s => s.band !== 'MEDIUM')
      .sort((a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50))[0];

    return {
      matchId,
      cbw: cbw.state,
      cbwColor: this.getCBWColor(cbw.state),
      headline,
      topSignal: topSignal ? {
        id: topSignal.id,
        name: topSignal.name,
        band: topSignal.band,
      } : undefined,
      riskFlagsCount: this.countRiskFlags(signals, cbw, result.formValidation, result.dataCompleteness),
    };
  }

  /**
   * Construye DTO de CBW
   */
  private buildCBWDTO(cbw: CBWResult): CBWDTO {
    return {
      state: cbw.state,
      label: this.getCBWLabel(cbw.state),
      color: this.getCBWColor(cbw.state),
      confidence: cbw.confidence,
      reasons: cbw.reasons,
    };
  }

  /**
   * Construye DTO de validación de forma
   */
  private buildFormValidationDTO(fv: FormValidation): FormValidationDTO {
    return {
      home: {
        form: fv.home.last5,
        trend: fv.home.trend,
        trendLabel: this.getTrendLabel(fv.home.trend),
        trendIcon: this.getTrendIcon(fv.home.trend),
        trendColor: this.getTrendColor(fv.home.trend),
      },
      away: {
        form: fv.away.last5,
        trend: fv.away.trend,
        trendLabel: this.getTrendLabel(fv.away.trend),
        trendIcon: this.getTrendIcon(fv.away.trend),
        trendColor: this.getTrendColor(fv.away.trend),
      },
      hasContradiction: fv.hasContradiction,
      contradictionWarning: fv.contradictionReason,
    };
  }

  /**
   * Construye DTO de matchup estructural
   */
  private buildStructuralMatchupDTO(match: NormalizedMatchDetails): StructuralMatchupDTO {
    const home = match.homeTeamFull;
    const away = match.awayTeamFull;
    
    const xgDiff = (home.xgFor - home.xgAgainst) - (away.xgFor - away.xgAgainst);
    const possessionDiff = home.possessionAvg - away.possessionAvg;

    return {
      xgDifferential: xgDiff,
      xgAdvantage: xgDiff > 0.3 ? 'home' : xgDiff < -0.3 ? 'away' : 'balanced',
      xgAdvantageLabel: xgDiff > 0.3 ? 'Local' : xgDiff < -0.3 ? 'Visitante' : 'Equilibrado',
      
      possessionBias: possessionDiff > 5 ? 'home' : possessionDiff < -5 ? 'away' : 'balanced',
      possessionLabel: possessionDiff > 5 ? 'Local domina' : possessionDiff < -5 ? 'Visitante domina' : 'Equilibrado',
      
      pressureDirection: this.calculatePressureDirection(home, away),
      pressureLabel: this.calculatePressureLabel(home, away),
      
      structuralEdge: this.calculateStructuralEdge(home, away),
      structuralEdgeLabel: this.calculateStructuralEdgeLabel(home, away),
    };
  }

  /**
   * Construye DTO de contexto de liga
   */
  private buildLeagueContextDTO(match: NormalizedMatchDetails): LeagueContextDTO {
    const league = match.league;
    const home = match.homeTeamFull;
    const away = match.awayTeamFull;
    
    const expectedGoals = (home.goalsPerGame + away.concededPerGame + 
                          away.goalsPerGame + home.concededPerGame) / 2;

    return {
      leagueId: league.id,
      leagueName: league.name,
      avgGoals: league.avgGoalsPerGame,
      avgCorners: league.avgCornersPerGame,
      avgCards: league.avgCardsPerGame,
      bttsPct: league.bttsPercentage,
      over25Pct: league.over25Percentage,
      homeWinPct: league.homeWinPercentage,
      awayWinPct: league.awayWinPercentage,
      drawPct: league.drawPercentage,
      homeAdvantage: league.homeWinPercentage - league.awayWinPercentage,
      vsLeague: {
        goalsExpected: expectedGoals > league.avgGoalsPerGame + 0.3 ? 'above' :
                       expectedGoals < league.avgGoalsPerGame - 0.3 ? 'below' : 'average',
        cornersExpected: 'average',
      },
    };
  }

  /**
   * Construye banderas de riesgo
   */
  private buildRiskFlags(
    signals: BehavioralSignalStack,
    cbw: CBWResult,
    formValidation: FormValidation,
    dataCompleteness: number,
    aiRiskFlags?: string[],
  ): RiskFlagDTO[] {
    const flags: RiskFlagDTO[] = [];

    // Agregar flags del AI si existen
    if (aiRiskFlags && aiRiskFlags.length > 0) {
      aiRiskFlags.forEach(flag => {
        flags.push({
          type: 'info',
          icon: 'alert-circle',
          title: flag,
          description: flag,
        });
      });
    }

    if (cbw.state === 'wide') {
      flags.push({
        type: 'warning',
        icon: 'alert-triangle',
        title: 'Alta Incertidumbre',
        description: 'El análisis presenta factores conflictivos que amplían el rango de resultados posibles.',
      });
    }

    const mvi = signals.signals.find(s => s.id === 'MVI');
    if (mvi?.band === 'HIGH') {
      flags.push({
        type: 'warning',
        icon: 'zap',
        title: 'Alta Volatilidad',
        description: 'Partido con historial de resultados impredecibles.',
      });
    }

    if (formValidation.hasContradiction) {
      flags.push({
        type: 'info',
        icon: 'git-branch',
        title: 'Tendencias Contradictorias',
        description: formValidation.contradictionReason || 'La forma reciente contradice la tendencia general.',
      });
    }

    if (dataCompleteness < 0.7) {
      flags.push({
        type: 'info',
        icon: 'database',
        title: 'Datos Limitados',
        description: 'El análisis se basa en datos incompletos.',
      });
    }

    if (cbw.confidence < 0.5) {
      flags.push({
        type: 'warning',
        icon: 'help-circle',
        title: 'Confianza Reducida',
        description: 'La calidad de datos disponibles limita la confianza del análisis.',
      });
    }

    return flags;
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private getCBWLabel(state: CBWResult['state']): string {
    switch (state) {
      case 'narrow': return 'Alta Confianza';
      case 'medium': return 'Confianza Moderada';
      case 'wide': return 'Baja Confianza';
    }
  }

  private getCBWColor(state: CBWResult['state']): 'green' | 'yellow' | 'red' {
    switch (state) {
      case 'narrow': return 'green';
      case 'medium': return 'yellow';
      case 'wide': return 'red';
    }
  }

  private getTrendLabel(trend: string): string {
    switch (trend) {
      case 'improving': return 'Mejorando';
      case 'stable': return 'Estable';
      case 'declining': return 'Declinando';
      default: return 'Estable';
    }
  }

  private getTrendIcon(trend: string): string {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'stable': return 'minus';
      case 'declining': return 'trending-down';
      default: return 'minus';
    }
  }

  private getTrendColor(trend: string): string {
    switch (trend) {
      case 'improving': return 'green';
      case 'stable': return 'yellow';
      case 'declining': return 'red';
      default: return 'yellow';
    }
  }

  private getCompletenessLabel(completeness: number): string {
    if (completeness >= 0.9) return 'Excelente';
    if (completeness >= 0.7) return 'Buena';
    if (completeness >= 0.5) return 'Moderada';
    return 'Limitada';
  }

  private calculatePressureDirection(home: any, away: any): 'home' | 'balanced' | 'away' {
    const homePressure = (home.dangerousAttacksAvg || 0) + (home.shotsPerGame || 0);
    const awayPressure = (away.dangerousAttacksAvg || 0) + (away.shotsPerGame || 0);
    const diff = homePressure - awayPressure;
    
    if (diff > 5) return 'home';
    if (diff < -5) return 'away';
    return 'balanced';
  }

  private calculatePressureLabel(home: any, away: any): string {
    const direction = this.calculatePressureDirection(home, away);
    switch (direction) {
      case 'home': return 'Presión local dominante';
      case 'away': return 'Presión visitante dominante';
      default: return 'Presión equilibrada';
    }
  }

  private calculateStructuralEdge(home: any, away: any): 'home' | 'balanced' | 'away' {
    let homeScore = 0;
    
    if ((home.xgDifference || 0) > (away.xgDifference || 0) + 0.2) homeScore++;
    else if ((away.xgDifference || 0) > (home.xgDifference || 0) + 0.2) homeScore--;
    
    if ((home.seasonPPG || 0) > (away.seasonPPG || 0) + 0.3) homeScore++;
    else if ((away.seasonPPG || 0) > (home.seasonPPG || 0) + 0.3) homeScore--;
    
    if ((home.cleanSheetPercentage || 0) > (away.cleanSheetPercentage || 0) + 10) homeScore++;
    else if ((away.cleanSheetPercentage || 0) > (home.cleanSheetPercentage || 0) + 10) homeScore--;

    if (homeScore >= 2) return 'home';
    if (homeScore <= -2) return 'away';
    return 'balanced';
  }

  private calculateStructuralEdgeLabel(home: any, away: any): string {
    const edge = this.calculateStructuralEdge(home, away);
    switch (edge) {
      case 'home': return 'Ventaja estructural local';
      case 'away': return 'Ventaja estructural visitante';
      default: return 'Sin ventaja estructural clara';
    }
  }

  private generateHeadline(signals: BehavioralSignalStack, cbw: CBWResult): string {
    if (cbw.state === 'wide') {
      return 'Alta incertidumbre - Múltiples factores en conflicto';
    }

    const mvi = signals.signals.find(s => s.id === 'MVI');
    if (mvi?.band === 'HIGH') {
      return 'Volatilidad elevada - Partido impredecible';
    }

    const tpi = signals.signals.find(s => s.id === 'TPI');
    if (tpi?.band === 'HIGH') {
      return 'Alta amenaza ofensiva - Esperamos actividad';
    }

    const gss = signals.signals.find(s => s.id === 'GSS');
    if (gss?.band === 'HIGH') {
      return 'Alta estabilidad - Ventajas tienden a sostenerse';
    }

    if (cbw.state === 'narrow') {
      return 'Señales alineadas - Análisis con alta confianza';
    }

    return 'Análisis disponible';
  }

  private countRiskFlags(
    signals: BehavioralSignalStack,
    cbw: CBWResult,
    formValidation: FormValidation,
    dataCompleteness: number,
  ): number {
    let count = 0;
    if (cbw.state === 'wide') count++;
    if (signals.signals.find(s => s.id === 'MVI')?.band === 'HIGH') count++;
    if (formValidation.hasContradiction) count++;
    if (dataCompleteness < 0.7) count++;
    if (cbw.confidence < 0.5) count++;
    return count;
  }

  private generateFallbackNarrative(signals: BehavioralSignalStack, cbw: CBWResult): string {
    const signalCount = signals.signals.length;
    const highSignals = signals.signals.filter(s => s.band === 'HIGH').length;
    const lowSignals = signals.signals.filter(s => s.band === 'LOW').length;

    return `Análisis basado en ${signalCount} señales comportamentales. ` +
           `${highSignals} señales en rango alto, ${lowSignals} en rango bajo. ` +
           `CBW: ${this.getCBWLabel(cbw.state)} (${(cbw.confidence * 100).toFixed(0)}% confianza).`;
  }
}

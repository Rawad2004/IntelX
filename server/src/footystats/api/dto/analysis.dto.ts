/**
 * Analysis DTOs
 * 
 * DTOs para endpoints de análisis IntelX.
 * Estos representan el output del engine IntelX para el frontend.
 */

import type { CBWDTO } from './common.dto';

/**
 * Análisis completo de IntelX para un partido
 */
export interface MatchAnalysisDTO {
  matchId: number;
  
  // CBW - La métrica suprema
  cbw: CBWDTO;
  
  // Resumen narrativo generado por AI
  behavioralEnvelope: string;
  
  // Señales comportamentales
  signals: SignalDTO[];
  
  // Resumen de señales por categoría
  signalSummary: SignalSummaryDTO;
  
  // Validación de forma
  formValidation: FormValidationDTO;
  
  // Matchup estructural
  structuralMatchup: StructuralMatchupDTO;
  
  // Contexto de liga
  leagueContext: LeagueContextDTO;
  
  // Banderas de riesgo
  riskFlags: RiskFlagDTO[];
  
  // Metadata
  meta: AnalysisMetaDTO;
}

/**
 * Señal individual para frontend
 * NOTA: El valor interno (0-100) NO se expone, solo la banda
 */
export interface SignalDTO {
  id: string;
  name: string;
  shortName: string;
  
  // Banda visual (LOW/MEDIUM/HIGH)
  band: 'LOW' | 'MEDIUM' | 'HIGH';
  bandColor: 'red' | 'yellow' | 'green';
  bandLabel: string;  // "Bajo" | "Medio" | "Alto"
  
  // Valores por equipo (si aplica)
  homeValue?: number;
  awayValue?: number;
  comparison?: 'home' | 'balanced' | 'away';
  
  // Explicación
  explanation: string;
  
  // Categoría para agrupación
  category: 'persistence' | 'resolution' | 'environment' | 'volatility' | 'timing';
  categoryLabel: string;
  
  // Confianza (para mostrar indicador)
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Resumen de señales agrupadas
 */
export interface SignalSummaryDTO {
  // Persistencia
  persistence: {
    tpi: SignalBandDTO;
  };
  
  // Resolución
  resolution: {
    lrf: SignalBandDTO;
    drf: SignalBandDTO;
    wrf: SignalBandDTO;
  };
  
  // Ambiente
  environment: {
    ses: SignalBandDTO;
    gss: SignalBandDTO;
  };
  
  // Volatilidad
  volatility: {
    mvi: SignalBandDTO;
  };
  
  // Estadísticas generales
  overall: {
    totalSignals: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    avgConfidence: number;
  };
}

/**
 * Banda de señal simplificada
 */
export interface SignalBandDTO {
  band: 'LOW' | 'MEDIUM' | 'HIGH';
  color: 'red' | 'yellow' | 'green';
}

/**
 * Validación de forma
 */
export interface FormValidationDTO {
  home: {
    form: string;
    trend: 'improving' | 'stable' | 'declining';
    trendLabel: string;
    trendIcon: string;
    trendColor: string;
  };
  away: {
    form: string;
    trend: 'improving' | 'stable' | 'declining';
    trendLabel: string;
    trendIcon: string;
    trendColor: string;
  };
  hasContradiction: boolean;
  contradictionWarning?: string;
}

/**
 * Matchup estructural
 */
export interface StructuralMatchupDTO {
  // xG differential
  xgDifferential: number;
  xgAdvantage: 'home' | 'balanced' | 'away';
  xgAdvantageLabel: string;
  
  // Posesión
  possessionBias: 'home' | 'balanced' | 'away';
  possessionLabel: string;
  
  // Dirección de presión
  pressureDirection: 'home' | 'balanced' | 'away';
  pressureLabel: string;
  
  // Driver dominante (si hay uno claro)
  dominantDriver?: string;
  
  // Visual: quién tiene ventaja estructural
  structuralEdge: 'home' | 'balanced' | 'away';
  structuralEdgeLabel: string;
}

/**
 * Contexto de liga
 */
export interface LeagueContextDTO {
  leagueId: number;
  leagueName: string;
  
  // Promedios de liga
  avgGoals: number;
  avgCorners: number;
  avgCards: number;
  
  // Porcentajes
  bttsPct: number;
  over25Pct: number;
  
  // Ventaja local
  homeWinPct: number;
  awayWinPct: number;
  drawPct: number;
  homeAdvantage: number;  // Diferencia home - away
  
  // Comparación con partido
  vsLeague: {
    goalsExpected: 'above' | 'average' | 'below';
    cornersExpected: 'above' | 'average' | 'below';
  };
}

/**
 * Bandera de riesgo
 */
export interface RiskFlagDTO {
  type: 'warning' | 'info' | 'critical';
  icon: string;
  title: string;
  description: string;
}

/**
 * Metadata del análisis
 */
export interface AnalysisMetaDTO {
  generatedAt: string;
  dataCompleteness: number;
  dataCompletenessLabel: string;
  modelVersion: string;
  cacheHit: boolean;
}

/**
 * Request para análisis
 */
export interface AnalysisRequestDTO {
  matchId: number;
  forceRefresh?: boolean;
}

/**
 * Response con análisis simplificado (para lista)
 */
export interface AnalysisPreviewDTO {
  matchId: number;
  cbw: 'narrow' | 'medium' | 'wide';
  cbwColor: 'green' | 'yellow' | 'red';
  headline: string;
  topSignal?: {
    id: string;
    name: string;
    band: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  riskFlagsCount: number;
}

/**
 * Batch de análisis para múltiples partidos
 */
export interface BatchAnalysisRequestDTO {
  matchIds: number[];
}

export interface BatchAnalysisResponseDTO {
  analyses: Record<number, AnalysisPreviewDTO>;
  errors: Record<number, string>;
}
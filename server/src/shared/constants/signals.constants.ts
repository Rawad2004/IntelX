/**
 * Signal System Constants
 * 
 * Defines the behavioral signals, their hierarchy, and thresholds.
 * Based on IntelX Canonical Spec v1.0
 */

import { SignalId } from '../types';

// =============================================================================
// SIGNAL DEFINITIONS
// =============================================================================

export interface SignalDefinition {
  id: SignalId;
  name: string;
  shortName: string;
  description: string;
  category: 'persistence' | 'resolution' | 'environment' | 'volatility' | 'timing';
  priority: number; // Lower = higher priority (1-5)
}

/**
 * All signals with their metadata
 * 
 * Priority Order (from Canonical Spec):
 * 1. Persistence (TPI)
 * 2. Resolution (LRF, DRF, WRF)
 * 3. Shot Quality (xG/λ) - captured in TPI
 * 4. Transition (TPM) - captured in MVI
 * 5. Governance (CBW) - calculated separately
 */
export const SIGNAL_DEFINITIONS: Record<SignalId, SignalDefinition> = {
  // Persistence Layer
  TPI: {
    id: 'TPI',
    name: 'Threat Persistence Index',
    shortName: 'Threat',
    description: 'Mide la capacidad de mantener presión ofensiva sostenida',
    category: 'persistence',
    priority: 1,
  },
  
  // Resolution Layer
  LRF: {
    id: 'LRF',
    name: 'Line Resolution Factor',
    shortName: 'Line',
    description: 'Mide cómo la línea defensiva alta/baja resuelve situaciones',
    category: 'resolution',
    priority: 2,
  },
  DRF: {
    id: 'DRF',
    name: 'Discipline Resolution Factor',
    shortName: 'Discipline',
    description: 'Mide el impacto de tarjetas y faltas en el flujo del partido',
    category: 'resolution',
    priority: 2,
  },
  WRF: {
    id: 'WRF',
    name: 'Width Resolution Factor',
    shortName: 'Width',
    description: 'Mide la presión por las bandas y corners',
    category: 'resolution',
    priority: 2,
  },
  
  // Environment Layer
  SES: {
    id: 'SES',
    name: 'Scoring Environment Signal',
    shortName: 'Scoring',
    description: 'Evalúa el contexto de goles esperado',
    category: 'environment',
    priority: 3,
  },
  CFS: {
    id: 'CFS',
    name: 'Conversion Fragility Signal',
    shortName: 'Conversion',
    description: 'Mide la fragilidad defensiva y tendencia a conceder',
    category: 'environment',
    priority: 3,
  },
  GSS: {
    id: 'GSS',
    name: 'Game State Stability',
    shortName: 'Stability',
    description: 'Mide qué tan estable tiende a ser el estado del partido',
    category: 'environment',
    priority: 3,
  },
  
  // Volatility Layer
  MVI: {
    id: 'MVI',
    name: 'Match Volatility Index',
    shortName: 'Volatility',
    description: 'Mide la variabilidad esperada en eventos del partido',
    category: 'volatility',
    priority: 4,
  },
  DVS: {
    id: 'DVS',
    name: 'Discipline Volatility Signal',
    shortName: 'Card Volatility',
    description: 'Mide la volatilidad en disciplina y tarjetas',
    category: 'volatility',
    priority: 4,
  },
  PAS: {
    id: 'PAS',
    name: 'Pressure Accumulation Signal',
    shortName: 'Pressure',
    description: 'Mide la acumulación de presión ofensiva',
    category: 'volatility',
    priority: 4,
  },
  PCS: {
    id: 'PCS',
    name: 'Physical Control Signal',
    shortName: 'Physical',
    description: 'Mide el control físico del partido',
    category: 'volatility',
    priority: 4,
  },
  WDS: {
    id: 'WDS',
    name: 'Width Dependence Signal',
    shortName: 'Width Dep.',
    description: 'Mide la dependencia del juego por bandas',
    category: 'volatility',
    priority: 4,
  },
  TIS: {
    id: 'TIS',
    name: 'Territorial Illusion Signal',
    shortName: 'Territory',
    description: 'Detecta cuando posesión no se traduce en amenaza real',
    category: 'volatility',
    priority: 4,
  },
  
  // Timing Layer
  EDS: {
    id: 'EDS',
    name: 'Early Disruption Signal',
    shortName: 'Early',
    description: 'Mide tendencia a disrupción temprana (primeros 30 min)',
    category: 'timing',
    priority: 5,
  },
  LGE: {
    id: 'LGE',
    name: 'Late Game Elasticity',
    shortName: 'Late',
    description: 'Mide elasticidad en tramos finales (últimos 15 min)',
    category: 'timing',
    priority: 5,
  },
};

// =============================================================================
// BAND THRESHOLDS
// =============================================================================

/**
 * Thresholds for converting raw values to bands
 * 
 * These can be adjusted per signal if needed, but default is:
 * LOW: 0-34
 * MEDIUM: 35-64
 * HIGH: 65-100
 */
export const DEFAULT_BAND_THRESHOLDS = {
  LOW_MAX: 34,
  MEDIUM_MAX: 64,
  // HIGH: 65+
};

/**
 * Custom thresholds for specific signals (if different from default)
 */
export const SIGNAL_BAND_THRESHOLDS: Partial<Record<SignalId, { lowMax: number; medMax: number }>> = {
  // DRF has stricter thresholds (discipline is impactful)
  DRF: { lowMax: 30, medMax: 60 },
  
  // MVI is more sensitive (volatility matters more)
  MVI: { lowMax: 30, medMax: 55 },
};

// =============================================================================
// CORE SIGNALS (Always calculated)
// =============================================================================

/**
 * Core signals that are ALWAYS calculated
 * These are the minimum required for CBW determination
 */
export const CORE_SIGNAL_IDS: SignalId[] = [
  'TPI',  // Persistence
  'LRF',  // Resolution - Line
  'DRF',  // Resolution - Discipline
  'WRF',  // Resolution - Width
  'MVI',  // Volatility
  'SES',  // Environment
  'GSS',  // Stability
];

/**
 * Extended signals (calculated when data is available)
 */
export const EXTENDED_SIGNAL_IDS: SignalId[] = [
  'CFS',
  'PAS',
  'DVS',
  'PCS',
  'WDS',
  'TIS',
  'EDS',
  'LGE',
];

// =============================================================================
// SIGNAL CONFLICT RULES
// =============================================================================

/**
 * Signal combinations that indicate conflict (→ WIDEN CBW)
 */
export const SIGNAL_CONFLICTS: Array<{
  signals: [SignalId, SignalId];
  condition: 'both_high' | 'opposite';
  description: string;
}> = [
  {
    signals: ['TPI', 'SES'],
    condition: 'opposite', // High TPI + Low SES = conflict
    description: 'Alta persistencia de amenaza pero bajo entorno de goles',
  },
  {
    signals: ['GSS', 'MVI'],
    condition: 'both_high', // Both high = contradiction
    description: 'Estabilidad alta contradice volatilidad alta',
  },
  {
    signals: ['PAS', 'GSS'],
    condition: 'opposite', // High pressure + High stability = unlikely
    description: 'Alta presión acumulada contradice estabilidad',
  },
  {
    signals: ['TIS', 'TPI'],
    condition: 'both_high', // Territorial illusion means TPI might be misleading
    description: 'Ilusión territorial sugiere que amenaza percibida es irreal',
  },
];

// =============================================================================
// DATA REQUIREMENTS
// =============================================================================

/**
 * Minimum data required for each signal
 * If data is missing, signal confidence is reduced
 */
export const SIGNAL_DATA_REQUIREMENTS: Record<SignalId, string[]> = {
  TPI: ['xg_for_avg', 'shots_avg', 'dangerous_attacks_avg'],
  LRF: ['offsides_avg', 'offsides_against_avg'],
  DRF: ['cards_avg', 'fouls_avg', 'referee_cards'],
  WRF: ['corners_for', 'corners_against'],
  MVI: ['goals_variance', 'xg_variance'],
  GSS: ['clean_sheets', 'first_goal_scored'],
  SES: ['goals_per_game', 'over25_percentage'],
  CFS: ['btts_percentage', 'conceded_per_game'],
  PAS: ['shots_on_target', 'possession'],
  DVS: ['cards_timing', 'fouls_per_half'],
  PCS: ['fouls_avg', 'possession_avg'],
  WDS: ['corners_per_half', 'width_attacks'],
  TIS: ['possession_avg', 'xg_against_with_possession'],
  EDS: ['goals_0_15', 'first_goal_time'],
  LGE: ['goals_76_90', 'late_goal_percentage'],
};

// =============================================================================
// FORM CONSTANTS
// =============================================================================

/**
 * Form window requirements per Canonical Spec
 */
export const FORM_WINDOWS = {
  PRIMARY: 5,    // Last 5 is primary window
  SECONDARY: 6,  // Last 6 for additional context
  EXTENDED: 10,  // Last 10 for trend analysis
  
  // Minimum games required for valid form
  MIN_GAMES: 3,
};

/**
 * Points per result for form calculations
 */
export const FORM_POINTS = {
  WIN: 3,
  DRAW: 1,
  LOSS: 0,
};
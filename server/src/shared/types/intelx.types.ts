/**
 * IntelX Domain Types
 * 
 * Estos tipos representan cómo IntelX maneja los datos internamente.
 * Son el resultado de normalizar los datos de FootyStats y agregarles
 * contexto del dominio IntelX.
 * 
 * IMPORTANTE: Estos tipos NUNCA contienen odds ni datos prohibidos.
 */

// =============================================================================
// CORE ENUMS
// =============================================================================

/**
 * Estado del partido
 */
export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'suspended' | 'canceled';

/**
 * Confidence Band Width - La métrica suprema de IntelX
 * 
 * - narrow: Alta confianza en el análisis estructural
 * - medium: Confianza moderada, algunos factores conflictivos
 * - wide: Baja confianza, múltiples contradicciones o datos insuficientes
 */
export type CBWState = 'narrow' | 'medium' | 'wide';

/**
 * Banda de señal para visualización
 */
export type SignalBand = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Resultado de forma (W/D/L)
 */
export type FormResult = 'W' | 'D' | 'L';

/**
 * Tendencia de forma
 */
export type FormTrend = 'improving' | 'stable' | 'declining';

// =============================================================================
// NORMALIZED TEAM
// =============================================================================

export interface NormalizedTeam {
  id: number;
  name: string;
  cleanName: string;
  image: string;
  country: string;
  
  // Position
  tablePosition?: number;
  
  // Season record
  seasonMatchesPlayed: number;
  seasonWins: number;
  seasonDraws: number;
  seasonLosses: number;
  
  // Goals
  seasonGoals: number;
  seasonConceded: number;
  seasonGoalDifference: number;
  
  // Points
  seasonPoints: number;
  seasonPPG: number;
  
  // xG (critical for TPI)
  xgFor: number;
  xgAgainst: number;
  xgDifference: number;
  
  // Form
  formRun: string;
  formRunHome: string;
  formRunAway: string;
  
  // Percentages
  bttsPercentage: number;
  over25Percentage: number;
  cleanSheetPercentage: number;
  
  // Averages
  goalsPerGame: number;
  concededPerGame: number;
  cornersFor: number;
  cornersAgainst: number;
  cardsPerGame: number;
  foulsPerGame: number;
  shotsPerGame: number;
  shotsOnTargetPerGame: number;
  offsidesPerGame: number;
  offsidesAgainstPerGame: number;
  possessionAvg: number;
  dangerousAttacksAvg: number;
  
  // Goal timings (for EDS, LGE)
  goalsByPeriod: GoalsByPeriod;
  concededByPeriod: GoalsByPeriod;
  
  // First goal
  firstGoalScoredCount: number;
  firstGoalScoredPercentage: number;
  
  // Clean sheets
  cleanSheets: number;
}

export interface GoalsByPeriod {
  min_0_15: number;
  min_16_30: number;
  min_31_45: number;
  min_46_60: number;
  min_61_75: number;
  min_76_90: number;
}

// =============================================================================
// NORMALIZED LAST X
// =============================================================================

export interface NormalizedLastX {
  last5: LastXWindow;
  last6?: LastXWindow;
  last10?: LastXWindow;
}

export interface LastXWindow {
  games: number;
  form: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  ppg: number;
  xgFor: number;
  xgAgainst: number;
  bttsPercentage: number;
  over25Percentage: number;
  cornersAvg: number;
  cardsAvg: number;
  shotsAvg: number;
  foulsAvg: number;
  possessionAvg: number;
  cleanSheets: number;
}

// =============================================================================
// NORMALIZED MATCH
// =============================================================================

export interface NormalizedMatch {
  id: number;
  status: MatchStatus;
  dateUnix: number;
  dateISO: string;
  
  // League
  leagueId: number;
  leagueName: string;
  leagueImage: string;
  season: string;
  
  // Teams (basic info for list view)
  homeTeam: NormalizedTeamBasic;
  awayTeam: NormalizedTeamBasic;
  
  // Score (if finished/live)
  homeGoals?: number;
  awayGoals?: number;
  htHomeGoals?: number;
  htAwayGoals?: number;
  
  // Stadium
  stadiumName?: string;
  
  // Referee ID (details fetched separately)
  refereeId?: number;
  
  // Risk indicator (internal use only)
  risk?: number;
}

export interface NormalizedTeamBasic {
  id: number;
  name: string;
  cleanName: string;
  image: string;
  tablePosition?: number;
  formRun?: string;
}

// =============================================================================
// NORMALIZED MATCH DETAILS
// =============================================================================

export interface NormalizedMatchDetails extends NormalizedMatch {
  // Full team data
  homeTeamFull: NormalizedTeam;
  awayTeamFull: NormalizedTeam;
  
  // Last X data (MANDATORY per spec)
  homeLastX: NormalizedLastX;
  awayLastX: NormalizedLastX;
  
  // Match stats (if live/finished)
  stats?: MatchStats;
  
  // Lineups
  lineups?: {
    home: LineupPlayer[];
    away: LineupPlayer[];
  };
  
  // Bench
  bench?: {
    home: BenchPlayer[];
    away: BenchPlayer[];
  };
  
  // H2H
  h2h?: NormalizedH2H;
  
  // Referee
  referee?: NormalizedReferee;
  
  // League context
  league: NormalizedLeague;
}

export interface MatchStats {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  offsides: { home: number; away: number };
  xg: { home: number; away: number };
}

export interface LineupPlayer {
  playerId: number;
  shirtNumber: number;
  events: PlayerEvent[];
}

export interface PlayerEvent {
  type: 'goal' | 'yellow' | 'red' | 'ownGoal' | 'penaltyMissed';
  time: number;
}

export interface BenchPlayer {
  playerInId: number;
  playerOutId: number;
  shirtNumber: number;
  time: number;
}

// =============================================================================
// NORMALIZED H2H
// =============================================================================

export interface NormalizedH2H {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  homeWinPercentage: number;
  awayWinPercentage: number;
  drawPercentage: number;
  avgGoals: number;
  bttsPercentage: number;
  over25Percentage: number;
  recentMatches: H2HMatch[];
}

export interface H2HMatch {
  id: number;
  date: number;
  homeGoals: number;
  awayGoals: number;
}

// =============================================================================
// NORMALIZED LEAGUE
// =============================================================================

export interface NormalizedLeague {
  id: number;
  name: string;
  image: string;
  country: string;
  season: string;
  
  // Averages
  avgGoalsPerGame: number;
  avgCornersPerGame: number;
  avgCardsPerGame: number;
  
  // Percentages
  bttsPercentage: number;
  over25Percentage: number;
  
  // Home advantage
  homeWinPercentage: number;
  awayWinPercentage: number;
  drawPercentage: number;
}

// =============================================================================
// NORMALIZED REFEREE
// =============================================================================

export interface NormalizedReferee {
  id: number;
  name: string;
  age: number;
  nationality: string;
  
  // Stats
  matchesOfficiated: number;
  goalsPerMatch: number;
  
  // Cards (CRITICAL for DRF)
  yellowCardsTotal: number;
  redCardsTotal: number;
  cardsPerMatch: number;
  
  // Penalties
  penaltiesGiven: number;
  penaltiesPerMatch: number;
  
  // BTTS (useful context)
  bttsPercentage: number;
}

// =============================================================================
// SIGNAL TYPES
// =============================================================================

/**
 * Input para los calculadores de señales
 */
export interface SignalInput {
  homeTeam: NormalizedTeam;
  awayTeam: NormalizedTeam;
  homeLastX: NormalizedLastX;
  awayLastX: NormalizedLastX;
  league: NormalizedLeague;
  referee?: NormalizedReferee;
  h2h?: NormalizedH2H;
}

/**
 * Data point usado en el cálculo de una señal
 */
export interface DataPoint {
  metric: string;
  value: number;
  source: 'team' | 'lastx' | 'league' | 'referee' | 'h2h';
  weight: number;
}

/**
 * Output de un calculador de señal
 */
export interface SignalOutput {
  id: SignalId;
  name: string;
  value: number;           // 0-100 internal score (NOT exposed to frontend)
  band: SignalBand;        // LOW | MEDIUM | HIGH (exposed to frontend)
  confidence: number;      // 0-1 confidence in this calculation
  explanation: string;     // Human-readable explanation
  dataPoints: DataPoint[]; // Evidence used for calculation
  homeValue?: number;      // Home team specific value
  awayValue?: number;      // Away team specific value
}

/**
 * IDs de todas las señales del sistema
 */
export type SignalId =
  | 'TPI'   // Threat Persistence Index
  | 'LRF'   // Line Resolution Factor
  | 'DRF'   // Discipline Resolution Factor
  | 'WRF'   // Width Resolution Factor
  | 'MVI'   // Match Volatility Index
  | 'GSS'   // Game State Stability
  | 'SES'   // Scoring Environment Signal
  | 'CFS'   // Conversion Fragility Signal
  | 'PAS'   // Pressure Accumulation Signal
  | 'DVS'   // Discipline Volatility Signal
  | 'PCS'   // Physical Control Signal
  | 'WDS'   // Width Dependence Signal
  | 'TIS'   // Territorial Illusion Signal
  | 'EDS'   // Early Disruption Signal
  | 'LGE';  // Late Game Elasticity

/**
 * Stack completo de señales calculadas
 */
export interface BehavioralSignalStack {
  signals: SignalOutput[];
  calculatedAt: string;
  dataCompleteness: number; // 0-1 how much data was available
}

// =============================================================================
// CBW GOVERNANCE
// =============================================================================

/**
 * Resultado del cálculo de CBW
 */
export interface CBWResult {
  state: CBWState;
  reasons: string[];
  confidence: number;
  widenFactors: number;
}

/**
 * Validación de forma
 */
export interface FormValidation {
  home: {
    last5: string;
    last10?: string;
    trend: FormTrend;
  };
  away: {
    last5: string;
    last10?: string;
    trend: FormTrend;
  };
  hasContradiction: boolean;
  contradictionReason?: string;
}

// =============================================================================
// INTELX ANALYSIS (AI OUTPUT)
// =============================================================================

/**
 * Análisis completo de IntelX para un partido
 */
export interface IntelXAnalysis {
  matchId: number;
  
  // CBW (supreme authority)
  cbw: CBWResult;
  
  // AI-generated behavioral envelope
  behavioralEnvelope: string;
  
  // Calculated signals
  signals: BehavioralSignalStack;
  
  // Form validation
  formValidation: FormValidation;
  
  // Risk flags
  riskFlags: string[];
  
  // Structural matchup summary
  structuralMatchup: {
    xgDifferential: number;
    possessionBias: 'home' | 'balanced' | 'away';
    pressureDirection: 'home' | 'balanced' | 'away';
    dominantDriver?: string;
  };
  
  // League context
  leagueContext: {
    avgGoals: number;
    avgCorners: number;
    avgCards: number;
    homeAdvantage: number;
  };
  
  // Metadata
  generatedAt: string;
  modelVersion: string;
  dataCompleteness: number;
}

// =============================================================================
// API RESPONSE TYPES (for frontend)
// =============================================================================

/**
 * Match item for list views
 */
export interface MatchListItemDTO {
  id: number;
  status: MatchStatus;
  dateTime: number;
  league: {
    id: number;
    name: string;
    image: string;
  };
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    image: string;
    position?: number;
    form: FormIndicator[];
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    image: string;
    position?: number;
    form: FormIndicator[];
  };
  score?: {
    home: number;
    away: number;
  };
  preview: {
    cbw: CBWState;
    dominantDriver?: string;
  };
}

export interface FormIndicator {
  result: FormResult;
  color: 'green' | 'yellow' | 'red';
}

/**
 * Signal for frontend display
 */
export interface SignalDTO {
  id: SignalId;
  name: string;
  band: SignalBand;
  explanation: string;
  homeValue?: number;
  awayValue?: number;
  // NOTE: Internal 'value' is NOT exposed
}

/**
 * Full analysis for frontend
 */
export interface IntelXAnalysisDTO {
  matchId: number;
  cbw: {
    state: CBWState;
    reasons: string[];
  };
  behavioralEnvelope: string;
  signals: SignalDTO[];
  riskFlags: string[];
  formValidation: {
    home: { form: string; trend: FormTrend };
    away: { form: string; trend: FormTrend };
    contradiction: boolean;
  };
  structuralMatchup: {
    xgDifferential: number;
    possessionBias: string;
    pressureDirection: string;
  };
  leagueContext: {
    avgGoals: number;
    avgCorners: number;
    avgCards: number;
    homeAdvantage: number;
  };
  timestamp: string;
}
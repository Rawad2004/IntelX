/**
 * Match DTOs
 * 
 * DTOs para endpoints de partidos.
 * Estos son los objetos que el frontend recibe.
 */

import type { 
  LeagueBasicDTO, 
  TeamBasicDTO, 
  FormIndicatorDTO,
  CBWDTO,
} from './common.dto';

/**
 * Match para vista de lista (Today's matches, League matches)
 */
export interface MatchListItemDTO {
  id: number;
  status: 'upcoming' | 'live' | 'finished' | 'suspended' | 'canceled';
  dateTime: number;       // Unix timestamp
  dateFormatted: string;  // "17 Ene 2026"
  timeFormatted: string;  // "19:30"
  
  league: LeagueBasicDTO;
  
  homeTeam: TeamBasicDTO & {
    form: FormIndicatorDTO[];
  };
  
  awayTeam: TeamBasicDTO & {
    form: FormIndicatorDTO[];
  };
  
  score?: {
    home: number;
    away: number;
    htHome?: number;
    htAway?: number;
  };
  
  // Preview de IntelX (para mostrar en la lista)
  preview: {
    cbw: 'narrow' | 'medium' | 'wide';
    cbwColor: 'green' | 'yellow' | 'red';
    headline?: string;  // "Alta volatilidad esperada"
  };
}

/**
 * Match con detalles completos
 */
export interface MatchDetailDTO extends MatchListItemDTO {
  stadium?: string;
  
  referee?: RefereeDTO;
  
  // Stats del partido (si está terminado)
  stats?: MatchStatsDTO;
  
  // Lineups
  lineups?: {
    home: LineupPlayerDTO[];
    away: LineupPlayerDTO[];
  };
  
  // Suplentes
  bench?: {
    home: BenchPlayerDTO[];
    away: BenchPlayerDTO[];
  };
  
  // H2H
  h2h?: H2HDTO;
  
  // Estadísticas de equipo extendidas
  teamStats: {
    home: TeamStatsDTO;
    away: TeamStatsDTO;
  };
  
  // Last X data
  lastX: {
    home: LastXDTO;
    away: LastXDTO;
  };
}

/**
 * Estadísticas del partido
 */
export interface MatchStatsDTO {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  offsides: { home: number; away: number };
  xg?: { home: number; away: number };
}

/**
 * Árbitro
 */
export interface RefereeDTO {
  id: number;
  name: string;
  cardsPerMatch: number;
  penaltiesPerMatch: number;
}

/**
 * Jugador en lineup
 */
export interface LineupPlayerDTO {
  playerId: number;
  shirtNumber: number;
  // Nota: nombre y foto no vienen de FootyStats
  events: PlayerEventDTO[];
}

/**
 * Evento de jugador
 */
export interface PlayerEventDTO {
  type: 'goal' | 'yellow' | 'red' | 'ownGoal' | 'penaltyMissed';
  time: number;
  icon: string;  // 'goal' | 'yellow-card' | 'red-card'
}

/**
 * Suplente
 */
export interface BenchPlayerDTO {
  playerInId: number;
  playerOutId: number;
  shirtNumber: number;
  time: number;
}

/**
 * Head to Head
 */
export interface H2HDTO {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  avgGoals: number;
  bttsPercentage: number;
  recentMatches: H2HMatchDTO[];
}

/**
 * Partido H2H individual
 */
export interface H2HMatchDTO {
  id: number;
  date: string;  // Formatted date
  homeGoals: number;
  awayGoals: number;
  result: 'home' | 'away' | 'draw';
}

/**
 * Estadísticas de equipo
 */
export interface TeamStatsDTO {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  ppg: number;
  
  // xG
  xgFor: number;
  xgAgainst: number;
  xgDifference: number;
  
  // Percentages
  cleanSheetPct: number;
  bttsPct: number;
  over25Pct: number;
  
  // Averages
  cornersFor: number;
  cornersAgainst: number;
  cardsPerGame: number;
}

/**
 * Last X (5/6/10) data
 */
export interface LastXDTO {
  form: string;           // "WWDLW"
  formIndicators: FormIndicatorDTO[];
  trend: 'improving' | 'stable' | 'declining';
  trendIcon: 'arrow-up' | 'minus' | 'arrow-down';
  trendColor: 'green' | 'yellow' | 'red';
  
  stats: {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    ppg: number;
    xgFor: number;
    xgAgainst: number;
    btts: number;
    over25: number;
  };
}

/**
 * Query params para lista de partidos
 */
export interface MatchListQuery {
  date?: string;         // "2026-01-17"
  leagueId?: number;
  status?: 'upcoming' | 'live' | 'finished' | 'all';
  timezone?: string;     // "America/Bogota"
}
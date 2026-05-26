/**
 * Match Analysis Entity
 * 
 * Entidad TypeORM para persistir análisis comportamentales de IntelX.
 * 
 * Ubicación: src/footystats/entities/match-analysis.entity.ts
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AnalysisStatus = 'pending' | 'processing' | 'ready' | 'error' | 'expired';

export type PendingReason = 
  | 'waiting_lineups'
  | 'waiting_scheduled'
  | 'insufficient_data'
  | 'match_too_far';

export type CBWState = 'narrow' | 'medium' | 'wide';

export interface BehavioralAnalysisData {
  envelope: string;
  cbw: {
    state: CBWState;
    confidence: number;
    reasons: string[];
  };
  dominantSignals: Array<{
    id: string;
    name: string;
    band: 'LOW' | 'MEDIUM' | 'HIGH';
    explanation: string;
  }>;
  structuralFactors: {
    pressure: string;
    resolution: string;
    leagueContext: string;
  };
  contradictions: string[];
  riskFlags: string[];
  governanceNote: string;
  model: {
    name: string;
    version: string;
    tokensUsed: number;
  };
}

@Entity('match_analyses')
@Index(['status', 'matchDate'])
@Index(['leagueId', 'status'])
export class MatchAnalysis {
  @PrimaryColumn({ name: 'match_id', type: 'int' })
  matchId: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'processing', 'ready', 'error', 'expired'],
    default: 'pending',
  })
  status: AnalysisStatus;

  @Column({ name: 'pending_reason', type: 'varchar', length: 50, nullable: true })
  pendingReason: PendingReason | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'analysis', type: 'json', nullable: true })
  analysis: BehavioralAnalysisData | null;

  @Column({ name: 'signals', type: 'json', nullable: true })
  signals: Record<string, any> | null;

  @Column({ name: 'cbw_state', type: 'varchar', length: 10, nullable: true })
  cbwState: CBWState | null;

  @Column({ name: 'has_lineups', type: 'tinyint', width: 1, default: 0 })
  hasLineups: boolean;

  @Column({ name: 'has_referee', type: 'tinyint', width: 1, default: 0 })
  hasReferee: boolean;

  @Column({ name: 'data_quality', type: 'varchar', length: 10, nullable: true })
  dataQuality: 'high' | 'medium' | 'low' | null;

  @Column({ name: 'home_team_name', type: 'varchar', length: 100, nullable: true })
  homeTeamName: string | null;

  @Column({ name: 'away_team_name', type: 'varchar', length: 100, nullable: true })
  awayTeamName: string | null;

  @Column({ name: 'league_id', type: 'int', nullable: true })
  leagueId: number | null;

  @Column({ name: 'league_name', type: 'varchar', length: 100, nullable: true })
  leagueName: string | null;

  @Column({ name: 'match_date', type: 'datetime', nullable: true })
  matchDate: Date | null;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'analyzed_at', type: 'datetime', nullable: true })
  analyzedAt: Date | null;
}

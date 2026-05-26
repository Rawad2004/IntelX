/**
 * Today's Match DTO
 * 
 * DTO específico para el endpoint de "Match of the Day" en el landing.
 * Mapea la estructura del BehavioralAnalysis al formato del frontend.
 * 
 * Ubicación: src/footystats/api/dto/todays-match.dto.ts
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// ENUMS & TYPES
// ============================================

export type StabilityGate = 'GREEN' | 'AMBER' | 'RED';
export type CBWLevel = 'Narrow' | 'Medium' | 'Wide';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type DomainType = 'Goals' | 'Corners' | 'Cards';

// ============================================
// SUB-DTOs
// ============================================

export class TeamDTO {
  @ApiProperty({ example: 'Arsenal' })
  name: string;

  @ApiProperty({ example: 'ARS' })
  short: string;

  @ApiPropertyOptional({ example: 'https://example.com/arsenal.png' })
  logo?: string;

  @ApiProperty({ example: '#EF0107' })
  color: string;

  @ApiProperty({ example: ['High Press', 'Wing Play'] })
  tags: string[];
}

export class BehaviorSnapshotDTO {
  @ApiProperty({ enum: ['Low', 'Medium', 'High'] })
  pressureProfile: RiskLevel;

  @ApiProperty({ example: 'Open Play + Wing Crosses' })
  resolutionStyle: string;

  @ApiProperty({ enum: ['Low', 'Medium', 'High'] })
  breakRisk: RiskLevel;

  @ApiProperty({ enum: ['Narrow', 'Medium', 'Wide'] })
  cbwLevel: CBWLevel;

  @ApiProperty({ enum: ['GREEN', 'AMBER', 'RED'] })
  stabilityGate: StabilityGate;
}

export class DomainProfileDTO {
  @ApiProperty({ enum: ['Goals', 'Corners', 'Cards'] })
  domain: DomainType;

  @ApiProperty({ enum: ['GREEN', 'AMBER', 'RED'] })
  status: StabilityGate;

  @ApiProperty()
  summary: string;

  @ApiProperty({ example: ['High territorial pressure', 'Strong xG creation'] })
  drivers: string[];

  @ApiProperty({ example: ['Sensitive to early goal', 'Rotation possible'] })
  uncertaintyFactors: string[];

  @ApiProperty({ enum: ['Low', 'Medium', 'High'] })
  leagueBaseline: RiskLevel;

  @ApiProperty({ enum: ['Low', 'Medium', 'High'] })
  matchRegime: RiskLevel;
}

export class MatchPhaseDTO {
  @ApiProperty({ example: "0'–25'" })
  range: string;

  @ApiProperty({ example: 'Establishment' })
  label: string;

  @ApiProperty({ example: 'Pressure patterns establish, territorial control contested' })
  description: string;
}

// ============================================
// MAIN RESPONSE DTO
// ============================================

export class TodaysMatchResponseDTO {
  @ApiProperty({ example: '12345' })
  id: string;

  @ApiProperty({ example: 'Premier League' })
  league: string;

  @ApiProperty({ example: '20:00' })
  time: string;

  @ApiProperty({ type: TeamDTO })
  home: TeamDTO;

  @ApiProperty({ type: TeamDTO })
  away: TeamDTO;

  @ApiProperty({ type: BehaviorSnapshotDTO })
  behaviorSnapshot: BehaviorSnapshotDTO;

  @ApiProperty({ type: [DomainProfileDTO] })
  domains: DomainProfileDTO[];

  @ApiProperty({ type: [MatchPhaseDTO] })
  phases: MatchPhaseDTO[];

  @ApiProperty({ description: 'AI-generated analysis paragraph' })
  aiAnalysis: string;

  @ApiProperty({ description: 'Quick 60-second read summary' })
  quickRead: string;

  @ApiProperty({ example: 'Strong recent data available for both teams' })
  dataConfidence: string;
}

// ============================================
// BUILDER CLASS
// ============================================

export class TodaysMatchDTOBuilder {
  private dto: TodaysMatchResponseDTO;

  constructor() {
    this.dto = {
      id: '',
      league: '',
      time: '',
      home: { name: '', short: '', color: '#333', tags: [] },
      away: { name: '', short: '', color: '#333', tags: [] },
      behaviorSnapshot: {
        pressureProfile: 'Medium',
        resolutionStyle: 'Analysis pending',
        breakRisk: 'Medium',
        cbwLevel: 'Medium',
        stabilityGate: 'AMBER',
      },
      domains: [],
      phases: this.getDefaultPhases(),
      aiAnalysis: '',
      quickRead: '',
      dataConfidence: 'Limited data available',
    };
  }

  setMatchInfo(id: string, league: string, time: string): this {
    this.dto.id = id;
    this.dto.league = league;
    this.dto.time = time;
    return this;
  }

  setHomeTeam(team: TeamDTO): this {
    this.dto.home = team;
    return this;
  }

  setAwayTeam(team: TeamDTO): this {
    this.dto.away = team;
    return this;
  }

  setBehaviorSnapshot(snapshot: BehaviorSnapshotDTO): this {
    this.dto.behaviorSnapshot = snapshot;
    return this;
  }

  addDomain(domain: DomainProfileDTO): this {
    this.dto.domains.push(domain);
    return this;
  }

  setDomains(domains: DomainProfileDTO[]): this {
    this.dto.domains = domains;
    return this;
  }

  setPhases(phases: MatchPhaseDTO[]): this {
    this.dto.phases = phases;
    return this;
  }

  setAiAnalysis(text: string): this {
    this.dto.aiAnalysis = text;
    return this;
  }

  setQuickRead(text: string): this {
    this.dto.quickRead = text;
    return this;
  }

  setDataConfidence(message: string): this {
    this.dto.dataConfidence = message;
    return this;
  }

  private getDefaultPhases(): MatchPhaseDTO[] {
    return [
      { 
        range: "0'–25'", 
        label: 'Establishment', 
        description: 'Pressure patterns establish, territorial control contested' 
      },
      { 
        range: "25'–60'", 
        label: 'Resolution Window', 
        description: 'Primary scoring opportunities, tactical adjustments' 
      },
      { 
        range: "60'–90'", 
        label: 'Volatility Phase', 
        description: 'Fatigue effects, discipline breaks, late surges' 
      },
    ];
  }

  build(): TodaysMatchResponseDTO {
    return { ...this.dto };
  }
}

// ============================================
// MAPPING HELPERS
// ============================================

/**
 * Mapea CBW state a StabilityGate
 */
export function mapCBWToStabilityGate(cbwState: 'narrow' | 'medium' | 'wide'): StabilityGate {
  const map: Record<string, StabilityGate> = {
    narrow: 'GREEN',
    medium: 'AMBER',
    wide: 'RED',
  };
  return map[cbwState] || 'AMBER';
}

/**
 * Mapea CBW state a CBWLevel (display format)
 */
export function mapCBWToCBWLevel(cbwState: 'narrow' | 'medium' | 'wide'): CBWLevel {
  const map: Record<string, CBWLevel> = {
    narrow: 'Narrow',
    medium: 'Medium',
    wide: 'Wide',
  };
  return map[cbwState] || 'Medium';
}

/**
 * Mapea signal band a RiskLevel
 */
export function mapBandToRiskLevel(band: 'LOW' | 'MEDIUM' | 'HIGH'): RiskLevel {
  const map: Record<string, RiskLevel> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
  };
  return map[band] || 'Medium';
}

/**
 * Genera tags de equipo basados en señales dominantes
 */
export function generateTeamTags(
  signals: { id: string; band: 'LOW' | 'MEDIUM' | 'HIGH' }[],
  isHomeTeam: boolean,
): string[] {
  const tags: string[] = [];

  const tpi = signals.find(s => s.id === 'TPI');
  const wds = signals.find(s => s.id === 'WDS');
  const ses = signals.find(s => s.id === 'SES');

  // Basado en TPI (Territorial Pressure Index)
  if (tpi?.band === 'HIGH') {
    tags.push('High Press');
  } else if (tpi?.band === 'LOW') {
    tags.push('Low Block');
  }

  // Basado en WDS (Width Dependency Signal)
  if (wds?.band === 'HIGH') {
    tags.push('Wing Play');
  }

  // Basado en SES (Scoring Explosion Signal)
  if (ses?.band === 'HIGH') {
    tags.push('Quick Transitions');
  }

  // Fallback si no hay tags
  if (tags.length === 0) {
    tags.push(isHomeTeam ? 'Home Advantage' : 'Away Form');
  }

  return tags.slice(0, 3);
}
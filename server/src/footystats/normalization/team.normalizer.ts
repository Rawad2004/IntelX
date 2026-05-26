/**
 * Team Normalizer
 * 
 * Transforma datos raw de FootyStats Team a NormalizedTeam de IntelX.
 * 
 * Responsabilidades:
 * 1. Mapear campos de FootyStats a nombres IntelX
 * 2. Calcular campos derivados (xgDifference, etc.)
 * 3. Manejar valores nulos/undefined con defaults seguros
 * 4. Estructurar goal timings por período
 */

import { Injectable } from '@nestjs/common';
import type { FootyStatsTeam } from '@shared/types';
import type { NormalizedTeam, NormalizedTeamBasic, GoalsByPeriod } from '@shared/types';
import { stripProhibitedFields } from './odds.stripper';

@Injectable()
export class TeamNormalizer {
  /**
   * Normaliza un equipo completo de FootyStats
   */
  normalize(raw: FootyStatsTeam): NormalizedTeam {
    // Primero eliminar campos prohibidos
    const clean = stripProhibitedFields(raw);
    
    const xgFor = clean.xg_for_avg_overall ?? 0;
    const xgAgainst = clean.xg_against_avg_overall ?? 0;
    const matchesPlayed = clean.seasonMatchesPlayed_overall ?? 1;

    return {
      id: clean.id,
      name: clean.name,
      cleanName: clean.cleanName ?? clean.name,
      image: clean.image ?? '',
      country: clean.country ?? '',
      
      // Position
      tablePosition: clean.tablePosition,
      
      // Season record
      seasonMatchesPlayed: matchesPlayed,
      seasonWins: clean.seasonWinsNum_overall ?? 0,
      seasonDraws: clean.seasonDrawsNum_overall ?? 0,
      seasonLosses: clean.seasonLossesNum_overall ?? 0,
      
      // Goals
      seasonGoals: clean.seasonGoals_overall ?? 0,
      seasonConceded: clean.seasonConceded_overall ?? 0,
      seasonGoalDifference: clean.seasonGoalDifference_overall ?? 0,
      
      // Points
      seasonPoints: clean.seasonPoints_overall ?? 0,
      seasonPPG: clean.seasonPPG_overall ?? 0,
      
      // xG
      xgFor,
      xgAgainst,
      xgDifference: xgFor - xgAgainst,
      
      // Form
      formRun: clean.formRun_overall ?? '',
      formRunHome: clean.formRun_home ?? '',
      formRunAway: clean.formRun_away ?? '',
      
      // Percentages
      bttsPercentage: clean.seasonBTTSPercentage_overall ?? 0,
      over25Percentage: clean.seasonOver25Percentage_overall ?? 0,
      cleanSheetPercentage: clean.seasonCSPercentage_overall ?? 0,
      
      // Averages
      goalsPerGame: clean.seasonAVG_overall ?? 0,
      concededPerGame: matchesPlayed > 0 
        ? (clean.seasonConceded_overall ?? 0) / matchesPlayed 
        : 0,
      cornersFor: clean.cornersAVG_overall ?? 0,
      cornersAgainst: clean.cornersAgainstAVG_overall ?? 0,
      cardsPerGame: clean.cardsAVG_overall ?? 0,
      foulsPerGame: clean.foulsAVG_overall ?? 0,
      shotsPerGame: clean.shotsAVG_overall ?? 0,
      shotsOnTargetPerGame: clean.shotsOnTargetAVG_overall ?? 0,
      offsidesPerGame: clean.offsidesAVG_overall ?? 0,
      offsidesAgainstPerGame: clean.offsidesAgainstAVG_overall ?? 0,
      possessionAvg: clean.possession_avg_overall ?? 50,
      dangerousAttacksAvg: clean.dangerous_attacks_avg_overall ?? 0,
      
      // Goal timings
      goalsByPeriod: this.extractGoalsByPeriod(clean, 'scored'),
      concededByPeriod: this.extractGoalsByPeriod(clean, 'conceded'),
      
      // First goal
      firstGoalScoredCount: clean.firstGoalScored ?? 0,
      firstGoalScoredPercentage: clean.firstGoalScoredPercentage ?? 0,
      
      // Clean sheets
      cleanSheets: clean.seasonCS_overall ?? 0,
    };
  }

  /**
   * Normaliza un equipo para vista de lista (datos mínimos)
   */
  normalizeBasic(raw: FootyStatsTeam): NormalizedTeamBasic {
    const clean = stripProhibitedFields(raw);
    
    return {
      id: clean.id,
      name: clean.name,
      cleanName: clean.cleanName ?? clean.name,
      image: clean.image ?? '',
      tablePosition: clean.tablePosition,
      formRun: clean.formRun_overall ?? '',
    };
  }

  /**
   * Extrae goles por período (para EDS, LGE signals)
   */
  private extractGoalsByPeriod(
    team: FootyStatsTeam,
    type: 'scored' | 'conceded',
  ): GoalsByPeriod {
    const prefix = type === 'scored' ? 'goals_scored' : 'goals_conceded';
    
    return {
      min_0_15: this.sumPeriods(team, prefix, [0, 10]) + 
                this.getHalfPeriod(team, prefix, 11, 20) * 0.5,
      min_16_30: this.getHalfPeriod(team, prefix, 11, 20) * 0.5 +
                 this.sumPeriods(team, prefix, [21, 30]),
      min_31_45: this.sumPeriods(team, prefix, [31, 40]) +
                 this.sumPeriods(team, prefix, [41, 50]) * 0.5,
      min_46_60: this.sumPeriods(team, prefix, [41, 50]) * 0.5 +
                 this.sumPeriods(team, prefix, [51, 60]),
      min_61_75: this.sumPeriods(team, prefix, [61, 70]) +
                 this.getHalfPeriod(team, prefix, 71, 80) * 0.5,
      min_76_90: this.getHalfPeriod(team, prefix, 71, 80) * 0.5 +
                 this.sumPeriods(team, prefix, [81, 90]),
    };
  }

  /**
   * Obtiene valor de un período específico
   */
  private sumPeriods(
    team: FootyStatsTeam,
    prefix: string,
    ranges: number[],
  ): number {
    let sum = 0;
    for (let i = 0; i < ranges.length; i += 2) {
      const start = ranges[i];
      const end = ranges[i + 1] ?? start + 9;
      const key = `${prefix}_min_${start}_to_${end}` as keyof FootyStatsTeam;
      sum += (team[key] as number) ?? 0;
    }
    return sum;
  }

  /**
   * Helper para obtener medio período
   */
  private getHalfPeriod(
    team: FootyStatsTeam,
    prefix: string,
    start: number,
    end: number,
  ): number {
    const key = `${prefix}_min_${start}_to_${end}` as keyof FootyStatsTeam;
    return (team[key] as number) ?? 0;
  }
}
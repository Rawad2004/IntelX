/**
 * SES Calculator - Scoring Environment Signal
 * 
 * Evalúa el ENTORNO DE GOLES esperado del partido.
 * No predice cuántos goles habrá, sino qué tipo de ambiente de goles esperar.
 * 
 * Concepto:
 * - Alto SES = ambiente propicio para goles, partido abierto
 * - Bajo SES = ambiente restrictivo, partido cerrado
 * 
 * Factores:
 * 1. Goals per game (ambos equipos)
 * 2. Over 2.5 percentage
 * 3. xG differential
 * 4. League context (ligas más/menos goleadoras)
 * 
 * Output:
 * - HIGH (65-100): Ambiente propicio para goles
 * - MEDIUM (35-64): Ambiente neutral
 * - LOW (0-34): Ambiente restrictivo
 */

import { Injectable } from '@nestjs/common';
import { SignalInput, SignalOutput, DataPoint } from '@shared/types';
import { BaseSignalCalculator } from './base.calculator';

@Injectable()
export class SESCalculator extends BaseSignalCalculator {
  readonly id = 'SES' as const;

  calculate(input: SignalInput): SignalOutput {
    const { homeTeam, awayTeam, homeLastX, awayLastX, league } = input;
    const dataPoints: DataPoint[] = [];

    // ==========================================================================
    // 1. GOALS PER GAME (Equipos)
    // ==========================================================================
    const homeGoalsFor = this.getLastXValue(homeLastX, homeTeam, 'goalsFor', 'seasonGoals') /
                         Math.max(homeTeam.seasonMatchesPlayed, 1);
    const homeGoalsAgainst = this.getLastXValue(homeLastX, homeTeam, 'goalsAgainst', 'seasonConceded') /
                             Math.max(homeTeam.seasonMatchesPlayed, 1);
    const awayGoalsFor = this.getLastXValue(awayLastX, awayTeam, 'goalsFor', 'seasonGoals') /
                         Math.max(awayTeam.seasonMatchesPlayed, 1);
    const awayGoalsAgainst = this.getLastXValue(awayLastX, awayTeam, 'goalsAgainst', 'seasonConceded') /
                             Math.max(awayTeam.seasonMatchesPlayed, 1);

    // Expected goals in match
    const expectedFromHome = (homeGoalsFor + awayGoalsAgainst) / 2;
    const expectedFromAway = (awayGoalsFor + homeGoalsAgainst) / 2;
    const expectedTotal = expectedFromHome + expectedFromAway;

    dataPoints.push(
      this.createDataPoint('home_goals_per_game', homeGoalsFor, 'team', 0.1),
      this.createDataPoint('home_conceded_per_game', homeGoalsAgainst, 'team', 0.1),
      this.createDataPoint('away_goals_per_game', awayGoalsFor, 'team', 0.1),
      this.createDataPoint('away_conceded_per_game', awayGoalsAgainst, 'team', 0.1),
    );

    // ==========================================================================
    // 2. OVER 2.5 PERCENTAGE
    // ==========================================================================
    const homeOver25 = this.getLastXValue(homeLastX, homeTeam, 'over25Percentage', 'over25Percentage');
    const awayOver25 = this.getLastXValue(awayLastX, awayTeam, 'over25Percentage', 'over25Percentage');
    const avgOver25 = (homeOver25 + awayOver25) / 2;

    dataPoints.push(
      this.createDataPoint('home_over25_pct', homeOver25, 'lastx', 0.15),
      this.createDataPoint('away_over25_pct', awayOver25, 'lastx', 0.15),
    );

    // ==========================================================================
    // 3. xG DATA
    // ==========================================================================
    const homeXgFor = this.getLastXValue(homeLastX, homeTeam, 'xgFor', 'xgFor');
    const awayXgFor = this.getLastXValue(awayLastX, awayTeam, 'xgFor', 'xgFor');
    const combinedXg = homeXgFor + awayXgFor;

    dataPoints.push(
      this.createDataPoint('home_xg_for', homeXgFor, 'lastx', 0.1),
      this.createDataPoint('away_xg_for', awayXgFor, 'lastx', 0.1),
    );

    // ==========================================================================
    // 4. LEAGUE CONTEXT
    // ==========================================================================
    const leagueAvgGoals = league?.avgGoalsPerGame ?? 2.5;
    const leagueOver25 = league?.over25Percentage ?? 50;

    dataPoints.push(
      this.createDataPoint('league_avg_goals', leagueAvgGoals, 'league', 0.1),
    );

    // ==========================================================================
    // CALCULATE SES
    // ==========================================================================
    let matchSES = 0;

    // Expected goals component (0-35 points)
    // 3.0+ expected = high scoring environment
    matchSES += this.normalize(expectedTotal, 3.5, 1.5) * 0.35;

    // Over 2.5 component (0-30 points)
    matchSES += this.normalize(avgOver25, 70, 30) * 0.30;

    // xG component (0-25 points)
    // Combined xG of 3.0+ = high quality chances expected
    matchSES += this.normalize(combinedXg, 3.5, 1.5) * 0.25;

    // League adjustment (0-10 points)
    // If league is high-scoring, boost SES
    matchSES += this.normalize(leagueAvgGoals, 3.0, 2.0) * 0.10;

    matchSES = matchSES * 100;

    // ==========================================================================
    // TEAM-SPECIFIC SES
    // ==========================================================================
    const homeSES = this.calculateTeamSES(homeGoalsFor, homeXgFor, homeOver25);
    const awaySES = this.calculateTeamSES(awayGoalsFor, awayXgFor, awayOver25);

    // ==========================================================================
    // GENERATE EXPLANATION
    // ==========================================================================
    const explanation = this.generateExplanation(
      matchSES,
      expectedTotal,
      avgOver25,
      leagueAvgGoals,
    );

    return this.buildOutput(
      matchSES,
      explanation,
      dataPoints,
      homeSES,
      awaySES,
      ['goals', 'over25', 'xg'],
    );
  }

  /**
   * Calcula el SES individual de un equipo
   */
  private calculateTeamSES(goalsPerGame: number, xgFor: number, over25Pct: number): number {
    // Goals component (0-40)
    const goalsScore = this.normalize(goalsPerGame, 2.0, 0.8) * 0.40;
    
    // xG component (0-35)
    const xgScore = this.normalize(xgFor, 2.0, 0.8) * 0.35;
    
    // Over 2.5 component (0-25)
    const overScore = this.normalize(over25Pct, 70, 30) * 0.25;

    return (goalsScore + xgScore + overScore) * 100;
  }

  /**
   * Genera explicación human-readable
   */
  private generateExplanation(
    matchSES: number,
    expectedGoals: number,
    avgOver25: number,
    leagueAvg: number,
  ): string {
    const band = this.toBand(matchSES);
    const vsLeague = expectedGoals > leagueAvg ? 'por encima' : 'por debajo';

    if (band === 'HIGH') {
      return `Ambiente propicio para goles. ~${expectedGoals.toFixed(1)} goles esperados (${vsLeague} del promedio de liga). ${avgOver25.toFixed(0)}% histórico de +2.5 goles.`;
    }
    
    if (band === 'MEDIUM') {
      return `Ambiente neutral de goles. ~${expectedGoals.toFixed(1)} goles esperados. Ni particularmente abierto ni cerrado.`;
    }
    
    // LOW
    return `Ambiente restrictivo para goles. ~${expectedGoals.toFixed(1)} goles esperados (${vsLeague} del promedio). Defensas predominan sobre ataques.`;
  }
}
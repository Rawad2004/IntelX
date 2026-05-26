/**
 * MVI Calculator - Match Volatility Index
 * 
 * Mide la VOLATILIDAD esperada del partido - qué tan impredecible
 * será en términos de eventos (goles, tarjetas, momentum shifts).
 * 
 * Concepto:
 * - Alto MVI = partido caótico, muchos cambios de estado
 * - Bajo MVI = partido predecible, flujo estable
 * 
 * IMPORTANTE: Alto MVI → WIDEN CBW (más incertidumbre)
 * 
 * Factores:
 * 1. Varianza en goles (equipos inconsistentes)
 * 2. BTTS + Over 2.5 combinados (partidos abiertos)
 * 3. Diferencial de forma (equipos en diferentes momentos)
 * 4. Risk indicator de FootyStats
 * 
 * Output:
 * - HIGH (65-100): Alta volatilidad, partido impredecible
 * - MEDIUM (35-64): Volatilidad moderada
 * - LOW (0-34): Partido predecible, bajo caos
 */

import { Injectable } from '@nestjs/common';
import { SignalInput, SignalOutput, DataPoint } from '@shared/types';
import { BaseSignalCalculator } from './base.calculator';

@Injectable()
export class MVICalculator extends BaseSignalCalculator {
  readonly id = 'MVI' as const;

  calculate(input: SignalInput): SignalOutput {
    const { homeTeam, awayTeam, homeLastX, awayLastX, league, h2h } = input;
    const dataPoints: DataPoint[] = [];

    // ==========================================================================
    // 1. BTTS PERCENTAGE (Ambos equipos marcan = más volatilidad)
    // ==========================================================================
    const homeBTTS = this.getLastXValue(homeLastX, homeTeam, 'bttsPercentage', 'bttsPercentage');
    const awayBTTS = this.getLastXValue(awayLastX, awayTeam, 'bttsPercentage', 'bttsPercentage');
    const avgBTTS = (homeBTTS + awayBTTS) / 2;

    dataPoints.push(
      this.createDataPoint('home_btts_pct', homeBTTS, 'lastx', 0.15),
      this.createDataPoint('away_btts_pct', awayBTTS, 'lastx', 0.15),
    );

    // ==========================================================================
    // 2. OVER 2.5 PERCENTAGE (Partidos con muchos goles = más volatilidad)
    // ==========================================================================
    const homeOver25 = this.getLastXValue(homeLastX, homeTeam, 'over25Percentage', 'over25Percentage');
    const awayOver25 = this.getLastXValue(awayLastX, awayTeam, 'over25Percentage', 'over25Percentage');
    const avgOver25 = (homeOver25 + awayOver25) / 2;

    dataPoints.push(
      this.createDataPoint('home_over25_pct', homeOver25, 'lastx', 0.15),
      this.createDataPoint('away_over25_pct', awayOver25, 'lastx', 0.15),
    );

    // ==========================================================================
    // 3. GOALS VARIANCE (Diferencia entre goles anotados y recibidos)
    // ==========================================================================
    const homeGoalsFor = this.getLastXValue(homeLastX, homeTeam, 'goalsFor', 'seasonGoals') / 
                         Math.max(homeTeam.seasonMatchesPlayed, 1);
    const homeGoalsAgainst = this.getLastXValue(homeLastX, homeTeam, 'goalsAgainst', 'seasonConceded') /
                             Math.max(homeTeam.seasonMatchesPlayed, 1);
    const awayGoalsFor = this.getLastXValue(awayLastX, awayTeam, 'goalsFor', 'seasonGoals') /
                         Math.max(awayTeam.seasonMatchesPlayed, 1);
    const awayGoalsAgainst = this.getLastXValue(awayLastX, awayTeam, 'goalsAgainst', 'seasonConceded') /
                             Math.max(awayTeam.seasonMatchesPlayed, 1);

    // Total goals expected
    const expectedGoals = (homeGoalsFor + awayGoalsAgainst + awayGoalsFor + homeGoalsAgainst) / 2;
    
    dataPoints.push(
      this.createDataPoint('expected_total_goals', expectedGoals, 'team', 0.2),
    );

    // ==========================================================================
    // 4. FORM INSTABILITY (Equipos con forma mixta = más volatilidad)
    // ==========================================================================
    const homeFormInstability = this.calculateFormInstability(homeTeam.formRun);
    const awayFormInstability = this.calculateFormInstability(awayTeam.formRun);

    dataPoints.push(
      this.createDataPoint('home_form_instability', homeFormInstability, 'team', 0.1),
      this.createDataPoint('away_form_instability', awayFormInstability, 'team', 0.1),
    );

    // ==========================================================================
    // 5. H2H VOLATILITY (Si hay historial volátil)
    // ==========================================================================
    let h2hVolatility = 50; // Default neutral
    if (h2h && h2h.totalMatches >= 3) {
      // Partidos cerrados (más draws) = menos volatilidad
      // Partidos abiertos (muchos goles) = más volatilidad
      h2hVolatility = this.normalize(h2h.avgGoals, 4, 1.5) * 100;
      
      dataPoints.push(
        this.createDataPoint('h2h_avg_goals', h2h.avgGoals, 'h2h', 0.1),
      );
    }

    // ==========================================================================
    // CALCULATE MVI
    // ==========================================================================
    let matchMVI = 0;

    // BTTS component (0-25 points)
    // 70%+ BTTS = very volatile
    matchMVI += this.normalize(avgBTTS, 70, 30) * 0.25;

    // Over 2.5 component (0-25 points)
    matchMVI += this.normalize(avgOver25, 70, 30) * 0.25;

    // Expected goals component (0-20 points)
    // 3.5+ goals expected = high volatility
    matchMVI += this.normalize(expectedGoals, 3.5, 1.5) * 0.20;

    // Form instability component (0-20 points)
    const avgFormInstability = (homeFormInstability + awayFormInstability) / 2;
    matchMVI += avgFormInstability * 0.20;

    // H2H component (0-10 points)
    matchMVI += (h2hVolatility / 100) * 0.10;

    // Scale to 0-100
    matchMVI = matchMVI * 100;

    // ==========================================================================
    // GENERATE EXPLANATION
    // ==========================================================================
    const explanation = this.generateExplanation(
      matchMVI,
      avgBTTS,
      avgOver25,
      expectedGoals,
      avgFormInstability,
    );

    return this.buildOutput(
      matchMVI,
      explanation,
      dataPoints,
      undefined, // MVI es del partido, no de equipos individuales
      undefined,
      ['btts', 'over25', 'goals'],
    );
  }

  /**
   * Calcula la inestabilidad de forma de un equipo
   * Forma con muchos cambios (WDLWL) = más inestable que (WWWLL)
   */
  private calculateFormInstability(formRun: string): number {
    if (!formRun || formRun.length < 3) return 0.5;

    let changes = 0;
    const form = formRun.toUpperCase();
    
    for (let i = 1; i < form.length; i++) {
      if (form[i] !== form[i - 1]) {
        changes++;
      }
    }

    // Max changes = length - 1 (e.g., WDLWL has 4 changes)
    const maxChanges = form.length - 1;
    
    return changes / maxChanges;
  }

  /**
   * Genera explicación human-readable
   */
  private generateExplanation(
    matchMVI: number,
    avgBTTS: number,
    avgOver25: number,
    expectedGoals: number,
    formInstability: number,
  ): string {
    const band = this.toBand(matchMVI);

    if (band === 'HIGH') {
      const reasons: string[] = [];
      if (avgBTTS >= 60) reasons.push('alto BTTS');
      if (avgOver25 >= 60) reasons.push('tendencia a +2.5 goles');
      if (formInstability >= 0.6) reasons.push('forma inestable');
      
      const reasonText = reasons.length > 0 ? ` (${reasons.join(', ')})` : '';
      return `Alta volatilidad esperada${reasonText}. ~${expectedGoals.toFixed(1)} goles esperados. Partido impredecible, CBW debería ensancharse.`;
    }
    
    if (band === 'MEDIUM') {
      return `Volatilidad moderada. Combinación de factores estables e inestables. ~${expectedGoals.toFixed(1)} goles esperados.`;
    }
    
    // LOW
    return `Baja volatilidad. Partido tiende a ser predecible con pocos cambios de estado. ~${expectedGoals.toFixed(1)} goles esperados.`;
  }
}
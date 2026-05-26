/**
 * GSS Calculator - Game State Stability
 * 
 * Mide qué tan ESTABLE tiende a ser el estado del partido una vez establecido.
 * 
 * Concepto:
 * - Alto GSS = cuando un equipo toma ventaja, la mantiene
 * - Bajo GSS = ventajas se pierden fácilmente, muchos cambios
 * 
 * Un equipo con alto GSS que marca primero tiende a ganar.
 * Un equipo con bajo GSS puede estar arriba y terminar perdiendo.
 * 
 * Factores:
 * 1. Clean sheets (capacidad de no conceder)
 * 2. First goal scored percentage (convertir ventaja inicial)
 * 3. Win % when scoring first
 * 4. Points per game (consistencia general)
 * 
 * Output:
 * - HIGH (65-100): Estado muy estable, difícil remontar
 * - MEDIUM (35-64): Estabilidad moderada
 * - LOW (0-34): Estado inestable, remontas frecuentes
 */

import { Injectable } from '@nestjs/common';
import { SignalInput, SignalOutput, DataPoint } from '@shared/types';
import { BaseSignalCalculator } from './base.calculator';

@Injectable()
export class GSSCalculator extends BaseSignalCalculator {
  readonly id = 'GSS' as const;

  calculate(input: SignalInput): SignalOutput {
    const { homeTeam, awayTeam, homeLastX, awayLastX } = input;
    const dataPoints: DataPoint[] = [];

    // ==========================================================================
    // 1. CLEAN SHEETS (Capacidad defensiva de mantener ventaja)
    // ==========================================================================
    const homeCS = this.getLastXValue(homeLastX, homeTeam, 'cleanSheets', 'cleanSheets');
    const awayCS = this.getLastXValue(awayLastX, awayTeam, 'cleanSheets', 'cleanSheets');
    
    // Normalize to percentage if raw count
    const homeMatches = homeLastX?.last5?.games ?? homeTeam.seasonMatchesPlayed ?? 1;
    const awayMatches = awayLastX?.last5?.games ?? awayTeam.seasonMatchesPlayed ?? 1;
    
    const homeCSPct = homeTeam.cleanSheetPercentage ?? (homeCS / Math.max(homeMatches, 1)) * 100;
    const awayCSPct = awayTeam.cleanSheetPercentage ?? (awayCS / Math.max(awayMatches, 1)) * 100;

    dataPoints.push(
      this.createDataPoint('home_clean_sheet_pct', homeCSPct, 'team', 0.2),
      this.createDataPoint('away_clean_sheet_pct', awayCSPct, 'team', 0.2),
    );

    // ==========================================================================
    // 2. FIRST GOAL SCORED (Tendencia a tomar ventaja temprana)
    // ==========================================================================
    const homeFGS = homeTeam.firstGoalScoredPercentage ?? 0;
    const awayFGS = awayTeam.firstGoalScoredPercentage ?? 0;

    dataPoints.push(
      this.createDataPoint('home_first_goal_pct', homeFGS, 'team', 0.15),
      this.createDataPoint('away_first_goal_pct', awayFGS, 'team', 0.15),
    );

    // ==========================================================================
    // 3. POINTS PER GAME (Consistencia general)
    // ==========================================================================
    const homePPG = this.getLastXValue(homeLastX, homeTeam, 'ppg', 'seasonPPG');
    const awayPPG = this.getLastXValue(awayLastX, awayTeam, 'ppg', 'seasonPPG');

    dataPoints.push(
      this.createDataPoint('home_ppg', homePPG, 'lastx', 0.15),
      this.createDataPoint('away_ppg', awayPPG, 'lastx', 0.15),
    );

    // ==========================================================================
    // CALCULATE TEAM GSS
    // ==========================================================================
    const homeGSS = this.calculateTeamGSS(homeCSPct, homeFGS, homePPG);
    const awayGSS = this.calculateTeamGSS(awayCSPct, awayFGS, awayPPG);

    // ==========================================================================
    // MATCH GSS
    // El GSS del partido depende del equipo MÁS estable
    // porque ese equipo definirá el ritmo si toma ventaja
    // ==========================================================================
    // Promedio ponderado hacia el más alto
    const maxGSS = Math.max(homeGSS, awayGSS);
    const minGSS = Math.min(homeGSS, awayGSS);
    
    // 60% del más estable, 40% del menos estable
    const matchGSS = (maxGSS * 0.6) + (minGSS * 0.4);

    // ==========================================================================
    // GENERATE EXPLANATION
    // ==========================================================================
    const explanation = this.generateExplanation(
      matchGSS,
      homeGSS,
      awayGSS,
      homeTeam.name,
      awayTeam.name,
      (homeCSPct + awayCSPct) / 2,
    );

    return this.buildOutput(
      matchGSS,
      explanation,
      dataPoints,
      homeGSS,
      awayGSS,
      ['clean_sheet', 'first_goal'],
    );
  }

  /**
   * Calcula el GSS individual de un equipo
   */
  private calculateTeamGSS(
    cleanSheetPct: number,
    firstGoalPct: number,
    ppg: number,
  ): number {
    let gss = 0;

    // Clean sheet component (0-40 points)
    // 40%+ clean sheets = very stable defensively
    gss += this.normalize(cleanSheetPct, 45, 15) * 0.40;

    // First goal component (0-30 points)
    // 60%+ first goal = controls tempo
    gss += this.normalize(firstGoalPct, 60, 30) * 0.30;

    // PPG component (0-30 points)
    // 2.2+ PPG = very consistent winner
    gss += this.normalize(ppg, 2.2, 0.8) * 0.30;

    return gss * 100;
  }

  /**
   * Genera explicación human-readable
   */
  private generateExplanation(
    matchGSS: number,
    homeGSS: number,
    awayGSS: number,
    homeName: string,
    awayName: string,
    avgCSPct: number,
  ): string {
    const band = this.toBand(matchGSS);
    const diff = Math.abs(homeGSS - awayGSS);
    const moreStable = homeGSS > awayGSS ? homeName : awayName;

    if (band === 'HIGH') {
      if (diff > 20) {
        return `Alta estabilidad de estado. ${moreStable} es significativamente más estable - si toma ventaja, difícil de remontar.`;
      }
      return `Alta estabilidad de estado. Ambos equipos mantienen ventajas bien (~${avgCSPct.toFixed(0)}% porterías imbatidas combinado).`;
    }
    
    if (band === 'MEDIUM') {
      return `Estabilidad moderada. Ventajas pueden mantenerse o perderse dependiendo del contexto del partido.`;
    }
    
    // LOW
    return `Baja estabilidad de estado. Ventajas son frágiles, remontas son probables. No asumir que un gol temprano define el partido.`;
  }
}
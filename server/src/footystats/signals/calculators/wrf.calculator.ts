/**
 * WRF Calculator - Width Resolution Factor
 * 
 * Mide cuánto se resuelve el partido por las BANDAS (amplitud).
 * Se basa principalmente en corners y juego por las alas.
 * 
 * Concepto:
 * - Alto WRF = equipos atacan por bandas, muchos corners
 * - Bajo WRF = juego central, pocos corners
 * 
 * Los corners son el proxy principal porque FootyStats no tiene
 * datos detallados de ataques por banda, pero los corners son
 * resultado directo del juego por las alas.
 * 
 * Factores:
 * 1. Corners a favor (ataque por bandas)
 * 2. Corners en contra (presión recibida por bandas)
 * 3. Contexto de liga
 * 
 * Output:
 * - HIGH (65-100): Mucha presión lateral, 12+ corners esperados
 * - MEDIUM (35-64): Presión lateral moderada
 * - LOW (0-34): Juego central, pocos corners
 */

import { Injectable } from '@nestjs/common';
import { SignalInput, SignalOutput, DataPoint } from '@shared/types';
import { BaseSignalCalculator } from './base.calculator';

@Injectable()
export class WRFCalculator extends BaseSignalCalculator {
  readonly id = 'WRF' as const;

  calculate(input: SignalInput): SignalOutput {
    const { homeTeam, awayTeam, homeLastX, awayLastX, league } = input;
    const dataPoints: DataPoint[] = [];

    // ==========================================================================
    // 1. HOME TEAM CORNERS
    // ==========================================================================
    const homeCornersFor = this.getLastXValue(homeLastX, homeTeam, 'cornersAvg', 'cornersFor');
    const homeCornersAgainst = this.getLastXValue(
      homeLastX,
      homeTeam,
      'cornersAgainstAvg',
      'cornersAgainst',
    );

    dataPoints.push(
      this.createDataPoint('home_corners_for', homeCornersFor, 'lastx', 0.25),
      this.createDataPoint('home_corners_against', homeCornersAgainst, 'lastx', 0.25),
    );

    // ==========================================================================
    // 2. AWAY TEAM CORNERS
    // ==========================================================================
    const awayCornersFor = this.getLastXValue(awayLastX, awayTeam, 'cornersAvg', 'cornersFor');
    const awayCornersAgainst = this.getLastXValue(
      awayLastX,
      awayTeam,
      'cornersAgainstAvg',
      'cornersAgainst',
    );

    dataPoints.push(
      this.createDataPoint('away_corners_for', awayCornersFor, 'lastx', 0.25),
      this.createDataPoint('away_corners_against', awayCornersAgainst, 'lastx', 0.25),
    );

    // ==========================================================================
    // CALCULATE EXPECTED CORNERS
    // ==========================================================================
    // Total esperado = (Home corners for + Away corners against) / 2 +
    //                  (Away corners for + Home corners against) / 2
    // Simplificado: promedio de los 4 valores
    const expectedCorners = (
      homeCornersFor + homeCornersAgainst + 
      awayCornersFor + awayCornersAgainst
    ) / 2; // Dividido por 2 porque for/against se duplican

    // League context
    const leagueCorners = league?.avgCornersPerGame ?? 10;

    // ==========================================================================
    // CALCULATE WRF
    // ==========================================================================
    // Normalizamos contra 12 corners como máximo esperado
    // Un partido con 12+ corners es muy "ancho"
    const matchWRF = this.normalize(expectedCorners, 14, 6) * 100;

    // ==========================================================================
    // CALCULATE TEAM-SPECIFIC VALUES
    // ==========================================================================
    const homeWRF = this.calculateTeamWRF(homeCornersFor, awayCornersAgainst);
    const awayWRF = this.calculateTeamWRF(awayCornersFor, homeCornersAgainst);

    // ==========================================================================
    // GENERATE EXPLANATION
    // ==========================================================================
    const explanation = this.generateExplanation(
      matchWRF,
      expectedCorners,
      leagueCorners,
      homeWRF,
      awayWRF,
    );

    return this.buildOutput(
      matchWRF,
      explanation,
      dataPoints,
      homeWRF,
      awayWRF,
      ['corners'],
    );
  }

  /**
   * Calcula el WRF individual considerando ataque propio + concesión del rival
   */
  private calculateTeamWRF(cornersFor: number, opponentCornersAgainst: number): number {
    // El WRF de un equipo depende de:
    // 1. Cuántos corners genera (su ataque por bandas)
    // 2. Cuántos corners concede el rival (susceptibilidad del rival)

    // Average of both
    const expectedCornersForTeam = (cornersFor + opponentCornersAgainst) / 2;
    
    // Normalize: 6+ corners for a team = high WRF
    return this.normalize(expectedCornersForTeam, 7, 3) * 100;
  }

  /**
   * Genera explicación human-readable
   */
  private generateExplanation(
    matchWRF: number,
    expectedCorners: number,
    leagueCorners: number,
    homeWRF: number,
    awayWRF: number,
  ): string {
    const band = this.toBand(matchWRF);
    const vsLeague = expectedCorners > leagueCorners ? 'sobre' : 'bajo';
    const diff = Math.abs(homeWRF - awayWRF);

    if (band === 'HIGH') {
      if (diff > 20) {
        const dominant = homeWRF > awayWRF ? 'local' : 'visitante';
        return `Alta resolución por amplitud. El equipo ${dominant} genera más presión lateral. ~${expectedCorners.toFixed(1)} corners esperados (${vsLeague} promedio de liga).`;
      }
      return `Alta resolución por amplitud. Ambos equipos atacan por bandas. ~${expectedCorners.toFixed(1)} corners esperados (${vsLeague} promedio de liga).`;
    }
    
    if (band === 'MEDIUM') {
      return `Resolución moderada por amplitud. Uso mixto de bandas y juego central. ~${expectedCorners.toFixed(1)} corners esperados.`;
    }
    
    // LOW
    return `Baja resolución por amplitud. Equipos prefieren juego central, pocos corners esperados (~${expectedCorners.toFixed(1)}).`;
  }
}
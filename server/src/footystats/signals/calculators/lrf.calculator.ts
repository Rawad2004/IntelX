/**
 * LRF Calculator - Line Resolution Factor
 * 
 * Mide cómo la LÍNEA DEFENSIVA resuelve situaciones de peligro.
 * Se basa principalmente en offsides (fueras de juego).
 * 
 * Concepto:
 * - Línea alta = más offsides = más "resolución por línea"
 * - Línea baja = menos offsides = resolución por otros medios
 * 
 * Un LRF alto indica que el partido se resolverá frecuentemente
 * por la trampa del offside (interrupciones del juego).
 * 
 * Factores:
 * 1. Offsides ganados (opponent caught offside)
 * 2. Offsides concedidos (team caught offside)
 * 3. Diferencial de línea entre equipos
 * 
 * Output:
 * - HIGH (65-100): Mucha resolución por línea alta, muchos offsides esperados
 * - MEDIUM (35-64): Líneas mixtas
 * - LOW (0-34): Líneas bajas, pocos offsides
 */

import { Injectable } from '@nestjs/common';
import { SignalInput, SignalOutput, DataPoint } from '@shared/types';
import { BaseSignalCalculator } from './base.calculator';

@Injectable()
export class LRFCalculator extends BaseSignalCalculator {
  readonly id = 'LRF' as const;

  calculate(input: SignalInput): SignalOutput {
    const { homeTeam, awayTeam, homeLastX, awayLastX } = input;
    const dataPoints: DataPoint[] = [];

    // ==========================================================================
    // 1. HOME TEAM - OFFSIDES WON (opponent caught offside)
    // Indica qué tan efectiva es su línea alta
    // ==========================================================================
    const homeOffsidesWon = this.getLastXValue(
      homeLastX,
      homeTeam,
      'offsidesAgainstAvg', // En lastX
      'offsidesAgainstPerGame', // En team stats
    );
    
    // Away team getting caught = home line effectiveness
    const awayOffsidesCommitted = this.getLastXValue(
      awayLastX,
      awayTeam,
      'offsidesAvg',
      'offsidesPerGame',
    );

    dataPoints.push(
      this.createDataPoint('home_offsides_won', homeOffsidesWon, 'lastx', 0.25),
      this.createDataPoint('away_offsides_committed', awayOffsidesCommitted, 'lastx', 0.25),
    );

    // ==========================================================================
    // 2. AWAY TEAM - OFFSIDES WON (opponent caught offside)
    // ==========================================================================
    const awayOffsidesWon = this.getLastXValue(
      awayLastX,
      awayTeam,
      'offsidesAgainstAvg',
      'offsidesAgainstPerGame',
    );
    
    const homeOffsidesCommitted = this.getLastXValue(
      homeLastX,
      homeTeam,
      'offsidesAvg',
      'offsidesPerGame',
    );

    dataPoints.push(
      this.createDataPoint('away_offsides_won', awayOffsidesWon, 'lastx', 0.25),
      this.createDataPoint('home_offsides_committed', homeOffsidesCommitted, 'lastx', 0.25),
    );

    // ==========================================================================
    // CALCULATE TEAM LRFs
    // ==========================================================================
    const homeLRF = this.calculateTeamLRF(homeOffsidesWon, awayOffsidesCommitted);
    const awayLRF = this.calculateTeamLRF(awayOffsidesWon, homeOffsidesCommitted);

    // ==========================================================================
    // MATCH LRF
    // Promedio de ambos, ajustado por el diferencial
    // ==========================================================================
    const matchLRF = (homeLRF + awayLRF) / 2;

    // ==========================================================================
    // GENERATE EXPLANATION
    // ==========================================================================
    const explanation = this.generateExplanation(
      matchLRF,
      homeLRF,
      awayLRF,
      homeOffsidesWon + awayOffsidesWon,
    );

    return this.buildOutput(
      matchLRF,
      explanation,
      dataPoints,
      homeLRF,
      awayLRF,
      ['offsides'],
    );
  }

  /**
   * Calcula el LRF individual de un equipo
   * 
   * @param offsidesWon - Offsides que el equipo gana (opponent caught)
   * @param opponentOffsides - Offsides que comete el oponente
   */
  private calculateTeamLRF(
    offsidesWon: number,
    opponentOffsides: number,
  ): number {
    // Un equipo con línea alta efectiva:
    // 1. Gana muchos offsides (3+ por partido = excelente)
    // 2. El oponente cae frecuentemente (indica línea funcional)

    // Trap effectiveness (0-50 points)
    // 3+ offsides ganados = máximo
    const trapScore = this.normalize(offsidesWon, 3.5, 0) * 0.5;

    // Opponent susceptibility (0-50 points)
    // Si el oponente comete muchos offsides, la línea alta funciona
    const susceptibilityScore = this.normalize(opponentOffsides, 3, 0.5) * 0.5;

    return trapScore + susceptibilityScore;
  }

  /**
   * Genera explicación human-readable
   */
  private generateExplanation(
    matchLRF: number,
    homeLRF: number,
    awayLRF: number,
    totalExpectedOffsides: number,
  ): string {
    const band = this.toBand(matchLRF);
    const diff = Math.abs(homeLRF - awayLRF);

    if (band === 'HIGH') {
      return `Alta resolución por línea defensiva. Ambos equipos emplean línea alta, esperar ~${totalExpectedOffsides.toFixed(1)} fueras de juego combinados.`;
    }
    
    if (band === 'MEDIUM') {
      if (diff > 20) {
        return `Resolución mixta por línea. Un equipo juega más adelantado que el otro, offsides moderados esperados.`;
      }
      return `Resolución moderada por línea defensiva. Líneas a media altura, algunos fueras de juego esperados.`;
    }
    
    // LOW
    return `Baja resolución por línea. Equipos tienden a defender en bloque bajo, pocas interrupciones por offside.`;
  }
}
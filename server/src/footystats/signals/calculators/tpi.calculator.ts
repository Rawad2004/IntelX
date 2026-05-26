/**
 * TPI Calculator - Threat Persistence Index
 * 
 * Mide la capacidad de un equipo para mantener presión ofensiva SOSTENIDA.
 * No es solo "cuánto atacan" sino "cuánto PERSISTE la amenaza".
 * 
 * Factores principales:
 * 1. xG For Average (calidad de oportunidades creadas)
 * 2. Shots per game (volumen de tiros)
 * 3. Dangerous attacks (ataques peligrosos)
 * 4. Shots on target ratio (eficiencia)
 * 
 * Fuente de datos: Last 5 matches (primary), Team season stats (fallback)
 * 
 * Output:
 * - HIGH (65-100): Equipo genera amenaza persistente
 * - MEDIUM (35-64): Amenaza intermitente
 * - LOW (0-34): Poca persistencia ofensiva
 */

import { Injectable } from '@nestjs/common';
import { SignalInput, SignalOutput, DataPoint } from '@shared/types';
import { BaseSignalCalculator } from './base.calculator';

@Injectable()
export class TPICalculator extends BaseSignalCalculator {
  readonly id = 'TPI' as const;

  calculate(input: SignalInput): SignalOutput {
    const { homeTeam, awayTeam, homeLastX, awayLastX, league } = input;
    const dataPoints: DataPoint[] = [];

    // ==========================================================================
    // 1. xG FOR (Primary indicator - 40% weight)
    // ==========================================================================
    const homeXgFor = this.getLastXValue(homeLastX, homeTeam, 'xgFor', 'xgFor');
    const awayXgFor = this.getLastXValue(awayLastX, awayTeam, 'xgFor', 'xgFor');

    dataPoints.push(
      this.createDataPoint('home_xg_for', homeXgFor, 'lastx', 0.2),
      this.createDataPoint('away_xg_for', awayXgFor, 'lastx', 0.2),
    );

    // ==========================================================================
    // 2. SHOTS PER GAME (Volume indicator - 25% weight)
    // ==========================================================================
    const homeShots = this.getLastXValue(homeLastX, homeTeam, 'shotsAvg', 'shotsPerGame');
    const awayShots = this.getLastXValue(awayLastX, awayTeam, 'shotsAvg', 'shotsPerGame');

    dataPoints.push(
      this.createDataPoint('home_shots_avg', homeShots, 'lastx', 0.125),
      this.createDataPoint('away_shots_avg', awayShots, 'lastx', 0.125),
    );

    // ==========================================================================
    // 3. SHOTS ON TARGET (Efficiency indicator - 20% weight)
    // ==========================================================================
    const homeSoT = this.getLastXValue(homeLastX, homeTeam, 'shotsOnTargetAvg', 'shotsOnTargetPerGame');
    const awaySoT = this.getLastXValue(awayLastX, awayTeam, 'shotsOnTargetAvg', 'shotsOnTargetPerGame');

    dataPoints.push(
      this.createDataPoint('home_shots_on_target', homeSoT, 'lastx', 0.1),
      this.createDataPoint('away_shots_on_target', awaySoT, 'lastx', 0.1),
    );

    // ==========================================================================
    // 4. DANGEROUS ATTACKS (Pressure indicator - 15% weight)
    // ==========================================================================
    const homeDangerous = homeTeam.dangerousAttacksAvg ?? 0;
    const awayDangerous = awayTeam.dangerousAttacksAvg ?? 0;

    if (homeDangerous > 0 || awayDangerous > 0) {
      dataPoints.push(
        this.createDataPoint('home_dangerous_attacks', homeDangerous, 'team', 0.075),
        this.createDataPoint('away_dangerous_attacks', awayDangerous, 'team', 0.075),
      );
    }

    // ==========================================================================
    // CALCULATE TEAM TPIs
    // ==========================================================================
    const leagueAvgXg = (league?.avgGoalsPerGame ?? 2.5) / 2; // Per team average
    
    const homeTPI = this.calculateTeamTPI(
      homeXgFor,
      homeShots,
      homeSoT,
      homeDangerous,
      leagueAvgXg,
    );
    
    const awayTPI = this.calculateTeamTPI(
      awayXgFor,
      awayShots,
      awaySoT,
      awayDangerous,
      leagueAvgXg,
    );

    // ==========================================================================
    // MATCH TPI (Combined)
    // ==========================================================================
    // El TPI del partido es el promedio de ambos equipos
    // Un partido con dos equipos ofensivos tendrá alto TPI
    const matchTPI = (homeTPI + awayTPI) / 2;

    // ==========================================================================
    // GENERATE EXPLANATION
    // ==========================================================================
    const explanation = this.generateExplanation(
      matchTPI,
      homeTPI,
      awayTPI,
      homeTeam.name,
      awayTeam.name,
    );

    return this.buildOutput(
      matchTPI,
      explanation,
      dataPoints,
      homeTPI,
      awayTPI,
      ['xg_for', 'shots'],
    );
  }

  /**
   * Calcula el TPI individual de un equipo
   */
  private calculateTeamTPI(
    xgFor: number,
    shots: number,
    shotsOnTarget: number,
    dangerousAttacks: number,
    leagueAvgXg: number,
  ): number {
    let tpi = 0;

    // 1. xG Component (0-40 points)
    // Normalizado contra el promedio de la liga
    // xG >= 2.0 = máximo puntaje
    const xgRatio = xgFor / Math.max(leagueAvgXg, 0.5);
    const xgScore = this.normalize(xgRatio, 2.0, 0.5) * 0.4;
    tpi += xgScore;

    // 2. Shots Component (0-25 points)
    // 15+ shots per game = máximo
    const shotsScore = this.normalize(shots, 15, 5) * 0.25;
    tpi += shotsScore;

    // 3. Shots on Target Component (0-20 points)
    // 6+ shots on target = máximo
    const sotScore = this.normalize(shotsOnTarget, 6, 1) * 0.20;
    tpi += sotScore;

    // 4. Dangerous Attacks Component (0-15 points)
    // Solo si tenemos datos
    if (dangerousAttacks > 0) {
      // 50+ dangerous attacks = máximo
      const dangerousScore = this.normalize(dangerousAttacks, 50, 20) * 0.15;
      tpi += dangerousScore;
    } else {
      // Redistribuir el peso a otros factores
      tpi = tpi * (1 / 0.85);
    }

    return Math.min(100, tpi);
  }

  /**
   * Genera explicación human-readable
   */
  private generateExplanation(
    matchTPI: number,
    homeTPI: number,
    awayTPI: number,
    homeName: string,
    awayName: string,
  ): string {
    const band = this.toBand(matchTPI);
    const diff = Math.abs(homeTPI - awayTPI);
    const dominant = homeTPI > awayTPI ? homeName : awayName;
    const isBalanced = diff < 15;

    if (band === 'HIGH') {
      if (isBalanced) {
        return `Alta persistencia de amenaza esperada de ambos equipos. Partido abierto con presión ofensiva constante.`;
      }
      return `Alta persistencia de amenaza. ${dominant} muestra mayor capacidad para sostener presión ofensiva.`;
    }
    
    if (band === 'MEDIUM') {
      if (isBalanced) {
        return `Persistencia moderada de amenaza. Ambos equipos con capacidad ofensiva similar, momentos de presión alternados.`;
      }
      return `Persistencia moderada. ${dominant} con ligera ventaja en generación de peligro sostenido.`;
    }
    
    // LOW
    return `Baja persistencia de amenaza. Partido tiende a ser estructuralmente cauteloso con pocas secuencias ofensivas sostenidas.`;
  }
}
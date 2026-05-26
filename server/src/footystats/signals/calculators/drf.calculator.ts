/**
 * DRF Calculator - Discipline Resolution Factor
 * 
 * Mide cómo la DISCIPLINA (tarjetas, faltas) resuelve/interrumpe el partido.
 * 
 * Concepto:
 * - Alto DRF = partido fragmentado por faltas y tarjetas
 * - Bajo DRF = partido fluido con pocas interrupciones disciplinarias
 * 
 * Factores críticos:
 * 1. Tarjetas promedio de equipos
 * 2. Faltas promedio de equipos
 * 3. Historial del árbitro (MUY IMPORTANTE)
 * 
 * El árbitro es crucial porque el mismo enfrentamiento puede tener
 * resultados muy diferentes según quién lo dirija.
 * 
 * Output:
 * - HIGH (65-100): Mucha resolución por disciplina, partido fragmentado
 * - MEDIUM (35-64): Nivel normal de intervenciones
 * - LOW (0-34): Partido fluido, pocas tarjetas esperadas
 */

import { Injectable } from '@nestjs/common';
import { SignalInput, SignalOutput, DataPoint } from '@shared/types';
import { BaseSignalCalculator } from './base.calculator';

@Injectable()
export class DRFCalculator extends BaseSignalCalculator {
  readonly id = 'DRF' as const;

  calculate(input: SignalInput): SignalOutput {
    const { homeTeam, awayTeam, homeLastX, awayLastX, referee } = input;
    const dataPoints: DataPoint[] = [];

    // ==========================================================================
    // 1. TEAM CARDS AVERAGE (30% weight)
    // ==========================================================================
    const homeCards = this.getLastXValue(homeLastX, homeTeam, 'cardsAvg', 'cardsPerGame');
    const awayCards = this.getLastXValue(awayLastX, awayTeam, 'cardsAvg', 'cardsPerGame');

    dataPoints.push(
      this.createDataPoint('home_cards_avg', homeCards, 'lastx', 0.15),
      this.createDataPoint('away_cards_avg', awayCards, 'lastx', 0.15),
    );

    // ==========================================================================
    // 2. TEAM FOULS AVERAGE (25% weight)
    // ==========================================================================
    const homeFouls = this.getLastXValue(homeLastX, homeTeam, 'foulsAvg', 'foulsPerGame');
    const awayFouls = this.getLastXValue(awayLastX, awayTeam, 'foulsAvg', 'foulsPerGame');

    dataPoints.push(
      this.createDataPoint('home_fouls_avg', homeFouls, 'lastx', 0.125),
      this.createDataPoint('away_fouls_avg', awayFouls, 'lastx', 0.125),
    );

    // ==========================================================================
    // 3. REFEREE DATA (45% weight - MOST IMPORTANT)
    // ==========================================================================
    let refereeCards = 0;
    let refereeFoulsPerGame = 0;
    let hasRefereeData = false;

    if (referee) {
      hasRefereeData = true;
      refereeCards = referee.cardsPerMatch ?? 0;
      
      // Penales dados también indica árbitro estricto
      const refPenalties = referee.penaltiesPerMatch ?? 0;

      dataPoints.push(
        this.createDataPoint('referee_cards_per_match', refereeCards, 'referee', 0.35),
        this.createDataPoint('referee_penalties_per_match', refPenalties, 'referee', 0.1),
      );
    }

    // ==========================================================================
    // CALCULATE DRF
    // ==========================================================================
    const teamCardsAvg = (homeCards + awayCards) / 2;
    const teamFoulsAvg = (homeFouls + awayFouls) / 2;

    let matchDRF = 0;

    // Component 1: Team cards (0-30 points)
    // 4+ cards per team average = high
    const teamCardsScore = this.normalize(teamCardsAvg, 4, 1) * 0.30;
    matchDRF += teamCardsScore;

    // Component 2: Team fouls (0-25 points)
    // 14+ fouls per team = high
    const teamFoulsScore = this.normalize(teamFoulsAvg, 14, 8) * 0.25;
    matchDRF += teamFoulsScore;

    // Component 3: Referee (0-45 points or redistributed)
    if (hasRefereeData && refereeCards > 0) {
      // 5+ cards per match = very strict referee
      const refereeScore = this.normalize(refereeCards, 5, 2) * 0.45;
      matchDRF += refereeScore;
    } else {
      // Sin datos de árbitro, redistribuir peso
      // Esto reduce la confianza general
      matchDRF = matchDRF * (1 / 0.55);
    }

    // ==========================================================================
    // CALCULATE TEAM-SPECIFIC VALUES
    // ==========================================================================
    const homeDRF = this.calculateTeamDRF(homeCards, homeFouls);
    const awayDRF = this.calculateTeamDRF(awayCards, awayFouls);

    // ==========================================================================
    // GENERATE EXPLANATION
    // ==========================================================================
    const explanation = this.generateExplanation(
      matchDRF,
      referee?.name,
      refereeCards,
      teamCardsAvg * 2, // Total expected cards
      hasRefereeData,
    );

    return this.buildOutput(
      matchDRF,
      explanation,
      dataPoints,
      homeDRF,
      awayDRF,
      ['cards', 'fouls', 'referee'],
    );
  }

  /**
   * Calcula el DRF individual de un equipo
   */
  private calculateTeamDRF(cards: number, fouls: number): number {
    // Cards: 0-60 points (4+ = max)
    const cardsScore = this.normalize(cards, 4, 0.5) * 0.6;
    
    // Fouls: 0-40 points (14+ = max)
    const foulsScore = this.normalize(fouls, 14, 8) * 0.4;

    return cardsScore + foulsScore;
  }

  /**
   * Genera explicación human-readable
   */
  private generateExplanation(
    matchDRF: number,
    refereeName: string | undefined,
    refereeCards: number,
    expectedTotalCards: number,
    hasRefereeData: boolean,
  ): string {
    const band = this.toBand(matchDRF);

    // Build referee context
    let refereeContext = '';
    if (hasRefereeData && refereeName) {
      if (refereeCards >= 4.5) {
        refereeContext = `Árbitro ${refereeName} es estricto (~${refereeCards.toFixed(1)} tarjetas/partido). `;
      } else if (refereeCards >= 3) {
        refereeContext = `Árbitro ${refereeName} con criterio moderado. `;
      } else if (refereeCards > 0) {
        refereeContext = `Árbitro ${refereeName} tiende a ser permisivo. `;
      }
    } else {
      refereeContext = 'Árbitro no asignado o sin historial. ';
    }

    if (band === 'HIGH') {
      return `Alta resolución por disciplina. ${refereeContext}Esperados ~${expectedTotalCards.toFixed(0)} tarjetas combinadas. Partido fragmentado.`;
    }
    
    if (band === 'MEDIUM') {
      return `Resolución moderada por disciplina. ${refereeContext}Nivel estándar de intervenciones arbitrales esperado.`;
    }
    
    // LOW
    return `Baja resolución por disciplina. ${refereeContext}Equipos con buen historial disciplinario, partido fluido esperado.`;
  }
}
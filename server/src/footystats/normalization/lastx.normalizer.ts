/**
 * LastX Normalizer
 * 
 * Transforma datos de Last 5/6/10 de FootyStats a NormalizedLastX.
 * 
 * IMPORTANTE (del Canonical Spec):
 * "Last 5/6/10 matches son MANDATORIOS para el análisis.
 *  Last 5 es la ventana PRIMARIA."
 * 
 * FootyStats devuelve estos datos en el endpoint /lastx con la misma
 * estructura que Team, pero solo para los últimos X partidos.
 */

import { Injectable } from '@nestjs/common';
import type { FootyStatsLastX, FootyStatsTeam } from '@shared/types';
import type { NormalizedLastX, LastXWindow } from '@shared/types';
import { stripProhibitedFields } from './odds.stripper';

@Injectable()
export class LastXNormalizer {
  /**
   * Normaliza el objeto completo de LastX
   */
  normalize(raw: FootyStatsLastX): NormalizedLastX {
    const clean = stripProhibitedFields(raw);
    
    return {
      last5: this.normalizeWindow(clean.last5, 5),
      last6: clean.last6 ? this.normalizeWindow(clean.last6, 6) : undefined,
      last10: clean.last10 ? this.normalizeWindow(clean.last10, 10) : undefined,
    };
  }

  /**
   * Normaliza una ventana específica (last5, last6, o last10)
   */
  normalizeWindow(raw: FootyStatsTeam | undefined, games: number): LastXWindow {
    if (!raw) {
      return this.createEmptyWindow(games);
    }

    const clean = stripProhibitedFields(raw);
    const matchesPlayed = clean.seasonMatchesPlayed_overall ?? games;

    return {
      games: matchesPlayed,
      form: clean.formRun_overall ?? '',
      wins: clean.seasonWinsNum_overall ?? 0,
      draws: clean.seasonDrawsNum_overall ?? 0,
      losses: clean.seasonLossesNum_overall ?? 0,
      goalsFor: clean.seasonGoals_overall ?? 0,
      goalsAgainst: clean.seasonConceded_overall ?? 0,
      points: clean.seasonPoints_overall ?? 0,
      ppg: clean.seasonPPG_overall ?? 0,
      xgFor: clean.xg_for_avg_overall ?? 0,
      xgAgainst: clean.xg_against_avg_overall ?? 0,
      bttsPercentage: clean.seasonBTTSPercentage_overall ?? 0,
      over25Percentage: clean.seasonOver25Percentage_overall ?? 0,
      cornersAvg: clean.cornersAVG_overall ?? 0,
      cardsAvg: clean.cardsAVG_overall ?? 0,
      shotsAvg: clean.shotsAVG_overall ?? 0,
      foulsAvg: clean.foulsAVG_overall ?? 0,
      possessionAvg: clean.possession_avg_overall ?? 50,
      cleanSheets: clean.seasonCS_overall ?? 0,
    };
  }

  /**
   * Crea una ventana vacía con valores por defecto
   * Se usa cuando no hay datos disponibles
   */
  private createEmptyWindow(games: number): LastXWindow {
    return {
      games: 0,
      form: '',
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      ppg: 0,
      xgFor: 0,
      xgAgainst: 0,
      bttsPercentage: 0,
      over25Percentage: 0,
      cornersAvg: 0,
      cardsAvg: 0,
      shotsAvg: 0,
      foulsAvg: 0,
      possessionAvg: 50,
      cleanSheets: 0,
    };
  }

  /**
   * Combina datos de LastX con datos de Team como fallback
   * Útil cuando LastX tiene datos incompletos
   */
  mergeWithTeamFallback(
    lastX: NormalizedLastX,
    teamData: FootyStatsTeam,
  ): NormalizedLastX {
    const teamClean = stripProhibitedFields(teamData);

    // Si last5 está vacío o incompleto, usar datos del equipo
    if (!lastX.last5.form || lastX.last5.games === 0) {
      return {
        ...lastX,
        last5: {
          ...lastX.last5,
          form: teamClean.formRun_overall?.slice(0, 5) ?? '',
          xgFor: lastX.last5.xgFor || teamClean.xg_for_avg_overall || 0,
          xgAgainst: lastX.last5.xgAgainst || teamClean.xg_against_avg_overall || 0,
          cornersAvg: lastX.last5.cornersAvg || teamClean.cornersAVG_overall || 0,
          cardsAvg: lastX.last5.cardsAvg || teamClean.cardsAVG_overall || 0,
          shotsAvg: lastX.last5.shotsAvg || teamClean.shotsAVG_overall || 0,
        },
      };
    }

    return lastX;
  }

  /**
   * Calcula tendencia comparando diferentes ventanas
   */
  calculateTrend(lastX: NormalizedLastX): 'improving' | 'stable' | 'declining' {
    if (!lastX.last10 || lastX.last10.games === 0) {
      // Sin last10, no podemos calcular tendencia confiable
      return 'stable';
    }

    const recentPPG = lastX.last5.ppg;
    const extendedPPG = lastX.last10.ppg;

    const diff = recentPPG - extendedPPG;

    if (diff > 0.3) return 'improving';
    if (diff < -0.3) return 'declining';
    return 'stable';
  }

  /**
   * Verifica si los datos de LastX son suficientes para análisis
   */
  isDataSufficient(lastX: NormalizedLastX): boolean {
    // Necesitamos al menos 3 partidos en last5 para análisis mínimo
    return lastX.last5.games >= 3 && lastX.last5.form.length >= 3;
  }
}
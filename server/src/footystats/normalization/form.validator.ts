/**
 * Form Validator
 * 
 * Analiza y valida la forma de los equipos para detectar contradicciones
 * que afectan el CBW.
 * 
 * La forma es representada como string: "WWDLW" donde:
 * - W = Win (victoria)
 * - D = Draw (empate)
 * - L = Loss (derrota)
 * 
 * El carácter más a la izquierda es el resultado más reciente.
 */

import { Injectable } from '@nestjs/common';
import type { 
  NormalizedLastX, 
  FormValidation, 
  FormTrend,
  FormResult,
} from '@shared/types';
import { FORM_POINTS, FORM_WINDOWS } from '@shared/constants';

@Injectable()
export class FormValidator {
  /**
   * Valida la forma de ambos equipos y detecta contradicciones
   */
  validate(
    homeLastX: NormalizedLastX,
    awayLastX: NormalizedLastX,
  ): FormValidation {
    const homeLast5 = homeLastX.last5.form.toUpperCase();
    const homeLast10 = homeLastX.last10?.form.toUpperCase();
    const awayLast5 = awayLastX.last5.form.toUpperCase();
    const awayLast10 = awayLastX.last10?.form.toUpperCase();

    const homeTrend = this.calculateTrend(homeLast5, homeLast10);
    const awayTrend = this.calculateTrend(awayLast5, awayLast10);

    // Detectar contradicciones
    const contradictions = this.detectContradictions(
      homeLast5,
      homeLast10,
      awayLast5,
      awayLast10,
      homeTrend,
      awayTrend,
    );

    return {
      home: {
        last5: homeLast5,
        last10: homeLast10,
        trend: homeTrend,
      },
      away: {
        last5: awayLast5,
        last10: awayLast10,
        trend: awayTrend,
      },
      hasContradiction: contradictions.hasContradiction,
      contradictionReason: contradictions.reason,
    };
  }

  /**
   * Calcula la tendencia comparando last5 con last10
   */
  calculateTrend(last5: string, last10?: string): FormTrend {
    if (!last10 || last10.length < 6) {
      // Sin suficientes datos para comparar, analizar solo last5
      return this.analyzeSingleWindow(last5);
    }

    const last5PPG = this.calculatePPG(last5);
    const last10PPG = this.calculatePPG(last10);
    
    // También considerar los últimos 5 del last10 (posiciones 5-9)
    const older5 = last10.slice(5, 10);
    const older5PPG = older5.length > 0 ? this.calculatePPG(older5) : last10PPG;

    const diff = last5PPG - older5PPG;

    if (diff > 0.4) return 'improving';
    if (diff < -0.4) return 'declining';
    return 'stable';
  }

  /**
   * Analiza tendencia de una sola ventana
   */
  private analyzeSingleWindow(form: string): FormTrend {
    if (form.length < 3) return 'stable';

    const recent3 = form.slice(0, 3);
    const wins = (recent3.match(/W/g) || []).length;
    const losses = (recent3.match(/L/g) || []).length;

    if (wins >= 2 && losses === 0) return 'improving';
    if (losses >= 2 && wins === 0) return 'declining';
    return 'stable';
  }

  /**
   * Calcula puntos por partido de un string de forma
   */
  calculatePPG(form: string): number {
    if (!form || form.length === 0) return 0;

    let points = 0;
    for (const result of form) {
      switch (result.toUpperCase()) {
        case 'W':
          points += FORM_POINTS.WIN;
          break;
        case 'D':
          points += FORM_POINTS.DRAW;
          break;
        case 'L':
          points += FORM_POINTS.LOSS;
          break;
      }
    }

    return points / form.length;
  }

  /**
   * Detecta contradicciones en la forma
   */
  private detectContradictions(
    homeLast5: string,
    homeLast10: string | undefined,
    awayLast5: string,
    awayLast10: string | undefined,
    homeTrend: FormTrend,
    awayTrend: FormTrend,
  ): { hasContradiction: boolean; reason?: string } {
    const contradictions: string[] = [];

    // 1. Contradicción interna del equipo local
    if (homeLast10) {
      const homeContradiction = this.checkInternalContradiction(
        homeLast5,
        homeLast10,
        'Local',
      );
      if (homeContradiction) {
        contradictions.push(homeContradiction);
      }
    }

    // 2. Contradicción interna del equipo visitante
    if (awayLast10) {
      const awayContradiction = this.checkInternalContradiction(
        awayLast5,
        awayLast10,
        'Visitante',
      );
      if (awayContradiction) {
        contradictions.push(awayContradiction);
      }
    }

    // 3. Contradicción entre tendencias opuestas extremas
    if (
      (homeTrend === 'improving' && awayTrend === 'improving') ||
      (homeTrend === 'declining' && awayTrend === 'declining')
    ) {
      // Ambos mejorando o ambos empeorando no es necesariamente contradicción
    } else if (
      (homeTrend === 'improving' && awayTrend === 'declining') ||
      (homeTrend === 'declining' && awayTrend === 'improving')
    ) {
      // Tendencias opuestas claras - no es contradicción, es información clara
    }

    // 4. Forma muy volátil (muchos cambios)
    const homeVolatility = this.calculateFormVolatility(homeLast5);
    const awayVolatility = this.calculateFormVolatility(awayLast5);
    
    if (homeVolatility > 0.7 || awayVolatility > 0.7) {
      contradictions.push(
        `Forma muy volátil (${homeVolatility > 0.7 ? 'Local' : 'Visitante'} con resultados alternantes).`,
      );
    }

    return {
      hasContradiction: contradictions.length > 0,
      reason: contradictions.length > 0 ? contradictions.join(' ') : undefined,
    };
  }

  /**
   * Verifica contradicción interna de un equipo
   */
  private checkInternalContradiction(
    last5: string,
    last10: string,
    teamLabel: string,
  ): string | null {
    const last5PPG = this.calculatePPG(last5);
    const older5 = last10.slice(5, 10);
    const older5PPG = older5.length > 0 ? this.calculatePPG(older5) : 0;

    // Cambio drástico en PPG (más de 1 punto)
    if (Math.abs(last5PPG - older5PPG) > 1.2) {
      const direction = last5PPG > older5PPG ? 'mejorando drásticamente' : 'cayendo drásticamente';
      return `${teamLabel} ${direction} (${older5PPG.toFixed(1)} → ${last5PPG.toFixed(1)} PPG).`;
    }

    return null;
  }

  /**
   * Calcula qué tan volátil es la forma (muchos cambios W→L→W)
   */
  calculateFormVolatility(form: string): number {
    if (!form || form.length < 2) return 0;

    let changes = 0;
    for (let i = 1; i < form.length; i++) {
      if (form[i] !== form[i - 1]) {
        changes++;
      }
    }

    return changes / (form.length - 1);
  }

  /**
   * Parsea string de forma a array de resultados
   */
  parseForm(form: string): FormResult[] {
    return form
      .toUpperCase()
      .split('')
      .filter(c => ['W', 'D', 'L'].includes(c)) as FormResult[];
  }

  /**
   * Cuenta resultados en un string de forma
   */
  countResults(form: string): { wins: number; draws: number; losses: number } {
    const parsed = this.parseForm(form);
    return {
      wins: parsed.filter(r => r === 'W').length,
      draws: parsed.filter(r => r === 'D').length,
      losses: parsed.filter(r => r === 'L').length,
    };
  }

  /**
   * Calcula racha actual (consecutivos del mismo resultado)
   */
  getCurrentStreak(form: string): { result: FormResult; count: number } | null {
    if (!form || form.length === 0) return null;

    const first = form[0].toUpperCase() as FormResult;
    let count = 1;

    for (let i = 1; i < form.length; i++) {
      if (form[i].toUpperCase() === first) {
        count++;
      } else {
        break;
      }
    }

    return { result: first, count };
  }

  /**
   * Verifica si hay suficientes datos para análisis confiable
   */
  isDataSufficient(homeLastX: NormalizedLastX, awayLastX: NormalizedLastX): boolean {
    const homeGames = homeLastX.last5.games;
    const awayGames = awayLastX.last5.games;

    return homeGames >= FORM_WINDOWS.MIN_GAMES && awayGames >= FORM_WINDOWS.MIN_GAMES;
  }
}
/**
 * Base Signal Calculator
 * 
 * Clase abstracta que define la interfaz y métodos comunes para todos
 * los calculadores de señales de IntelX.
 * 
 * Cada señal tiene:
 * - Un ID único (TPI, LRF, etc.)
 * - Un valor interno 0-100 (NO expuesto al frontend)
 * - Una banda (LOW/MEDIUM/HIGH) que SÍ se expone
 * - Una explicación human-readable
 * - Data points que justifican el cálculo
 */

import {
  SignalId,
  SignalBand,
  SignalOutput,
  SignalInput,
  DataPoint,
} from '@shared/types';
import {
  DEFAULT_BAND_THRESHOLDS,
  SIGNAL_BAND_THRESHOLDS,
  SIGNAL_DEFINITIONS,
} from '@shared/constants';

export abstract class BaseSignalCalculator {
  /**
   * ID único de la señal (TPI, LRF, etc.)
   */
  abstract readonly id: SignalId;

  /**
   * Método principal que calcula la señal
   * Cada calculador debe implementar su propia lógica
   */
  abstract calculate(input: SignalInput): SignalOutput;

  /**
   * Obtiene el nombre completo de la señal desde las constantes
   */
  protected get name(): string {
    return SIGNAL_DEFINITIONS[this.id].name;
  }

  /**
   * Obtiene la descripción de la señal
   */
  protected get description(): string {
    return SIGNAL_DEFINITIONS[this.id].description;
  }

  /**
   * Convierte un valor 0-100 a una banda (LOW/MEDIUM/HIGH)
   * 
   * @param value - Valor entre 0 y 100
   * @returns SignalBand
   */
  protected toBand(value: number): SignalBand {
    const clampedValue = Math.max(0, Math.min(100, value));
    
    // Check for custom thresholds for this signal
    const customThresholds = SIGNAL_BAND_THRESHOLDS[this.id];
    
    const lowMax = customThresholds?.lowMax ?? DEFAULT_BAND_THRESHOLDS.LOW_MAX;
    const medMax = customThresholds?.medMax ?? DEFAULT_BAND_THRESHOLDS.MEDIUM_MAX;

    if (clampedValue <= lowMax) return 'LOW';
    if (clampedValue <= medMax) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Calcula la confianza basada en los data points disponibles
   * 
   * @param dataPoints - Array de data points usados
   * @param requiredMetrics - Métricas requeridas para máxima confianza
   * @returns Confidence score 0-1
   */
  protected calculateConfidence(
    dataPoints: DataPoint[],
    requiredMetrics: string[] = [],
  ): number {
    if (dataPoints.length === 0) return 0.3;

    // Base confidence from having data
    let confidence = 0.5;

    // Bonus for each data point with non-zero value
    const validPoints = dataPoints.filter(dp => dp.value > 0);
    confidence += (validPoints.length / Math.max(dataPoints.length, 1)) * 0.3;

    // Bonus for having required metrics
    if (requiredMetrics.length > 0) {
      const foundRequired = requiredMetrics.filter(metric =>
        dataPoints.some(dp => dp.metric.includes(metric) && dp.value > 0),
      );
      confidence += (foundRequired.length / requiredMetrics.length) * 0.2;
    }

    return Math.min(1, confidence);
  }

  /**
   * Crea un data point estructurado
   */
  protected createDataPoint(
    metric: string,
    value: number,
    source: DataPoint['source'],
    weight: number,
  ): DataPoint {
    return {
      metric,
      value: value ?? 0,
      source,
      weight,
    };
  }

  /**
   * Normaliza un valor a escala 0-100 basado en un máximo esperado
   * 
   * @param value - Valor a normalizar
   * @param maxExpected - Valor máximo esperado (equivale a 100)
   * @param minExpected - Valor mínimo esperado (equivale a 0)
   */
  protected normalize(
    value: number,
    maxExpected: number,
    minExpected: number = 0,
  ): number {
    if (maxExpected === minExpected) return 50;
    
    const normalized = ((value - minExpected) / (maxExpected - minExpected)) * 100;
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * Obtiene valor de Last X con fallback a stats de temporada
   * Prioriza: last5 > team season stats > 0
   */
  protected getLastXValue(
    lastX: SignalInput['homeLastX'] | SignalInput['awayLastX'],
    team: SignalInput['homeTeam'] | SignalInput['awayTeam'],
    lastXField: string,
    teamField: string,
  ): number {
    // Try last5 first (primary window per spec)
    const last5Value = (lastX?.last5 as any)?.[lastXField];
    if (last5Value !== undefined && last5Value !== null) {
      return last5Value;
    }

    // Fallback to team season stats
    const teamValue = (team as any)?.[teamField];
    if (teamValue !== undefined && teamValue !== null) {
      return teamValue;
    }

    return 0;
  }

  /**
   * Genera el output estructurado de la señal
   */
  protected buildOutput(
    value: number,
    explanation: string,
    dataPoints: DataPoint[],
    homeValue?: number,
    awayValue?: number,
    requiredMetrics: string[] = [],
  ): SignalOutput {
    const clampedValue = Math.max(0, Math.min(100, Math.round(value)));
    
    return {
      id: this.id,
      name: this.name,
      value: clampedValue,
      band: this.toBand(clampedValue),
      confidence: this.calculateConfidence(dataPoints, requiredMetrics),
      explanation,
      dataPoints,
      homeValue: homeValue !== undefined ? Math.round(homeValue) : undefined,
      awayValue: awayValue !== undefined ? Math.round(awayValue) : undefined,
    };
  }
}
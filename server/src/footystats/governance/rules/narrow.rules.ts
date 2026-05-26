/**
 * CBW Narrow Rules
 * 
 * Reglas que podrían ESTRECHAR el Confidence Band Width.
 * Estrechar = más confianza = análisis más preciso.
 * 
 * ⚠️ ADVERTENCIA CRÍTICA (del Canonical Spec):
 * "CBW NUNCA es estrechado por TPI o Resolution Factors."
 * "CBW NUNCA es estrechado por éxito reciente."
 * 
 * Estrechar es MUY DIFÍCIL y requiere condiciones excepcionales.
 * La mayoría de partidos deberían tener CBW medium o wide.
 * 
 * Solo estrechamos cuando:
 * 1. TODAS las señales están alineadas (mismo band)
 * 2. Alta confianza en los datos
 * 3. Sin contradicciones de forma
 * 4. Volatilidad baja
 */

import type { SignalOutput, FormValidation } from '@shared/types';

export interface NarrowRuleResult {
  triggered: boolean;
  weight: number;      // 1 = permite narrow, pero no fuerza
  reason: string;
}

export type NarrowRule = (
  signals: SignalOutput[],
  formValidation?: FormValidation,
) => NarrowRuleResult;

// =============================================================================
// RULE 1: SIGNAL ALIGNMENT
// =============================================================================
/**
 * Si TODAS las señales core están en el mismo band = alto alineamiento
 * Esto NO estrecha por sí solo, pero es prerrequisito
 */
export const signalAlignmentRule: NarrowRule = (signals) => {
  if (signals.length < 5) {
    return { triggered: false, weight: 0, reason: '' };
  }

  const bands = signals.map(s => s.band);
  const uniqueBands = new Set(bands);

  // Todas en el mismo band
  if (uniqueBands.size === 1) {
    return {
      triggered: true,
      weight: 1,
      reason: `Señales alineadas: todas en band ${bands[0]}. Comportamiento estructural consistente.`,
    };
  }

  // Máximo 2 bands diferentes y mayoría clara
  if (uniqueBands.size === 2) {
    const bandCounts = bands.reduce((acc, b) => {
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxCount = Math.max(...Object.values(bandCounts));
    const dominance = maxCount / bands.length;

    // 80%+ en un band = bastante alineado
    if (dominance >= 0.8) {
      return {
        triggered: true,
        weight: 1,
        reason: `Señales mayormente alineadas (${(dominance * 100).toFixed(0)}% consistencia).`,
      };
    }
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// RULE 2: HIGH DATA CONFIDENCE
// =============================================================================
/**
 * Alta confianza en los datos (85%+)
 */
export const highDataConfidenceRule: NarrowRule = (signals) => {
  if (signals.length === 0) {
    return { triggered: false, weight: 0, reason: '' };
  }

  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

  if (avgConfidence >= 0.85) {
    return {
      triggered: true,
      weight: 1,
      reason: `Alta confianza en datos (${(avgConfidence * 100).toFixed(0)}%). Información completa y consistente.`,
    };
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// RULE 3: LOW VOLATILITY
// =============================================================================
/**
 * MVI LOW = partido predecible
 * Pero esto solo es un factor, no garantiza narrow
 */
export const lowVolatilityRule: NarrowRule = (signals) => {
  const mvi = signals.find(s => s.id === 'MVI');

  if (!mvi) {
    return { triggered: false, weight: 0, reason: '' };
  }

  if (mvi.band === 'LOW') {
    return {
      triggered: true,
      weight: 1,
      reason: 'Baja volatilidad esperada (MVI LOW). Partido tiende a ser predecible.',
    };
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// RULE 4: CONSISTENT FORM
// =============================================================================
/**
 * Forma sin contradicciones Y ambos equipos con tendencia clara
 */
export const consistentFormRule: NarrowRule = (signals, formValidation) => {
  if (!formValidation) {
    return { triggered: false, weight: 0, reason: '' };
  }

  // No debe haber contradicción
  if (formValidation.hasContradiction) {
    return { triggered: false, weight: 0, reason: '' };
  }

  // Ambos equipos deben tener tendencia definida (no 'stable' ambiguo)
  const homeTrend = formValidation.home.trend;
  const awayTrend = formValidation.away.trend;

  // Si ambos tienen tendencia clara (no mixta)
  if (
    (homeTrend === 'improving' || homeTrend === 'declining') &&
    (awayTrend === 'improving' || awayTrend === 'declining')
  ) {
    return {
      triggered: true,
      weight: 1,
      reason: `Forma consistente: ${formValidation.home.last5} (${homeTrend}) vs ${formValidation.away.last5} (${awayTrend}).`,
    };
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// ALL NARROW RULES
// =============================================================================
export const ALL_NARROW_RULES: NarrowRule[] = [
  signalAlignmentRule,
  highDataConfidenceRule,
  lowVolatilityRule,
  consistentFormRule,
];

// =============================================================================
// NARROW THRESHOLD
// =============================================================================
/**
 * Para que el CBW sea NARROW, necesitamos:
 * - Al menos 3 de 4 reglas de narrow triggered
 * - Y CERO reglas de widen con weight >= 2
 * 
 * Esto hace que narrow sea muy difícil de conseguir,
 * lo cual es intencional según el Canonical Spec.
 */
export const NARROW_THRESHOLD = 3;
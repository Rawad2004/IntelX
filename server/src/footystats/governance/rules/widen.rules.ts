/**
 * CBW Widen Rules
 * 
 * Reglas que ENSANCHAN el Confidence Band Width.
 * Ensanchar = más incertidumbre = menos confianza en el análisis.
 * 
 * PRINCIPIO FUNDAMENTAL (del Canonical Spec):
 * "CBW es ENSANCHADO por conflicto de señales, alto riesgo de transición,
 *  o contradicción de forma. NUNCA es estrechado por TPI o Resolution Factors."
 * 
 * Cada regla retorna:
 * - triggered: boolean (si la regla aplica)
 * - weight: number (cuánto ensancha, 1-3)
 * - reason: string (explicación)
 */

import type { SignalOutput, BehavioralSignalStack, FormValidation } from '@shared/types';

export interface WidenRuleResult {
  triggered: boolean;
  weight: number;      // 1 = leve, 2 = moderado, 3 = severo
  reason: string;
}

export type WidenRule = (
  signals: SignalOutput[],
  formValidation?: FormValidation,
) => WidenRuleResult;

// =============================================================================
// RULE 1: SIGNAL CONFLICT - TPI vs SES
// =============================================================================
/**
 * Alta persistencia de amenaza (TPI HIGH) pero bajo entorno de goles (SES LOW)
 * = Los equipos atacan pero no convierten = impredecible
 */
export const tpiSesConflictRule: WidenRule = (signals) => {
  const tpi = signals.find(s => s.id === 'TPI');
  const ses = signals.find(s => s.id === 'SES');

  if (!tpi || !ses) {
    return { triggered: false, weight: 0, reason: '' };
  }

  // HIGH TPI + LOW SES = conflict
  if (tpi.band === 'HIGH' && ses.band === 'LOW') {
    return {
      triggered: true,
      weight: 2,
      reason: 'Conflicto TPI/SES: Alta presión ofensiva pero entorno de goles bajo. Equipos atacan pero no convierten.',
    };
  }

  // LOW TPI + HIGH SES = también puede ser conflicto (goles sin dominio)
  if (tpi.band === 'LOW' && ses.band === 'HIGH') {
    return {
      triggered: true,
      weight: 1,
      reason: 'Conflicto TPI/SES: Entorno goleador sin presión sostenida. Goles pueden venir de situaciones aisladas.',
    };
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// RULE 2: SIGNAL CONFLICT - GSS vs MVI
// =============================================================================
/**
 * Alta estabilidad (GSS HIGH) pero alta volatilidad (MVI HIGH)
 * = Contradicción lógica = no podemos confiar en ninguna
 */
export const gssMviConflictRule: WidenRule = (signals) => {
  const gss = signals.find(s => s.id === 'GSS');
  const mvi = signals.find(s => s.id === 'MVI');

  if (!gss || !mvi) {
    return { triggered: false, weight: 0, reason: '' };
  }

  // Ambos HIGH = contradicción
  if (gss.band === 'HIGH' && mvi.band === 'HIGH') {
    return {
      triggered: true,
      weight: 2,
      reason: 'Contradicción GSS/MVI: Señales de estabilidad y volatilidad ambas altas. Comportamiento impredecible.',
    };
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// RULE 3: HIGH VOLATILITY
// =============================================================================
/**
 * MVI HIGH por sí solo ya indica incertidumbre
 */
export const highVolatilityRule: WidenRule = (signals) => {
  const mvi = signals.find(s => s.id === 'MVI');

  if (!mvi) {
    return { triggered: false, weight: 0, reason: '' };
  }

  if (mvi.band === 'HIGH') {
    return {
      triggered: true,
      weight: 1,
      reason: 'Alta volatilidad detectada (MVI HIGH). Partido tiende a ser caótico e impredecible.',
    };
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// RULE 4: FORM CONTRADICTION
// =============================================================================
/**
 * Forma reciente contradice forma extendida
 * Ej: Last 5 mejorando pero Last 10 decayendo
 */
export const formContradictionRule: WidenRule = (signals, formValidation) => {
  if (!formValidation) {
    return { triggered: false, weight: 0, reason: '' };
  }

  if (formValidation.hasContradiction) {
    return {
      triggered: true,
      weight: 2,
      reason: formValidation.contradictionReason || 
        'Contradicción de forma: tendencia reciente contradice tendencia extendida.',
    };
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// RULE 5: LOW CONFIDENCE SIGNALS
// =============================================================================
/**
 * Si las señales tienen baja confianza promedio, ensanchar
 */
export const lowConfidenceRule: WidenRule = (signals) => {
  if (signals.length === 0) {
    return {
      triggered: true,
      weight: 3,
      reason: 'Sin señales calculadas. Datos insuficientes para análisis.',
    };
  }

  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

  if (avgConfidence < 0.5) {
    return {
      triggered: true,
      weight: 2,
      reason: `Baja confianza en señales (${(avgConfidence * 100).toFixed(0)}%). Datos incompletos o inconsistentes.`,
    };
  }

  if (avgConfidence < 0.65) {
    return {
      triggered: true,
      weight: 1,
      reason: `Confianza moderada en señales (${(avgConfidence * 100).toFixed(0)}%). Algunos datos faltantes.`,
    };
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// RULE 6: RESOLUTION FACTOR CONFLICT
// =============================================================================
/**
 * Si los factores de resolución (LRF, DRF, WRF) están todos en bandas diferentes
 * = El partido se resolverá de forma impredecible
 */
export const resolutionConflictRule: WidenRule = (signals) => {
  const lrf = signals.find(s => s.id === 'LRF');
  const drf = signals.find(s => s.id === 'DRF');
  const wrf = signals.find(s => s.id === 'WRF');

  if (!lrf || !drf || !wrf) {
    return { triggered: false, weight: 0, reason: '' };
  }

  const bands = [lrf.band, drf.band, wrf.band];
  const uniqueBands = new Set(bands);

  // Los 3 en bandas diferentes = máxima incertidumbre de resolución
  if (uniqueBands.size === 3) {
    return {
      triggered: true,
      weight: 2,
      reason: 'Factores de resolución dispersos (LRF/DRF/WRF en bandas diferentes). Múltiples formas de resolver el partido.',
    };
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// RULE 7: EXTREME DIFFERENTIAL
// =============================================================================
/**
 * Si hay una diferencia extrema entre equipos en una señal
 * Puede ser indicativo pero también riesgoso si el débil "sobre-rinde"
 */
export const extremeDifferentialRule: WidenRule = (signals) => {
  for (const signal of signals) {
    if (signal.homeValue !== undefined && signal.awayValue !== undefined) {
      const diff = Math.abs(signal.homeValue - signal.awayValue);
      
      // Diferencia > 40 puntos = extrema
      if (diff > 40) {
        return {
          triggered: true,
          weight: 1,
          reason: `Diferencial extremo en ${signal.name}: ${diff} puntos. Partidos desequilibrados pueden sorprender.`,
        };
      }
    }
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// RULE 8: MISSING REFEREE DATA
// =============================================================================
/**
 * Sin datos de árbitro, DRF es menos confiable
 */
export const missingRefereeRule: WidenRule = (signals) => {
  const drf = signals.find(s => s.id === 'DRF');

  if (!drf) {
    return { triggered: false, weight: 0, reason: '' };
  }

  // Si DRF tiene baja confianza, probablemente falta árbitro
  if (drf.confidence < 0.7) {
    return {
      triggered: true,
      weight: 1,
      reason: 'Datos de árbitro incompletos. Factor disciplinario menos confiable.',
    };
  }

  return { triggered: false, weight: 0, reason: '' };
};

// =============================================================================
// ALL WIDEN RULES
// =============================================================================
export const ALL_WIDEN_RULES: WidenRule[] = [
  tpiSesConflictRule,
  gssMviConflictRule,
  highVolatilityRule,
  formContradictionRule,
  lowConfidenceRule,
  resolutionConflictRule,
  extremeDifferentialRule,
  missingRefereeRule,
];
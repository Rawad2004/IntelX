/**
 * Signal Calculators Index
 * 
 * Re-exporta todos los calculadores de señales.
 * 
 * Señales CORE (siempre calculadas):
 * - TPI: Threat Persistence Index
 * - LRF: Line Resolution Factor
 * - DRF: Discipline Resolution Factor
 * - WRF: Width Resolution Factor
 * - MVI: Match Volatility Index
 * - GSS: Game State Stability
 * - SES: Scoring Environment Signal
 * 
 * Señales EXTENDED (cuando hay datos):
 * - CFS: Conversion Fragility Signal (TODO)
 * - PAS: Pressure Accumulation Signal (TODO)
 * - DVS: Discipline Volatility Signal (TODO)
 * - PCS: Physical Control Signal (TODO)
 * - WDS: Width Dependence Signal (TODO)
 * - TIS: Territorial Illusion Signal (TODO)
 * - EDS: Early Disruption Signal (TODO)
 * - LGE: Late Game Elasticity (TODO)
 */

// Base class
export { BaseSignalCalculator } from './base.calculator';

// Core calculators
export { TPICalculator } from './tpi.calculator';
export { LRFCalculator } from './lrf.calculator';
export { DRFCalculator } from './drf.calculator';
export { WRFCalculator } from './wrf.calculator';
export { MVICalculator } from './mvi.calculator';
export { GSSCalculator } from './gss.calculator';
export { SESCalculator } from './ses.calculator';

// Array of all core calculator classes for dynamic instantiation
export const CORE_CALCULATORS = [
  'TPICalculator',
  'LRFCalculator',
  'DRFCalculator',
  'WRFCalculator',
  'MVICalculator',
  'GSSCalculator',
  'SESCalculator',
] as const;
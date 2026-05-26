/**
 * Shared Constants Index
 * 
 * Re-exporta todas las constantes desde un solo punto de entrada.
 * 
 * Usage:
 *   import { SIGNAL_DEFINITIONS, CORE_SIGNAL_IDS } from '@shared/constants';
 *   import type { SignalDefinition } from '@shared/constants';
 */

// Re-export values (constants, arrays, objects)
export {
  SIGNAL_DEFINITIONS,
  DEFAULT_BAND_THRESHOLDS,
  SIGNAL_BAND_THRESHOLDS,
  CORE_SIGNAL_IDS,          // ← Usado en signal-calculator.service.ts
  EXTENDED_SIGNAL_IDS,
  SIGNAL_CONFLICTS,         // ← Se usará en CBW Governance (Paso 3)
  SIGNAL_DATA_REQUIREMENTS,
  FORM_WINDOWS,
  FORM_POINTS,
} from './signals.constants';

// Re-export types
export type { SignalDefinition } from './signals.constants';
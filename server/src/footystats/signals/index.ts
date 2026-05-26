/**
 * Signals Index
 * Ubicación: src/footystats/signals/index.ts
 * 
 * IMPORTANTE: Este archivo debe exportar SignalsModule además del service
 */

// Service
export { SignalCalculatorService } from './signal-calculator.service';

// Module (REQUERIDO por services.module.ts)
export { SignalsModule } from './signals.module';

// Los tipos vienen de @shared/types, NO los re-exportamos aquí
// para evitar conflictos con isolatedModules

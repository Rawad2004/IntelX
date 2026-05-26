/**
 * Signals Module
 * 
 * Módulo NestJS que registra todos los calculadores de señales
 * y el servicio orquestador.
 * 
 * Usage:
 * ```typescript
 * // En footystats.module.ts
 * imports: [SignalsModule]
 * ```
 */

import { Module } from '@nestjs/common';

import { SignalCalculatorService } from './signal-calculator.service';
import {
  TPICalculator,
  LRFCalculator,
  DRFCalculator,
  WRFCalculator,
  MVICalculator,
  GSSCalculator,
  SESCalculator,
} from './calculators';

@Module({
  providers: [
    // Core Signal Calculators
    TPICalculator,
    LRFCalculator,
    DRFCalculator,
    WRFCalculator,
    MVICalculator,
    GSSCalculator,
    SESCalculator,
    
    // Orchestrator Service
    SignalCalculatorService,
  ],
  exports: [
    SignalCalculatorService,
    // Also export individual calculators if needed elsewhere
    TPICalculator,
    LRFCalculator,
    DRFCalculator,
    WRFCalculator,
    MVICalculator,
    GSSCalculator,
    SESCalculator,
  ],
})
export class SignalsModule {}
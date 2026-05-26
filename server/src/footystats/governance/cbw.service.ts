/**
 * CBW Governance Service
 * 
 * Servicio que determina el Confidence Band Width (CBW) basándose
 * en las señales calculadas y la validación de forma.
 * 
 * CBW es la AUTORIDAD SUPREMA en IntelX. Todo análisis debe
 * respetar el CBW determinado.
 * 
 * Estados:
 * - NARROW: Alta confianza. Muy difícil de conseguir.
 * - MEDIUM: Confianza moderada. Estado más común.
 * - WIDE: Baja confianza. Múltiples factores de incertidumbre.
 * 
 * Principios (del Canonical Spec):
 * 1. CBW se ENSANCHA por conflictos, volatilidad, contradicciones
 * 2. CBW NUNCA se estrecha por TPI o Resolution Factors
 * 3. CBW NUNCA se estrecha por éxito reciente
 * 4. En caso de duda, ENSANCHAR
 */

import { Injectable, Logger } from '@nestjs/common';
import type { 
  SignalOutput, 
  BehavioralSignalStack, 
  FormValidation,
  CBWResult,
  CBWState,
} from '@shared/types';

import {
  ALL_WIDEN_RULES,
  ALL_NARROW_RULES,
  NARROW_THRESHOLD,
  type WidenRuleResult,
  type NarrowRuleResult,
} from './rules';

@Injectable()
export class CBWGovernanceService {
  private readonly logger = new Logger(CBWGovernanceService.name);

  /**
   * Determina el CBW basándose en señales y validación de forma
   * 
   * @param signalStack - Stack de señales calculadas
   * @param formValidation - Validación de forma (opcional)
   * @returns CBWResult con estado, razones y confianza
   */
  determine(
    signalStack: BehavioralSignalStack,
    formValidation?: FormValidation,
  ): CBWResult {
    const signals = signalStack.signals;
    const widenResults: WidenRuleResult[] = [];
    const narrowResults: NarrowRuleResult[] = [];

    // =========================================================================
    // EVALUATE WIDEN RULES
    // =========================================================================
    for (const rule of ALL_WIDEN_RULES) {
      const result = rule(signals, formValidation);
      if (result.triggered) {
        widenResults.push(result);
        this.logger.debug(`Widen rule triggered: ${result.reason} (weight: ${result.weight})`);
      }
    }

    // =========================================================================
    // EVALUATE NARROW RULES
    // =========================================================================
    for (const rule of ALL_NARROW_RULES) {
      const result = rule(signals, formValidation);
      if (result.triggered) {
        narrowResults.push(result);
        this.logger.debug(`Narrow rule triggered: ${result.reason}`);
      }
    }

    // =========================================================================
    // CALCULATE WIDEN FACTOR
    // =========================================================================
    const totalWidenWeight = widenResults.reduce((sum, r) => sum + r.weight, 0);
    const severeWidenRules = widenResults.filter(r => r.weight >= 2).length;

    // =========================================================================
    // DETERMINE CBW STATE
    // =========================================================================
    let state: CBWState;
    const reasons: string[] = [];

    // WIDE: Si hay factores severos o peso total alto
    if (severeWidenRules >= 2 || totalWidenWeight >= 5) {
      state = 'wide';
      reasons.push(...widenResults.map(r => r.reason));
      this.logger.log(`CBW: WIDE (${severeWidenRules} severe rules, total weight: ${totalWidenWeight})`);
    }
    // NARROW: Muy difícil - requiere muchos narrow Y ningún severe widen
    else if (
      narrowResults.length >= NARROW_THRESHOLD &&
      severeWidenRules === 0 &&
      totalWidenWeight <= 1
    ) {
      state = 'narrow';
      reasons.push(...narrowResults.map(r => r.reason));
      this.logger.log(`CBW: NARROW (${narrowResults.length} narrow rules, no severe widen)`);
    }
    // MEDIUM: Estado por defecto
    else {
      state = 'medium';
      
      // Incluir razones relevantes
      if (widenResults.length > 0) {
        reasons.push(...widenResults.map(r => r.reason));
      }
      if (narrowResults.length > 0 && widenResults.length === 0) {
        reasons.push(...narrowResults.map(r => r.reason));
      }
      if (reasons.length === 0) {
        reasons.push('Estado estándar sin factores extremos de ensanche o estrechamiento.');
      }
      
      this.logger.log(`CBW: MEDIUM (${widenResults.length} widen, ${narrowResults.length} narrow)`);
    }

    // =========================================================================
    // CALCULATE CONFIDENCE
    // =========================================================================
    const confidence = this.calculateConfidence(
      signalStack.dataCompleteness,
      totalWidenWeight,
      narrowResults.length,
    );

    return {
      state,
      reasons,
      confidence,
      widenFactors: totalWidenWeight,
    };
  }

  /**
   * Evalúa si un CBW existente debería actualizarse dado nuevo contexto
   * Útil para re-evaluación cuando llegan datos nuevos
   */
  shouldReEvaluate(
    currentCBW: CBWResult,
    newSignalStack: BehavioralSignalStack,
  ): boolean {
    // Si la completitud de datos cambió significativamente
    const completenessChange = Math.abs(
      newSignalStack.dataCompleteness - (1 - currentCBW.widenFactors * 0.1)
    );

    return completenessChange > 0.2;
  }

  /**
   * Genera un resumen human-readable del CBW
   */
  getSummary(cbw: CBWResult): string {
    const stateDescriptions: Record<CBWState, string> = {
      narrow: 'Alta confianza estructural',
      medium: 'Confianza moderada',
      wide: 'Baja confianza - múltiples incertidumbres',
    };

    const description = stateDescriptions[cbw.state];
    const confidenceText = `${(cbw.confidence * 100).toFixed(0)}%`;

    return `${description} (${confidenceText} confianza). ${cbw.reasons[0] || ''}`;
  }

  /**
   * Verifica si el análisis debe incluir disclaimers adicionales
   */
  needsDisclaimer(cbw: CBWResult): boolean {
    return cbw.state === 'wide' || cbw.confidence < 0.5;
  }

  /**
   * Obtiene el color/estilo sugerido para UI
   */
  getUIStyle(cbw: CBWResult): CBWUIStyle {
    switch (cbw.state) {
      case 'narrow':
        return {
          color: 'green',
          icon: 'check-circle',
          label: 'Narrow',
          description: 'Alta confianza',
        };
      case 'medium':
        return {
          color: 'yellow',
          icon: 'alert-circle',
          label: 'Medium',
          description: 'Confianza moderada',
        };
      case 'wide':
        return {
          color: 'red',
          icon: 'alert-triangle',
          label: 'Wide',
          description: 'Baja confianza',
        };
    }
  }

  /**
   * Calcula la confianza general del CBW
   */
  private calculateConfidence(
    dataCompleteness: number,
    widenWeight: number,
    narrowCount: number,
  ): number {
    // Base confidence from data completeness
    let confidence = dataCompleteness * 0.5;

    // Penalty for widen factors
    confidence -= widenWeight * 0.08;

    // Small bonus for narrow factors (but not too much)
    confidence += Math.min(narrowCount * 0.05, 0.15);

    // Clamp between 0.2 and 0.95
    return Math.max(0.2, Math.min(0.95, confidence));
  }
}

/**
 * Estilo de UI sugerido para el CBW
 */
export interface CBWUIStyle {
  color: 'green' | 'yellow' | 'red';
  icon: string;
  label: string;
  description: string;
}
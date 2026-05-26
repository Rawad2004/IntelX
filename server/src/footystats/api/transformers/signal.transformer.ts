/**
 * Signal Transformer
 * 
 * Transforma señales calculadas a DTOs para el frontend.
 * IMPORTANTE: Los valores internos (0-100) NO se exponen.
 */

import { Injectable } from '@nestjs/common';
import type { SignalOutput, BehavioralSignalStack, SignalBand } from '@shared/types';
import { SIGNAL_DEFINITIONS } from '@shared/constants';
import type { SignalDTO, SignalSummaryDTO, SignalBandDTO } from '../dto';

@Injectable()
export class SignalTransformer {
  /**
   * Transforma una señal individual a DTO
   */
  toDTO(signal: SignalOutput): SignalDTO {
    const definition = SIGNAL_DEFINITIONS[signal.id];
    
    return {
      id: signal.id,
      name: signal.name,
      shortName: definition?.shortName ?? signal.id,
      
      band: signal.band,
      bandColor: this.getBandColor(signal.band),
      bandLabel: this.getBandLabel(signal.band),
      
      homeValue: signal.homeValue,
      awayValue: signal.awayValue,
      comparison: this.getComparison(signal.homeValue, signal.awayValue),
      
      explanation: signal.explanation,
      
      category: definition?.category ?? 'environment',
      categoryLabel: this.getCategoryLabel(definition?.category ?? 'environment'),
      
      confidence: this.getConfidenceLevel(signal.confidence),
    };
  }

  /**
   * Transforma array de señales a DTOs
   */
  toDTOs(signals: SignalOutput[]): SignalDTO[] {
    return signals.map(s => this.toDTO(s));
  }

  /**
   * Crea resumen de señales agrupadas
   */
  toSummary(stack: BehavioralSignalStack): SignalSummaryDTO {
    const signalMap = new Map(stack.signals.map(s => [s.id, s]));
    
    const getBand = (id: string): SignalBandDTO => {
      const signal = signalMap.get(id as any);
      return signal ? {
        band: signal.band,
        color: this.getBandColor(signal.band),
      } : {
        band: 'MEDIUM' as const,
        color: 'yellow' as const,
      };
    };

    // Count bands
    const bands = stack.signals.map(s => s.band);
    const highCount = bands.filter(b => b === 'HIGH').length;
    const mediumCount = bands.filter(b => b === 'MEDIUM').length;
    const lowCount = bands.filter(b => b === 'LOW').length;
    
    // Average confidence
    const avgConfidence = stack.signals.length > 0
      ? stack.signals.reduce((sum, s) => sum + s.confidence, 0) / stack.signals.length
      : 0;

    return {
      persistence: {
        tpi: getBand('TPI'),
      },
      resolution: {
        lrf: getBand('LRF'),
        drf: getBand('DRF'),
        wrf: getBand('WRF'),
      },
      environment: {
        ses: getBand('SES'),
        gss: getBand('GSS'),
      },
      volatility: {
        mvi: getBand('MVI'),
      },
      overall: {
        totalSignals: stack.signals.length,
        highCount,
        mediumCount,
        lowCount,
        avgConfidence,
      },
    };
  }

  /**
   * Color de banda
   */
  private getBandColor(band: SignalBand): 'red' | 'yellow' | 'green' {
    switch (band) {
      case 'LOW': return 'red';
      case 'MEDIUM': return 'yellow';
      case 'HIGH': return 'green';
    }
  }

  /**
   * Label de banda en español
   */
  private getBandLabel(band: SignalBand): string {
    switch (band) {
      case 'LOW': return 'Bajo';
      case 'MEDIUM': return 'Medio';
      case 'HIGH': return 'Alto';
    }
  }

  /**
   * Determina comparación entre equipos
   */
  private getComparison(
    homeValue?: number,
    awayValue?: number,
  ): 'home' | 'balanced' | 'away' | undefined {
    if (homeValue === undefined || awayValue === undefined) {
      return undefined;
    }

    const diff = Math.abs(homeValue - awayValue);
    if (diff < 10) return 'balanced';
    return homeValue > awayValue ? 'home' : 'away';
  }

  /**
   * Label de categoría en español
   */
  private getCategoryLabel(category: string): string {
    switch (category) {
      case 'persistence': return 'Persistencia';
      case 'resolution': return 'Resolución';
      case 'environment': return 'Ambiente';
      case 'volatility': return 'Volatilidad';
      case 'timing': return 'Timing';
      default: return 'General';
    }
  }

  /**
   * Nivel de confianza simplificado
   */
  private getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence < 0.5) return 'low';
    if (confidence < 0.75) return 'medium';
    return 'high';
  }
}
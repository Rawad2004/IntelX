/**
 * Behavioral Analysis DTOs
 * 
 * DTOs para las respuestas del análisis comportamental IntelX.
 * Estructurados para el frontend.
 * 
 * Ubicación: src/footystats/api/dto/behavioral-analysis.dto.ts
 */

/**
 * Estado del análisis para el frontend
 */
export type BehavioralStatusDTO = 'pending' | 'ready' | 'error';

/**
 * CBW Display DTO
 */
export interface CBWDTO {
  state: 'narrow' | 'medium' | 'wide';
  label: string;           // "Alta Confianza", "Confianza Moderada", "Baja Confianza"
  color: 'green' | 'yellow' | 'red';
  confidence: number;      // 0-100
  reasons: string[];
}

/**
 * Señal dominante para display
 */
export interface DominantSignalDTO {
  id: string;
  name: string;
  band: 'LOW' | 'MEDIUM' | 'HIGH';
  bandLabel: string;       // "Bajo", "Medio", "Alto"
  bandColor: 'blue' | 'yellow' | 'red';
  explanation: string;
}

/**
 * Factores estructurales
 */
export interface StructuralFactorsDTO {
  pressure: {
    label: string;         // "Presión"
    description: string;   // "Local domina (65 DA/partido vs 42)"
    direction: 'home' | 'away' | 'balanced';
  };
  resolution: {
    label: string;         // "Resolución"
    description: string;   // "Visitante eficiente en contraataque"
  };
  leagueContext: {
    label: string;         // "Contexto Liga"
    description: string;   // "Alta en goles (2.9 avg)"
  };
}

/**
 * Respuesta cuando el análisis está PENDIENTE
 */
export interface BehavioralPendingDTO {
  status: 'pending';
  matchId: number;
  
  // Razón del pending
  reason: {
    code: 'waiting_lineups' | 'waiting_scheduled' | 'insufficient_data' | 'match_too_far';
    message: string;
    estimatedAt: string | null;  // ISO date cuando estará disponible
  };
  
  // Qué datos ya están disponibles
  availableData: {
    teamStats: boolean;
    h2h: boolean;
    leagueContext: boolean;
    signals: boolean;
    lineups: boolean;
    referee: boolean;
  };
  
  // Mensaje para el usuario
  userMessage: string;
}

/**
 * Respuesta cuando el análisis está LISTO
 */
export interface BehavioralReadyDTO {
  status: 'ready';
  matchId: number;
  
  // CBW Governance (siempre visible, autoridad suprema)
  cbw: CBWDTO;
  
  // Envelope comportamental (narrativa principal)
  envelope: {
    text: string;
    summary: string;       // Versión corta para cards
  };
  
  // Señales dominantes (las que más impactan)
  dominantSignals: DominantSignalDTO[];
  
  // Factores estructurales
  structuralFactors: StructuralFactorsDTO;
  
  // Contradicciones detectadas
  contradictions: {
    hasContradictions: boolean;
    items: string[];
  };
  
  // Risk flags
  riskFlags: {
    count: number;
    items: Array<{
      type: 'warning' | 'info';
      icon: string;
      message: string;
    }>;
  };
  
  // Nota de governance (disclaimer)
  governanceNote: string;
  
  // Metadata
  meta: {
    analyzedAt: string;
    hasLineups: boolean;
    hasReferee: boolean;
    dataQuality: 'high' | 'medium' | 'low';
    dataQualityLabel: string;
    expiresAt: string;
  };
}

/**
 * Respuesta cuando hay ERROR
 */
export interface BehavioralErrorDTO {
  status: 'error';
  matchId: number;
  error: {
    code: string;
    message: string;
  };
  // Aún mostramos datos básicos si están disponibles
  fallback: {
    hasSignals: boolean;
    signalsUrl: string;    // URL para obtener señales calculadas
  };
}

/**
 * Respuesta unificada del endpoint /behavioral
 */
export type BehavioralAnalysisResponseDTO = 
  | BehavioralPendingDTO 
  | BehavioralReadyDTO 
  | BehavioralErrorDTO;

/**
 * Helper functions para construir DTOs
 */
export class BehavioralDTOBuilder {
  
  static buildPending(
    matchId: number,
    reasonCode: BehavioralPendingDTO['reason']['code'],
    matchDate: Date | null,
    availableData: BehavioralPendingDTO['availableData'],
  ): BehavioralPendingDTO {
    
    const messages: Record<BehavioralPendingDTO['reason']['code'], string> = {
      waiting_lineups: 'Esperando confirmación de alineaciones',
      waiting_scheduled: 'Análisis programado',
      insufficient_data: 'Datos insuficientes para análisis',
      match_too_far: 'El partido está muy lejos para analizar',
    };

    const userMessages: Record<BehavioralPendingDTO['reason']['code'], string> = {
      waiting_lineups: 'El análisis comportamental completo estará disponible cuando se confirmen las alineaciones del partido. IntelX requiere información estructural completa para generar un envelope comportamental confiable.',
      waiting_scheduled: 'El análisis está programado y se generará pronto.',
      insufficient_data: 'No hay suficientes datos históricos para generar un análisis confiable.',
      match_too_far: 'El análisis se generará más cerca de la fecha del partido.',
    };

    // Estimar cuándo estará disponible (1h antes del partido si esperamos lineups)
    let estimatedAt: string | null = null;
    if (matchDate && reasonCode === 'waiting_lineups') {
      const estimated = new Date(matchDate.getTime() - 60 * 60 * 1000); // 1h antes
      if (estimated > new Date()) {
        estimatedAt = estimated.toISOString();
      }
    }

    return {
      status: 'pending',
      matchId,
      reason: {
        code: reasonCode,
        message: messages[reasonCode],
        estimatedAt,
      },
      availableData,
      userMessage: userMessages[reasonCode],
    };
  }

  static buildReady(
    matchId: number,
    analysis: any,
    meta: BehavioralReadyDTO['meta'],
  ): BehavioralReadyDTO {
    
    const cbwLabels: Record<string, { label: string; color: 'green' | 'yellow' | 'red' }> = {
      narrow: { label: 'Alta Confianza', color: 'green' },
      medium: { label: 'Confianza Moderada', color: 'yellow' },
      wide: { label: 'Baja Confianza', color: 'red' },
    };

    const bandLabels: Record<string, { label: string; color: 'blue' | 'yellow' | 'red' }> = {
      LOW: { label: 'Bajo', color: 'blue' },
      MEDIUM: { label: 'Medio', color: 'yellow' },
      HIGH: { label: 'Alto', color: 'red' },
    };

    const dataQualityLabels: Record<string, string> = {
      high: 'Excelente',
      medium: 'Buena',
      low: 'Limitada',
    };

    return {
      status: 'ready',
      matchId,
      cbw: {
        state: analysis.cbw.state,
        label: cbwLabels[analysis.cbw.state]?.label || 'Desconocido',
        color: cbwLabels[analysis.cbw.state]?.color || 'yellow',
        confidence: analysis.cbw.confidence,
        reasons: analysis.cbw.reasons || [],
      },
      envelope: {
        text: analysis.envelope,
        summary: analysis.envelope?.substring(0, 150) + '...' || '',
      },
      dominantSignals: (analysis.dominantSignals || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        band: s.band,
        bandLabel: bandLabels[s.band]?.label || s.band,
        bandColor: bandLabels[s.band]?.color || 'yellow',
        explanation: s.explanation,
      })),
      structuralFactors: {
        pressure: {
          label: 'Presión',
          description: analysis.structuralFactors?.pressure || 'No disponible',
          direction: analysis.structuralFactors?.pressureDirection || 'balanced',
        },
        resolution: {
          label: 'Resolución',
          description: analysis.structuralFactors?.resolution || 'No disponible',
        },
        leagueContext: {
          label: 'Contexto Liga',
          description: analysis.structuralFactors?.leagueContext || 'No disponible',
        },
      },
      contradictions: {
        hasContradictions: (analysis.contradictions || []).length > 0,
        items: analysis.contradictions || [],
      },
      riskFlags: {
        count: (analysis.riskFlags || []).length,
        items: (analysis.riskFlags || []).map((flag: string) => ({
          type: 'warning' as const,
          icon: 'alert-triangle',
          message: flag,
        })),
      },
      governanceNote: analysis.governanceNote || 
        'CBW indica el nivel de confianza del análisis estructural. IntelX no predice resultados; este es un mapa comportamental basado en datos históricos y tendencias.',
      meta: {
        ...meta,
        dataQualityLabel: dataQualityLabels[meta.dataQuality] || 'Desconocida',
      },
    };
  }

  static buildError(matchId: number, code: string, message: string): BehavioralErrorDTO {
    return {
      status: 'error',
      matchId,
      error: { code, message },
      fallback: {
        hasSignals: true,
        signalsUrl: `/api/v1/analysis/${matchId}/signals/v2`,
      },
    };
  }
}

/**
 * Analysis Orchestrator v2
 * 
 * Servicio que orquesta el flujo de análisis v2 con datos agregados.
 * Funciona en paralelo al sistema v1 existente.
 * 
 * Ubicación: src/footystats/services/analysis.orchestrator.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { MatchDataAggregator } from './match-data.aggregator';
import { IntelXObjectBuilder, IntelXMatchObject } from './intelx-object.builder';
import { SignalCalculatorService } from '../signals/signal-calculator.service';
import { FootyAiService } from '../ai/footy-ai.service';

/**
 * Tipos internos para v2 (no conflictan con @shared/types)
 */
interface AggregatedMatchDataV2 {
  meta: {
    matchId: number;
    hasLineups: boolean;
    hasReferee: boolean;
    dataQuality: 'high' | 'medium' | 'low';
    aggregatedAt: string;
  };
  match: any;
  homeForm: any;
  awayForm: any;
  leagueStats: any;
  referee: any | null;
  h2h: any;
  trends: any;
  lineups: any | null;
  odds: any;
}

interface CBWStateV2 {
  state: 'narrow' | 'medium' | 'wide';
  confidence: number;
  reasons: string[];
}

interface SignalsV2Result {
  [key: string]: any;
}

/**
 * Respuesta del análisis v2
 */
export interface FullAnalysisResponse {
  success: boolean;
  data: {
    matchId: number;
    match: IntelXMatchObject['match'];
    analysis: any;
    signals: SignalsV2Result;
    cbw: CBWStateV2;
    meta: {
      dataQuality: string;
      hasLineups: boolean;
      processingTime: number;
      cached: boolean;
    };
  } | null;
  error?: string;
}

@Injectable()
export class AnalysisOrchestrator {
  private readonly logger = new Logger(AnalysisOrchestrator.name);

  // Cache simple en memoria
  private cache = new Map<string, { data: FullAnalysisResponse; expiry: number }>();

  // TTLs según estado del partido
  private readonly TTL_WITH_LINEUPS = 30 * 60 * 1000;    // 30 min
  private readonly TTL_WITHOUT_LINEUPS = 15 * 60 * 1000; // 15 min
  private readonly TTL_COMPLETED = 24 * 60 * 60 * 1000;  // 24h

  constructor(
    private readonly aggregator: MatchDataAggregator,
    private readonly signalCalculator: SignalCalculatorService,
    private readonly objectBuilder: IntelXObjectBuilder,
    private readonly aiService: FootyAiService,
  ) {}

  /**
   * Ejecuta el análisis v2 completo de un partido
   */
  async analyze(matchId: number, forceRefresh: boolean = false): Promise<FullAnalysisResponse> {
    const startTime = Date.now();
    this.logger.log(`Starting v2 analysis for match ${matchId} (forceRefresh: ${forceRefresh})`);

    try {
      const cacheKey = `analysis_v2:${matchId}`;
      
      if (!forceRefresh) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.logger.log(`Returning cached v2 analysis for match ${matchId}`);
          return {
            ...cached,
            data: cached.data ? {
              ...cached.data,
              meta: { ...cached.data.meta, cached: true },
            } : null,
          };
        }
      }

      // PASO 1: Agregar todos los datos
      this.logger.debug('Step 1: Aggregating data...');
      const aggregatedData = await this.aggregator.aggregate(matchId);

      // PASO 2: Calcular señales v2
      this.logger.debug('Step 2: Calculating signals v2...');
      const signals = this.signalCalculator.calculateV2(aggregatedData as AggregatedMatchDataV2);
      const cbw = this.signalCalculator.calculateCBW_v2(aggregatedData as AggregatedMatchDataV2, signals);

      // PASO 3: Construir IntelX Object
      this.logger.debug('Step 3: Building IntelX Object...');
      const matchObject = this.objectBuilder.build(aggregatedData as any, signals, cbw);

      // PASO 4: Generar análisis con IA (v2)
      this.logger.debug('Step 4: Generating AI analysis v2...');
      let analysis: any;
      try {
        analysis = await this.aiService.analyzeMatchV2(matchObject);
      } catch (aiError) {
        this.logger.warn(`AI v2 analysis failed, using fallback: ${aiError.message}`);
        analysis = this.generateFallbackAnalysis(matchId, signals, cbw);
      }

      // Construir respuesta
      const processingTime = Date.now() - startTime;
      const response: FullAnalysisResponse = {
        success: true,
        data: {
          matchId,
          match: matchObject.match,
          analysis,
          signals,
          cbw,
          meta: {
            dataQuality: aggregatedData.meta.dataQuality,
            hasLineups: aggregatedData.meta.hasLineups,
            processingTime,
            cached: false,
          },
        },
      };

      // PASO 5: Cachear resultado
      const ttl = this.determineTTL(aggregatedData);
      this.setCache(cacheKey, response, ttl);
      this.logger.log(`V2 analysis completed in ${processingTime}ms (cached for ${ttl/1000}s)`);

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`V2 analysis failed after ${processingTime}ms: ${error.message}`);
      
      return {
        success: false,
        data: null,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene solo los datos agregados (sin IA)
   */
  async getAggregatedData(matchId: number): Promise<AggregatedMatchDataV2> {
    return this.aggregator.aggregate(matchId) as Promise<AggregatedMatchDataV2>;
  }

  /**
   * Obtiene solo las señales v2 calculadas (sin IA)
   */
  async getSignals(matchId: number): Promise<{ signals: SignalsV2Result; cbw: CBWStateV2 }> {
    const data = await this.aggregator.aggregate(matchId);
    const signals = this.signalCalculator.calculateV2(data as AggregatedMatchDataV2);
    const cbw = this.signalCalculator.calculateCBW_v2(data as AggregatedMatchDataV2, signals);
    return { signals, cbw };
  }

  /**
   * Obtiene el IntelX Object completo (sin IA)
   */
  async getMatchObject(matchId: number): Promise<IntelXMatchObject> {
    const data = await this.aggregator.aggregate(matchId);
    const signals = this.signalCalculator.calculateV2(data as AggregatedMatchDataV2);
    const cbw = this.signalCalculator.calculateCBW_v2(data as AggregatedMatchDataV2, signals);
    return this.objectBuilder.build(data as any, signals, cbw);
  }

  /**
   * Genera análisis fallback si la IA falla
   */
  private generateFallbackAnalysis(matchId: number, signals: any, cbw: CBWStateV2): any {
    return {
      matchId,
      summary: {
        headline: 'Analysis generated with limited AI',
        verdict: 'AI analysis unavailable, using signal-based summary',
        confidence: 'low',
      },
      markets: {
        over25: { market: 'Over 2.5', recommendation: 'avoid', confidence: 0, reasoning: 'AI unavailable', value: 'unknown' },
        btts: { market: 'BTTS', recommendation: 'avoid', confidence: 0, reasoning: 'AI unavailable', value: 'unknown' },
        result: { market: '1X2', recommendation: 'avoid', confidence: 0, reasoning: 'AI unavailable', value: 'unknown' },
        corners: { market: 'Corners', recommendation: 'avoid', confidence: 0, reasoning: 'AI unavailable', value: 'unknown' },
        cards: { market: 'Cards', recommendation: 'avoid', confidence: 0, reasoning: 'AI unavailable', value: 'unknown' },
      },
      keyFactors: { positive: [], negative: ['AI analysis failed'], neutral: [] },
      signals: { dominant: [], alerts: ['AI service unavailable'] },
      narrative: 'Unable to generate AI narrative. Analysis based on calculated signals only.',
      recommendations: {
        primary: { market: 'None', pick: 'No recommendation', confidence: 0, reasoning: 'AI unavailable' },
        secondary: null,
        avoid: ['All markets due to AI failure'],
      },
      disclaimers: ['AI analysis unavailable', 'Results based on signals only'],
      generatedAt: new Date().toISOString(),
      model: 'fallback',
      tokens: 0,
    };
  }

  /**
   * Determina el TTL basado en el estado del partido
   */
  private determineTTL(data: AggregatedMatchDataV2): number {
    const status = data.match?.status;
    
    if (status === 'complete') {
      return this.TTL_COMPLETED;
    }
    
    if (data.meta.hasLineups) {
      return this.TTL_WITH_LINEUPS;
    }
    
    return this.TTL_WITHOUT_LINEUPS;
  }

  /**
   * Cache helpers
   */
  private getFromCache(key: string): FullAnalysisResponse | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: FullAnalysisResponse, ttlMs: number): void {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  /**
   * Limpia el cache
   */
  clearCache(): void {
    this.cache.clear();
    this.aggregator.clearCache();
    this.logger.log('All v2 caches cleared');
  }

  /**
   * Estadísticas del cache
   */
  getCacheStats(): { analysisCache: number; aggregatorCache: any } {
    return {
      analysisCache: this.cache.size,
      aggregatorCache: this.aggregator.getCacheStats(),
    };
  }
}
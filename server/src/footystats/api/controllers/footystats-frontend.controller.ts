/**
 * FootyStats Frontend Controller
 *
 * Controller optimizado para el frontend del dashboard.
 * Implementa exactamente la estructura de respuesta que espera el cliente.
 *
 * Endpoints:
 * - GET  /api/footystats/matches
 * - GET  /api/footystats/matches/:id/intel
 * - GET  /api/footystats/matches/:id/analysis
 * - POST /api/footystats/matches/:id/analysis/enqueue
 * - GET  /api/footystats/leagues
 *
 * Ubicación: src/footystats/api/controllers/footystats-frontend.controller.ts
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';

import { FootystatsService } from '../../footystats.service';
import { FootyStoreService } from '../../footy-store.service';
import { BehavioralAnalysisService } from '../../services/behavioral-analysis.service'; // ✅ NUEVO
import { getBogotaDateKey } from '../../utils/footy-date.util';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS PARA RESPUESTAS
// ═══════════════════════════════════════════════════════════════════════════

interface MatchesResponse {
  ok: boolean;
  tab: string;
  count: number;
  source: 'db' | 'provider';
  snapshotAgeSec: number | null;
  ttlSec: number;
  dateKey: string;
  items: any[];
}

interface IntelResponse {
  ok: boolean;
  matchId: number;
  hasLineups: boolean;
  intelx: any;
}

interface AnalysisResponse {
  ok: boolean;
  matchId: number;
  status: 'DONE' | 'PENDING' | 'MISSING' | 'ERROR';
  analyzedAt: string | null;
  error: string | null;
  analysis: any | null;
}

interface EnqueueResponse {
  ok: boolean;
  matchId: number;
  status: 'PENDING';
}

interface LeaguesResponse {
  ok: boolean;
  data: any[];
  meta: { count: number };
}

@ApiTags('FootyStats Frontend')
@Controller('api/footystats')
export class FootystatsFrontendController {
  private readonly logger = new Logger(FootystatsFrontendController.name);

  constructor(
    private readonly footystatsService: FootystatsService,
    private readonly storeService: FootyStoreService,
    private readonly behavioralService: BehavioralAnalysisService, // ✅ NUEVO
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1️⃣ GET /api/footystats/matches
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('matches')
  @ApiOperation({
    summary: 'Get matches list for dashboard',
    description:
      'Returns matches filtered by tab with full payload for frontend rendering',
  })
  @ApiQuery({
    name: 'tab',
    required: false,
    enum: ['all', 'live', 'upcoming', 'finished'],
    description: 'Filter by match state',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force refresh from provider (bypass cache)',
  })
  @SwaggerResponse({ status: 200, description: 'Matches list' })
  async getMatches(
    @Query('tab') tab?: string,
    @Query('force') force?: string,
  ): Promise<MatchesResponse> {
    try {
      const selectedTab = tab || 'all';
      const forceRefresh = force === 'true';

      this.logger.log(
        `Frontend matches request: tab=${selectedTab}, force=${forceRefresh}`,
      );

      // Usar el método existente de FootystatsService
      const result = await this.footystatsService.getMatches({
        tab: selectedTab,
        force: forceRefresh,
      });

      // Transformar items al formato esperado por el frontend
      const items = (result.items || []).map((item: any) =>
        this.transformMatchForFrontend(item),
      );

      return {
        ok: true,
        tab: result.tab || selectedTab,
        count: items.length,
        source: result.source || 'db',
        snapshotAgeSec: result.snapshotAgeSec ?? null,
        ttlSec: result.ttlSec || 600,
        dateKey: result.dateKey || getBogotaDateKey(),
        items,
      };
    } catch (error: any) {
      this.logger.error(`Error getting matches: ${error.message}`);
      return {
        ok: false,
        tab: tab || 'all',
        count: 0,
        source: 'db',
        snapshotAgeSec: null,
        ttlSec: 600,
        dateKey: getBogotaDateKey(),
        items: [],
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2️⃣ GET /api/footystats/matches/:id/intel
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('matches/:id/intel')
  @ApiOperation({
    summary: 'Get IntelX pre-game intelligence',
    description: 'Returns IntelX behavioral intelligence for a specific match',
  })
  @ApiParam({ name: 'id', example: '579101', description: 'Match ID' })
  @SwaggerResponse({ status: 200, description: 'IntelX intelligence' })
  async getMatchIntel(
    @Param('id', ParseIntPipe) matchId: number,
  ): Promise<IntelResponse> {
    try {
      this.logger.log(`Frontend intel request: matchId=${matchId}`);

      // Usar el método existente
      const result = await this.footystatsService.getMatchIntel(matchId);

      if (!result.ok) {
        return {
          ok: false,
          matchId,
          hasLineups: false,
          intelx: this.buildEmptyIntelx(),
        };
      }

      return {
        ok: true,
        matchId,
        hasLineups: result.hasLineups || false,
        intelx: result.intelx || this.buildEmptyIntelx(),
      };
    } catch (error: any) {
      this.logger.error(
        `Error getting intel for match ${matchId}: ${error.message}`,
      );
      return {
        ok: false,
        matchId,
        hasLineups: false,
        intelx: this.buildEmptyIntelx(),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3️⃣ GET /api/footystats/matches/:id/analysis - ✅ MODIFICADO
  // ═══════════════════════════════════════════════════════════════════════════

  // En footystats-frontend.controller.ts

  // ═══════════════════════════════════════════════════════════════════════════
  // 3️⃣ GET /api/footystats/matches/:id/analysis - ✅ MODIFICADO PARA AUTO-GENERAR
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // 3️⃣ GET /api/footystats/matches/:id/analysis - ✅ CORREGIDO
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('matches/:id/analysis')
  @ApiOperation({
    summary: 'Get AI analysis for a match',
    description:
      'Returns the AI-generated behavioral analysis. Generates automatically if not exists.',
  })
  @ApiParam({ name: 'id', example: '579101', description: 'Match ID' })
  @SwaggerResponse({ status: 200, description: 'Analysis result' })
  async getMatchAnalysis(
    @Param('id', ParseIntPipe) matchId: number,
  ): Promise<any> {
    try {
      this.logger.log(`Frontend analysis request: matchId=${matchId}`);

      // 1. Primero intentar obtener análisis existente
      let result = await this.behavioralService.getAnalysis(matchId);

      // 2. Si no está listo (pending/processing), generar automáticamente
      if (result.status !== 'ready') {
        this.logger.log(
          `Analysis not ready for match ${matchId} (status: ${result.status}), generating...`,
        );
        result = await this.behavioralService.generateAnalysis(matchId, false);
      }

      // 3. Si está listo, devolver en el formato que espera el frontend
      if (result.status === 'ready') {
        return {
          success: true,
          data: result, // ✅ Devolver todo el objeto result directamente
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }

      // 4. Si sigue pending o error
      return {
        success: false,
        data: {
          status: result.status,
          matchId,
          error: (result as any).error?.message || 'Analysis not available',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error getting analysis for match ${matchId}: ${error.message}`,
      );
      return {
        success: false,
        data: {
          status: 'error',
          matchId,
          error: error.message,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4️⃣ POST /api/footystats/matches/:id/analysis/enqueue - ✅ MODIFICADO
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('matches/:id/analysis/enqueue')
  @ApiOperation({
    summary: 'Generate analysis for a match',
    description: 'Triggers behavioral analysis generation',
  })
  @ApiParam({ name: 'id', example: '579101', description: 'Match ID' })
  @SwaggerResponse({ status: 200, description: 'Generation result' })
  async enqueueAnalysis(
    @Param('id', ParseIntPipe) matchId: number,
  ): Promise<EnqueueResponse> {
    try {
      this.logger.log(`Frontend enqueue/generate request: matchId=${matchId}`);

      // ✅ CAMBIAR: Usar behavioral service para generar
      await this.behavioralService.generateAnalysis(matchId, false);

      return {
        ok: true,
        matchId,
        status: 'PENDING',
      };
    } catch (error: any) {
      this.logger.error(
        `Error generating analysis for match ${matchId}: ${error.message}`,
      );
      return {
        ok: false,
        matchId,
        status: 'PENDING',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5️⃣ GET /api/footystats/leagues
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('leagues')
  @ApiOperation({
    summary: 'Get available leagues for filter',
    description: 'Returns list of leagues extracted from today matches',
  })
  @SwaggerResponse({ status: 200, description: 'Leagues list' })
  async getLeagues(): Promise<LeaguesResponse> {
    try {
      this.logger.log('Frontend leagues request');

      // Obtener partidos del día para extraer ligas únicas
      const dateKey = getBogotaDateKey();
      const matches = await this.storeService.getDailyMatches({
        dateKey,
        tab: 'all',
      });

      // Extraer ligas únicas
      const leaguesMap = new Map<number, any>();

      for (const match of matches) {
        const compId = match.competition_id || match.competitionId;
        if (compId && !leaguesMap.has(compId)) {
          leaguesMap.set(compId, {
            id: compId,
            name:
              match.competition_name || match.competition?.name || 'Unknown',
            country: match.country || match.competition?.country || null,
            image: match.competition_image || null,
            season: match.season || null,
          });
        }
      }

      const leagues = Array.from(leaguesMap.values()).sort((a, b) =>
        (a.name || '').localeCompare(b.name || ''),
      );

      return {
        ok: true,
        data: leagues,
        meta: { count: leagues.length },
      };
    } catch (error: any) {
      this.logger.error(`Error getting leagues: ${error.message}`);
      return {
        ok: false,
        data: [],
        meta: { count: 0 },
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Transforma un match al formato esperado por el frontend
   */
  private transformMatchForFrontend(item: any): any {
    const matchId = item.id || item.matchId;
    const competitionId = item.competitionId || item.competition_id;
    const kickoffUnix = item.kickoffUnix || item.date_unix;
    const statusRaw = item.statusRaw || item.status;
    const state = item.state || this.inferState(item);

    return {
      id: matchId,
      competitionId,
      kickoffUnix,
      statusRaw,
      state,
      home: {
        id: item.home?.id || item.homeID,
        name: item.home?.name || item.home_name,
      },
      away: {
        id: item.away?.id || item.awayID,
        name: item.away?.name || item.away_name,
      },
      payload: this.buildPayload(item),
    };
  }

  /**
   * Construye el payload completo para el frontend
   */
  private buildPayload(item: any): any {
    const prematch = item.prematch || item.preMatch || {};

    return {
      id: item.id || item.matchId,
      competition_id: item.competitionId || item.competition_id,
      competition_name:
        item.competition_name || item.payload?.competition_name || null,
      competition_image:
        item.competition_image || item.payload?.competition_image || null,
      country: item.country || item.payload?.country || null,

      home_name: item.home?.name || item.home_name,
      away_name: item.away?.name || item.away_name,

      // Las imágenes ya vienen como URLs completas desde FootyStats
      home_image: item.home_image || item.payload?.home_image || null,
      away_image: item.away_image || item.payload?.away_image || null,

      homeGoalCount: item.homeGoalCount ?? item.score?.home ?? 0,
      awayGoalCount: item.awayGoalCount ?? item.score?.away ?? 0,
      totalGoalCount: item.totalGoalCount ?? item.score?.total ?? 0,

      date_unix: item.kickoffUnix || item.date_unix,
      status: item.statusRaw || item.status,

      // Pre-match metrics
      pre_match_home_ppg: prematch.homePpg ?? item.pre_match_home_ppg ?? null,
      pre_match_away_ppg: prematch.awayPpg ?? item.pre_match_away_ppg ?? null,
      team_a_xg_prematch: prematch.xgHome ?? item.team_a_xg_prematch ?? null,
      team_b_xg_prematch: prematch.xgAway ?? item.team_b_xg_prematch ?? null,
      total_xg_prematch: prematch.xgTotal ?? item.total_xg_prematch ?? null,
      btts_potential: prematch.bttsPotential ?? item.btts_potential ?? null,
      corners_potential:
        prematch.cornersPotential ?? item.corners_potential ?? null,
      cards_potential: prematch.cardsPotential ?? item.cards_potential ?? null,
      offsides_potential:
        prematch.offsidesPotential ?? item.offsides_potential ?? null,
    };
  }

  /**
   * Infiere el estado del partido
   */
  private inferState(item: any): 'scheduled' | 'live' | 'finished' | 'unknown' {
    const status = String(item.status || item.statusRaw || '').toLowerCase();

    if (status.includes('live') || status.includes('inplay')) return 'live';
    if (status.includes('complete') || status.includes('finished'))
      return 'finished';
    if (status.includes('incomplete') || status.includes('scheduled'))
      return 'scheduled';

    // Inferir por kickoff
    const kickoff = item.kickoffUnix || item.date_unix;
    if (kickoff) {
      const now = Math.floor(Date.now() / 1000);
      if (kickoff > now + 120) return 'scheduled';
      if (kickoff < now - 7200) return 'finished'; // 2 horas después
    }

    return 'unknown';
  }

  /**
   * Construye un objeto intelx vacío
   */
  private buildEmptyIntelx(): any {
    return {
      context: {
        kickoffUnix: null,
        state: null,
        competitionId: null,
      },
      baseline: {
        ppg: { home: null, away: null },
        xg: { home: null, away: null, total: null },
      },
      expectations: {
        goalsRange: 'insufficient data',
        bttsPotential: 'n/a',
        cornersRange: 'insufficient data',
        cardsRange: 'insufficient data',
        offsidesRange: 'insufficient data',
      },
      confidence: {
        stability: 'low',
        signalQuality: 0,
        note: 'No data available',
      },
      education: {
        takeaway:
          'Pre-game intelligence estimates how a match may behave without predicting outcomes.',
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ NUEVO: Transforma behavioral data al formato frontend
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Transforma el análisis behavioral al formato esperado por el frontend
   */
  private transformBehavioralToFrontend(data: any): any {
    if (!data) return null;

    return {
      // El texto principal del análisis
      summary: data.envelope || data.narrative || '',

      // CBW (Confidence Band Width)
      cbw: data.cbw || { state: 'medium', confidence: 50 },

      // Señales dominantes
      signals: data.dominantSignals || [],

      // Factores estructurales
      structuralFactors: data.structuralFactors || {},

      // Contradicciones detectadas
      contradictions: data.contradictions || [],

      // Banderas de riesgo
      riskFlags: data.riskFlags || [],

      // Nota de gobernanza
      governanceNote: data.governanceNote || '',

      // Info del modelo
      model: data.model || {},

      // Formato legacy para compatibilidad
      keyFactors: [
        ...(data.dominantSignals?.map((s: any) => s.explanation) || []),
        ...(data.contradictions || []),
      ].slice(0, 5),

      predictions: {
        likelyScore: null,
        goalsOver25: null,
        btts: null,
        homeWin: null,
        draw: null,
        awayWin: null,
      },
    };
  }

  /**
   * Transforma el análisis al formato esperado por el frontend (legacy - mantenido por compatibilidad)
   */
  private transformAnalysisForFrontend(analysis: any): any {
    if (!analysis) return null;

    // Si ya tiene el formato v2 del AI
    if (analysis.summary && analysis.markets) {
      return {
        summary: analysis.narrative || analysis.summary?.verdict || '',
        keyFactors: [
          ...(analysis.keyFactors?.positive || []),
          ...(analysis.keyFactors?.negative || []),
        ].slice(0, 5),
        predictions: {
          likelyScore: null, // No predicimos scores exactos
          goalsOver25: analysis.markets?.over25?.confidence || null,
          btts: analysis.markets?.btts?.confidence || null,
          homeWin: null,
          draw: null,
          awayWin: null,
        },
        signals: {
          homeForm: null,
          awayForm: null,
          h2hTrend: null,
          restAdvantage: null,
          motivationIndex: null,
        },
      };
    }

    // Si es el formato v1 del AI (con sections)
    if (analysis.sections) {
      return {
        summary:
          analysis.sections?.canonicalSummary || analysis.ui?.headline || '',
        keyFactors: analysis.ui?.bullets || [],
        predictions: {
          likelyScore: null,
          goalsOver25: null,
          btts: null,
          homeWin: null,
          draw: null,
          awayWin: null,
        },
        signals: this.extractSignalsFromV1(
          analysis.sections?.behavioralSignalStack,
        ),
      };
    }

    // Fallback: devolver tal cual
    return analysis;
  }

  /**
   * Extrae signals del formato v1
   */
  private extractSignalsFromV1(signalStack: any[]): any {
    if (!Array.isArray(signalStack)) {
      return {
        homeForm: null,
        awayForm: null,
        h2hTrend: null,
        restAdvantage: null,
        motivationIndex: null,
      };
    }

    const signals: Record<string, number | null> = {
      homeForm: null,
      awayForm: null,
      h2hTrend: null,
      restAdvantage: null,
      motivationIndex: null,
    };

    // Mapear strength a valor numérico
    const strengthToValue = (s: string): number => {
      switch (s) {
        case 'high':
          return 0.85;
        case 'medium':
          return 0.55;
        case 'low':
          return 0.25;
        default:
          return 0.5;
      }
    };

    for (const sig of signalStack) {
      const name = (sig.signal || '').toLowerCase();
      if (name.includes('form') && name.includes('home')) {
        signals.homeForm = strengthToValue(sig.strength);
      } else if (name.includes('form') && name.includes('away')) {
        signals.awayForm = strengthToValue(sig.strength);
      } else if (name.includes('h2h')) {
        signals.h2hTrend = strengthToValue(sig.strength);
      }
    }

    return signals;
  }
}

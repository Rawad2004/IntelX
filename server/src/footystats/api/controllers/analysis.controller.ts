/**
 * Analysis Controller v2 (Mejorado)
 *
 * Endpoints REST para análisis IntelX.
 * - Mantiene todos los endpoints existentes
 * - Agrega nuevos endpoints para análisis v2 con datos agregados
 *
 * Ubicación: src/footystats/api/controllers/analysis.controller.ts
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Logger,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';

import type { ApiResponse } from '../dto';
import { createSuccessResponse, createErrorResponse } from '../dto';
import { FootyAiService } from '../../ai/footy-ai.service';
import { MatchesService } from './matches.service';
import { CacheService, CacheTTL, CachePrefix } from '../../cache';
import { AnalysisOrchestrator } from '../../services/analysis.orchestrator';
import { BehavioralAnalysisService } from 'src/footystats/services/behavioral-analysis.service';
import { BehavioralAnalysisResponseDTO } from '../dto/behavioral-analysis.dto';

@ApiTags('Analysis')
@Controller('api/v1/analysis')
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);

  constructor(
    private readonly footyAiService: FootyAiService,
    private readonly matchesService: MatchesService,
    private readonly cacheService: CacheService,
    private readonly orchestrator: AnalysisOrchestrator,
    private readonly behavioralService: BehavioralAnalysisService
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVOS ENDPOINTS v2 (con datos agregados de múltiples fuentes)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/analysis/:matchId/full
   * Análisis completo v2 con datos agregados (H2H, Form, League, Referee)
   */
  @Get(':matchId/full')
  @ApiOperation({
    summary: 'Get full v2 analysis with aggregated data',
    description:
      'Returns complete IntelX v2 analysis with data from multiple endpoints',
  })
  @ApiParam({ name: 'matchId', example: '579101' })
  @ApiQuery({ name: 'refresh', required: false, type: Boolean })
  @SwaggerResponse({ status: 200, description: 'Full v2 analysis' })
  async getFullAnalysisV2(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Query('refresh') refresh?: string,
  ): Promise<ApiResponse<any>> {
    try {
      if (matchId <= 0) {
        throw new BadRequestException('Invalid match ID');
      }

      const forceRefresh = refresh === 'true';
      this.logger.log(
        `Full v2 analysis requested for match ${matchId} (refresh: ${forceRefresh})`,
      );

      const result = await this.orchestrator.analyze(matchId, forceRefresh);

      if (!result.success) {
        return createErrorResponse(
          'ANALYSIS_FAILED',
          result.error || 'Analysis failed',
        );
      }

      return createSuccessResponse(result.data);
    } catch (error) {
      this.logger.error(
        `Full v2 analysis error for match ${matchId}: ${error.message}`,
      );
      return createErrorResponse('ANALYSIS_ERROR', error.message);
    }
  }

  /**
   * GET /api/v1/analysis/:matchId/signals/v2
   * Señales v2 calculadas con datos agregados
   */
  @Get(':matchId/signals/v2')
  @ApiOperation({
    summary: 'Get v2 signals with aggregated data',
    description:
      'Returns calculated signals using data from multiple endpoints (no AI)',
  })
  @ApiParam({ name: 'matchId', example: '579101' })
  @SwaggerResponse({ status: 200, description: 'V2 Signals' })
  async getSignalsV2(
    @Param('matchId', ParseIntPipe) matchId: number,
  ): Promise<ApiResponse<any>> {
    try {
      if (matchId <= 0) {
        throw new BadRequestException('Invalid match ID');
      }

      this.logger.log(`V2 signals requested for match ${matchId}`);
      const result = await this.orchestrator.getSignals(matchId);

      return createSuccessResponse({
        matchId,
        signals: result.signals,
        cbw: result.cbw,
      });
    } catch (error) {
      this.logger.error(
        `V2 signals error for match ${matchId}: ${error.message}`,
      );
      return createErrorResponse('SIGNALS_ERROR', error.message);
    }
  }

  /**
   * GET /api/v1/analysis/:matchId/data
   * Datos agregados crudos (debugging)
   */
  @Get(':matchId/data')
  @ApiOperation({
    summary: 'Get aggregated raw data',
    description:
      'Returns raw data from all endpoints (match, form, league, referee)',
  })
  @ApiParam({ name: 'matchId', example: '579101' })
  @SwaggerResponse({ status: 200, description: 'Aggregated data' })
  async getAggregatedData(
    @Param('matchId', ParseIntPipe) matchId: number,
  ): Promise<ApiResponse<any>> {
    try {
      if (matchId <= 0) {
        throw new BadRequestException('Invalid match ID');
      }

      this.logger.log(`Aggregated data requested for match ${matchId}`);
      const result = await this.orchestrator.getAggregatedData(matchId);

      return createSuccessResponse({
        matchId,
        meta: result.meta,
        match: result.match,
        homeForm: result.homeForm,
        awayForm: result.awayForm,
        leagueStats: result.leagueStats,
        referee: result.referee,
        h2h: result.h2h,
        trends: result.trends,
        lineups: result.lineups,
      });
    } catch (error) {
      this.logger.error(
        `Aggregated data error for match ${matchId}: ${error.message}`,
      );
      return createErrorResponse('DATA_ERROR', error.message);
    }
  }

  /**
   * GET /api/v1/analysis/:matchId/object
   * IntelX Match Object completo (para debugging del prompt)
   */
  @Get(':matchId/object')
  @ApiOperation({
    summary: 'Get IntelX Match Object',
    description: 'Returns the complete structured object sent to AI',
  })
  @ApiParam({ name: 'matchId', example: '579101' })
  @SwaggerResponse({ status: 200, description: 'IntelX Match Object' })
  async getMatchObject(
    @Param('matchId', ParseIntPipe) matchId: number,
  ): Promise<ApiResponse<any>> {
    try {
      if (matchId <= 0) {
        throw new BadRequestException('Invalid match ID');
      }

      this.logger.log(`IntelX Object requested for match ${matchId}`);
      const result = await this.orchestrator.getMatchObject(matchId);

      return createSuccessResponse(result);
    } catch (error) {
      this.logger.error(`Object error for match ${matchId}: ${error.message}`);
      return createErrorResponse('OBJECT_ERROR', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENDPOINTS EXISTENTES (mantenidos sin cambios)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/analysis/:matchId
   * Obtiene análisis completo de IntelX para un partido (v1)
   */
  @Get(':matchId')
  @ApiOperation({
    summary: 'Get full IntelX analysis (v1)',
    description:
      'Returns complete behavioral analysis for a match including signals, CBW, and narrative',
  })
  @ApiParam({
    name: 'matchId',
    example: '579101',
    description: 'Match ID from FootyStats',
  })
  @ApiQuery({
    name: 'refresh',
    required: false,
    type: Boolean,
    description: 'Force refresh analysis (bypass cache)',
  })
  @SwaggerResponse({ status: 200, description: 'Complete analysis' })
  @SwaggerResponse({ status: 404, description: 'Match not found' })
  async getAnalysis(
    @Param('matchId') matchId: string,
    @Query('refresh') refresh?: boolean,
  ): Promise<ApiResponse<any>> {
    try {
      const id = parseInt(matchId, 10);

      if (isNaN(id)) {
        return createErrorResponse(
          'INVALID_MATCH_ID',
          'Match ID must be a number',
        );
      }

      const cacheKey = this.cacheService.makeKey(CachePrefix.ANALYSIS, id);

      // Check cache unless refresh requested
      if (!refresh) {
        const cached = this.cacheService.get<any>(cacheKey);
        if (cached) {
          this.logger.log(`Analysis cache HIT for match ${id}`);
          return createSuccessResponse({
            ...cached,
            _cache: {
              fromCache: true,
              ttlRemaining: this.cacheService.getTTL(cacheKey),
            },
          });
        }
      }

      this.logger.log(
        `Generating analysis for match: ${id} (refresh: ${refresh || false})`,
      );

      // Obtener datos del partido usando MatchesService (ya tiene cache)
      const matchData = await this.matchesService.getMatchById(id);

      if (!matchData) {
        return createErrorResponse('NOT_FOUND', `Match ${id} not found`);
      }

      // Construir input para AI
      const aiInput = {
        meta: {
          matchId: id,
          generatedAt: new Date().toISOString(),
        },
        match: {
          id: matchData.id,
          homeTeam: { name: matchData.home_name, id: matchData.homeID },
          awayTeam: { name: matchData.away_name, id: matchData.awayID },
          league: {
            name: matchData.competition?.name || 'Unknown',
            id: matchData.competition_id,
          },
          date: matchData.date_unix
            ? new Date(matchData.date_unix * 1000).toISOString()
            : new Date().toISOString(),
          status: matchData.status,
        },
        signals: [],
        cbw: {
          state: 'medium',
          confidence: 0.5,
          reasons: ['Analysis pending full integration'],
        },
        form: { home: {}, away: {}, hasContradiction: false },
        teamStats: {
          home: {
            xg: matchData.team_a_xg,
            possession: matchData.team_a_possession,
            shots: matchData.team_a_shots,
            shotsOnTarget: matchData.team_a_shotsOnTarget,
            corners: matchData.team_a_corners,
          },
          away: {
            xg: matchData.team_b_xg,
            possession: matchData.team_b_possession,
            shots: matchData.team_b_shots,
            shotsOnTarget: matchData.team_b_shotsOnTarget,
            corners: matchData.team_b_corners,
          },
        },
        odds: {
          home: matchData.odds_ft_1,
          draw: matchData.odds_ft_x,
          away: matchData.odds_ft_2,
          over25: matchData.odds_ft_over25,
          under25: matchData.odds_ft_under25,
          bttsYes: matchData.odds_btts_yes,
          bttsNo: matchData.odds_btts_no,
        },
      };

      // Generar análisis con AI
      const aiResult = await this.footyAiService.analyzeMatch(aiInput);

      const result = {
        matchId: id,
        match: {
          homeTeam: matchData.home_name,
          awayTeam: matchData.away_name,
          date: matchData.date_unix
            ? new Date(matchData.date_unix * 1000).toISOString()
            : null,
          status: matchData.status,
        },
        analysis: aiResult.analysis,
        model: aiResult.model,
        usage: aiResult.usage,
        _meta: {
          generatedAt: new Date().toISOString(),
          version: '1.0.0',
        },
        _cache: {
          fromCache: false,
        },
      };

      // Guardar en cache
      const ttl =
        matchData.status === 'incomplete'
          ? CacheTTL.MATCH_ANALYSIS
          : CacheTTL.MATCH_DATA;

      this.cacheService.set(cacheKey, result, ttl);
      this.logger.log(`Analysis cached for match ${id} (TTL: ${ttl / 1000}s)`);

      return createSuccessResponse(result);
    } catch (error) {
      this.logger.error(`Error getting analysis: ${error.message}`);
      return createErrorResponse(
        'ANALYSIS_ERROR',
        error.message || 'Failed to generate analysis',
      );
    }
  }

  /**
   * GET /api/v1/analysis/:matchId/signals
   * Obtiene solo las señales calculadas (v1)
   */
  @Get(':matchId/signals')
  @ApiOperation({
    summary: 'Get signals only (v1)',
    description: 'Returns only the behavioral signals for a match',
  })
  @ApiParam({ name: 'matchId', example: '579101' })
  @SwaggerResponse({ status: 200, description: 'Signal array' })
  async getSignals(
    @Param('matchId') matchId: string,
  ): Promise<ApiResponse<any[]>> {
    try {
      const id = parseInt(matchId, 10);

      if (isNaN(id)) {
        return createErrorResponse(
          'INVALID_MATCH_ID',
          'Match ID must be a number',
        );
      }

      const cacheKey = this.cacheService.makeKey(CachePrefix.SIGNALS, id);

      // Check cache
      const cached = this.cacheService.get<any[]>(cacheKey);
      if (cached) {
        return createSuccessResponse(cached, { count: cached.length });
      }

      this.logger.log(`Getting signals for match: ${id}`);

      // TODO: Integrar con SignalCalculatorService
      const signals: any[] = [];

      // Cache signals
      this.cacheService.set(cacheKey, signals, CacheTTL.SIGNALS);

      return createSuccessResponse(signals, { count: signals.length });
    } catch (error) {
      this.logger.error(`Error getting signals: ${error.message}`);
      return createErrorResponse(
        'SIGNALS_ERROR',
        error.message || 'Failed to calculate signals',
      );
    }
  }

  /**
   * GET /api/v1/analysis/:matchId/preview
   * Obtiene preview del análisis para mostrar en lista
   */
  @Get(':matchId/preview')
  @ApiOperation({
    summary: 'Get analysis preview',
    description: 'Returns a lightweight preview of the analysis for list views',
  })
  @ApiParam({ name: 'matchId', example: '579101' })
  @SwaggerResponse({ status: 200, description: 'Analysis preview' })
  async getPreview(
    @Param('matchId') matchId: string,
  ): Promise<ApiResponse<any>> {
    try {
      const id = parseInt(matchId, 10);

      if (isNaN(id)) {
        return createErrorResponse(
          'INVALID_MATCH_ID',
          'Match ID must be a number',
        );
      }

      const cacheKey = this.cacheService.makeKey(CachePrefix.PREVIEW, id);

      // Check cache
      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return createSuccessResponse({ ...cached, _fromCache: true });
      }

      this.logger.log(`Getting analysis preview for match: ${id}`);

      // Preview placeholder
      const preview = {
        matchId: id,
        cbw: 'medium',
        cbwColor: 'yellow',
        headline: 'Análisis disponible',
        riskFlagsCount: 0,
        _fromCache: false,
      };

      // Cache preview
      this.cacheService.set(cacheKey, preview, CacheTTL.MATCH_PREVIEW);

      return createSuccessResponse(preview);
    } catch (error) {
      this.logger.error(`Error getting preview: ${error.message}`);
      return createErrorResponse(
        'PREVIEW_ERROR',
        error.message || 'Failed to generate preview',
      );
    }
  }

  /**
   * POST /api/v1/analysis/batch
   * Obtiene previews para múltiples partidos
   */
  @Post('batch')
  @ApiOperation({
    summary: 'Get batch analysis previews',
    description: 'Returns previews for multiple matches at once (max 50)',
  })
  @ApiBody({
    description: 'Array of match IDs',
    schema: {
      type: 'object',
      properties: {
        matchIds: {
          type: 'array',
          items: { type: 'number' },
          example: [579101, 579102, 579103],
          maxItems: 50,
        },
      },
    },
  })
  @SwaggerResponse({ status: 200, description: 'Batch analysis results' })
  async getBatchPreviews(
    @Body() body: { matchIds: number[] },
  ): Promise<ApiResponse<any>> {
    try {
      const { matchIds } = body;

      if (!matchIds || !Array.isArray(matchIds)) {
        return createErrorResponse(
          'INVALID_REQUEST',
          'matchIds must be an array of numbers',
        );
      }

      if (matchIds.length > 50) {
        return createErrorResponse(
          'TOO_MANY_MATCHES',
          'Maximum 50 matches per batch request',
        );
      }

      this.logger.log(`Getting batch previews for ${matchIds.length} matches`);

      const analyses: Record<number, any> = {};
      const errors: Record<number, string> = {};
      let cacheHits = 0;

      for (const id of matchIds) {
        const cacheKey = this.cacheService.makeKey(CachePrefix.PREVIEW, id);
        const cached = this.cacheService.get<any>(cacheKey);

        if (cached) {
          analyses[id] = cached;
          cacheHits++;
        } else {
          const preview = {
            matchId: id,
            cbw: 'medium',
            cbwColor: 'yellow',
            headline: 'Análisis disponible',
            riskFlagsCount: 0,
          };
          analyses[id] = preview;
          this.cacheService.set(cacheKey, preview, CacheTTL.MATCH_PREVIEW);
        }
      }

      return createSuccessResponse(
        {
          analyses,
          errors,
          _cacheHits: cacheHits,
        },
        { count: matchIds.length },
      );
    } catch (error) {
      this.logger.error(`Error getting batch previews: ${error.message}`);
      return createErrorResponse(
        'BATCH_ERROR',
        error.message || 'Failed to generate batch previews',
      );
    }
  }

  /**
   * GET /api/v1/analysis/:matchId/cbw
   * Obtiene solo el CBW del partido
   */
  @Get(':matchId/cbw')
  @ApiOperation({
    summary: 'Get CBW only',
    description: 'Returns only the Confidence Band Width for a match',
  })
  @ApiParam({ name: 'matchId', example: '579101' })
  @SwaggerResponse({ status: 200, description: 'CBW result' })
  async getCBW(@Param('matchId') matchId: string): Promise<ApiResponse<any>> {
    try {
      const id = parseInt(matchId, 10);

      if (isNaN(id)) {
        return createErrorResponse(
          'INVALID_MATCH_ID',
          'Match ID must be a number',
        );
      }

      const cacheKey = this.cacheService.makeKey(CachePrefix.CBW, id);

      // Check cache
      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return createSuccessResponse({ ...cached, _fromCache: true });
      }

      this.logger.log(`Getting CBW for match: ${id}`);

      // Placeholder CBW
      const cbw = {
        state: 'medium',
        label: 'Confianza Moderada',
        color: 'yellow',
        confidence: 0.5,
        reasons: ['Pending full signal integration'],
        _fromCache: false,
      };

      // Cache CBW
      this.cacheService.set(cacheKey, cbw, CacheTTL.CBW);

      return createSuccessResponse(cbw);
    } catch (error) {
      this.logger.error(`Error getting CBW: ${error.message}`);
      return createErrorResponse(
        'CBW_ERROR',
        error.message || 'Failed to determine CBW',
      );
    }
  }

  /**
   * GET /api/v1/analysis/cache/stats
   * Obtiene estadísticas del cache (admin)
   */
  @Get('cache/stats')
  @ApiOperation({
    summary: 'Get cache statistics',
    description: 'Returns cache hit rate and size (admin endpoint)',
  })
  @SwaggerResponse({ status: 200, description: 'Cache stats' })
  async getCacheStats(): Promise<ApiResponse<any>> {
    const stats = this.cacheService.getStats();
    const orchestratorStats = this.orchestrator.getCacheStats();

    return createSuccessResponse({
      mainCache: stats,
      orchestratorCache: orchestratorStats,
    });
  }

  /**
   * GET /api/v1/analysis/cache/clear
   * Limpia todos los caches
   */
  @Get('cache/clear')
  @ApiOperation({
    summary: 'Clear all caches',
    description: 'Clears main cache and orchestrator cache',
  })
  @SwaggerResponse({ status: 200, description: 'Caches cleared' })
  async clearAllCaches(): Promise<ApiResponse<any>> {
    this.cacheService.clear();
    this.orchestrator.clearCache();
    this.logger.warn('All caches cleared by request');
    return createSuccessResponse({
      cleared: true,
      message: 'All caches cleared',
    });
  }

  @Get(':matchId/behavioral')
  @ApiOperation({
    summary: 'Get behavioral analysis',
    description:
      'Returns IntelX behavioral analysis. May return pending status if lineups not confirmed.',
  })
  @ApiParam({ name: 'matchId', example: '579101' })
  @SwaggerResponse({
    status: 200,
    description: 'Behavioral analysis or pending status',
  })
  async getBehavioralAnalysis(
    @Param('matchId', ParseIntPipe) matchId: number,
  ): Promise<ApiResponse<BehavioralAnalysisResponseDTO>> {
    try {
      if (matchId <= 0) {
        throw new BadRequestException('Invalid match ID');
      }

      this.logger.log(`Behavioral analysis requested for match ${matchId}`);
      const result = await this.behavioralService.getAnalysis(matchId);

      return createSuccessResponse(result);
    } catch (error) {
      this.logger.error(
        `Behavioral analysis error for match ${matchId}: ${error.message}`,
      );
      return createErrorResponse('BEHAVIORAL_ERROR', error.message);
    }
  }

  @Post(':matchId/behavioral/generate')
  @ApiOperation({
    summary: 'Generate behavioral analysis',
    description:
      'Forces generation of behavioral analysis. Requires lineups to be available.',
  })
  @ApiParam({ name: 'matchId', example: '579101' })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force regeneration even if exists',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Generated behavioral analysis',
  })
  async generateBehavioralAnalysis(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Query('force') force?: string,
  ): Promise<ApiResponse<BehavioralAnalysisResponseDTO>> {
    try {
      if (matchId <= 0) {
        throw new BadRequestException('Invalid match ID');
      }

      const forceRegenerate = force === 'true';
      this.logger.log(
        `Generating behavioral analysis for match ${matchId} (force: ${forceRegenerate})`,
      );

      const result = await this.behavioralService.generateAnalysis(
        matchId,
        forceRegenerate,
      );

      return createSuccessResponse(result);
    } catch (error) {
      this.logger.error(
        `Generate behavioral error for match ${matchId}: ${error.message}`,
      );
      return createErrorResponse('GENERATE_ERROR', error.message);
    }
  }
}

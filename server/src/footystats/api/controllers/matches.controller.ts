/**
 * Matches Controller
 * 
 * Controller para endpoints de partidos.
 * Ubicación: src/footystats/api/controllers/matches.controller.ts
 */

import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  Logger,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery, 
  ApiParam,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';

import { MatchesService } from './matches.service';
import type { ApiResponse } from '../dto';
import { createSuccessResponse, createErrorResponse } from '../dto';

@ApiTags('Matches')
@Controller('api/v1/matches')
export class MatchesController {
  private readonly logger = new Logger(MatchesController.name);

  constructor(
    private readonly matchesService: MatchesService,
  ) {}

  /**
   * GET /api/v1/matches/today
   */
  @Get('today')
  @ApiOperation({ 
    summary: 'Get today\'s matches',
    description: 'Returns all matches scheduled for today',
  })
  @ApiQuery({ 
    name: 'timezone', 
    required: false, 
    example: 'America/Bogota',
    description: 'Timezone for date calculation (TZ database name)',
  })
  @SwaggerResponse({ status: 200, description: 'List of matches' })
  async getTodayMatches(
    @Query('timezone') timezone?: string,
  ): Promise<ApiResponse<any[]>> {
    try {
      this.logger.log(`Getting today's matches (tz: ${timezone || 'UTC'})`);
      
      const matches = await this.matchesService.getTodayMatches(timezone);
      
      return createSuccessResponse(matches, {
        count: matches?.length || 0,
      });
    } catch (error) {
      this.logger.error(`Error getting today's matches: ${error.message}`);
      return createErrorResponse(
        'FETCH_ERROR',
        error.message || 'Failed to fetch today\'s matches',
      );
    }
  }

  /**
   * GET /api/v1/matches/date/:date
   */
  @Get('date/:date')
  @ApiOperation({ 
    summary: 'Get matches by date',
    description: 'Returns all matches for a specific date',
  })
  @ApiParam({ 
    name: 'date', 
    example: '2026-01-17',
    description: 'Date in YYYY-MM-DD format',
  })
  @ApiQuery({ 
    name: 'timezone', 
    required: false, 
    example: 'America/Bogota',
    description: 'Timezone (TZ database name)',
  })
  @SwaggerResponse({ status: 200, description: 'List of matches' })
  async getMatchesByDate(
    @Param('date') date: string,
    @Query('timezone') timezone?: string,
  ): Promise<ApiResponse<any[]>> {
    try {
      // Validar formato de fecha
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return createErrorResponse(
          'INVALID_DATE_FORMAT',
          'Date must be in YYYY-MM-DD format',
        );
      }

      this.logger.log(`Getting matches for date: ${date}`);
      
      const matches = await this.matchesService.getMatchesByDate(date, timezone);
      
      return createSuccessResponse(matches, {
        count: matches?.length || 0,
      });
    } catch (error) {
      this.logger.error(`Error getting matches by date: ${error.message}`);
      return createErrorResponse(
        'FETCH_ERROR',
        error.message || 'Failed to fetch matches',
      );
    }
  }

  /**
   * GET /api/v1/matches/league/:leagueId
   * IMPORTANTE: Este endpoint debe ir ANTES de :id para evitar conflictos de rutas
   */
  @Get('league/:leagueId')
  @ApiOperation({ 
    summary: 'Get matches by league',
    description: 'Returns matches for a specific league/season',
  })
  @ApiParam({ 
    name: 'leagueId', 
    example: '2012',
    description: 'Season ID (e.g., 2012 for Premier League 2019/2020)',
  })
  @ApiQuery({ 
    name: 'status', 
    required: false,
    enum: ['upcoming', 'finished', 'all'],
    description: 'Filter by match status',
  })
  @ApiQuery({ 
    name: 'page', 
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @SwaggerResponse({ status: 200, description: 'League matches' })
  async getMatchesByLeague(
    @Param('leagueId') leagueId: string,
    @Query('status') status?: 'upcoming' | 'finished' | 'all',
    @Query('page') page?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      const lid = parseInt(leagueId, 10);
      
      if (isNaN(lid)) {
        return createErrorResponse(
          'INVALID_LEAGUE_ID',
          'League ID must be a number',
        );
      }

      this.logger.log(`Getting matches for league: ${lid}`);
      
      const matches = await this.matchesService.getMatchesByLeague(lid, { 
        status, 
        page,
      });
      
      return createSuccessResponse(matches, {
        count: matches?.length || 0,
      });
    } catch (error) {
      this.logger.error(`Error getting league matches: ${error.message}`);
      return createErrorResponse(
        'FETCH_ERROR',
        error.message || 'Failed to fetch league matches',
      );
    }
  }

  /**
   * GET /api/v1/matches/:id
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Get match details',
    description: 'Returns complete details for a specific match including H2H and odds',
  })
  @ApiParam({ 
    name: 'id', 
    example: '579101',
    description: 'Match ID from FootyStats',
  })
  @SwaggerResponse({ status: 200, description: 'Match details' })
  @SwaggerResponse({ status: 404, description: 'Match not found' })
  async getMatchById(
    @Param('id') id: string,
  ): Promise<ApiResponse<any>> {
    try {
      const matchId = parseInt(id, 10);
      
      if (isNaN(matchId)) {
        return createErrorResponse(
          'INVALID_MATCH_ID',
          'Match ID must be a number',
        );
      }

      this.logger.log(`Getting match details: ${matchId}`);

      const match = await this.matchesService.getMatchById(matchId);
      
      if (!match) {
        return createErrorResponse(
          'NOT_FOUND',
          `Match ${matchId} not found`,
        );
      }
      
      return createSuccessResponse(match);
      
    } catch (error) {
      this.logger.error(`Error getting match ${id}: ${error.message}`);
      return createErrorResponse(
        'FETCH_ERROR',
        error.message || 'Failed to fetch match',
      );
    }
  }
}

/**
 * Leagues Controller
 * 
 * Endpoints REST para ligas.
 * Integrado dentro de footystats/api/controllers.
 * 
 * Ubicación: src/footystats/api/controllers/leagues.controller.ts
 */

import { 
  Controller, 
  Get, 
  Query, 
  Logger,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';

import type { ApiResponse } from '../dto';
import { createSuccessResponse, createErrorResponse } from '../dto';
import { LeaguesService } from './leagues.service';

@ApiTags('Leagues')
@Controller('api/v1/leagues')
export class LeaguesController {
  private readonly logger = new Logger(LeaguesController.name);

  constructor(
    private readonly leaguesService: LeaguesService,
  ) {}

  /**
   * GET /api/v1/leagues
   * Lista todas las ligas disponibles
   */
  @Get()
  @ApiOperation({ 
    summary: 'List leagues',
    description: 'Returns all available leagues with optional filtering',
  })
  @ApiQuery({ 
    name: 'q', 
    required: false, 
    description: 'Search query (name or country)',
    example: 'premier',
  })
  @ApiQuery({ 
    name: 'countryId', 
    required: false, 
    type: Number,
    description: 'Filter by country ID',
  })
  @SwaggerResponse({ status: 200, description: 'List of leagues' })
  async listLeagues(
    @Query('q') q?: string,
    @Query('countryId') countryId?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      this.logger.log(`Listing leagues (q: ${q || 'none'}, countryId: ${countryId || 'none'})`);
      
      const leagues = await this.leaguesService.list({ q, countryId });
      
      return createSuccessResponse(leagues, {
        count: leagues.length,
      });
    } catch (error) {
      this.logger.error(`Error listing leagues: ${error.message}`);
      return createErrorResponse(
        'FETCH_ERROR',
        error.message || 'Failed to fetch leagues',
      );
    }
  }
}

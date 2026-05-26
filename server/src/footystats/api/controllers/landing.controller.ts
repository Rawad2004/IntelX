/**
 * Landing Controller
 * 
 * Controller público para endpoints del landing page.
 * No requiere autenticación.
 * 
 * Ubicación: src/footystats/api/controllers/landing.controller.ts
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TodaysMatchService } from '../../services/todays-match.service';
import { TodaysMatchResponseDTO } from '../dto/todays match.dto';

@ApiTags('Landing')
@Controller('api/v1/landing')
export class LandingController {
  private readonly logger = new Logger(LandingController.name);

  constructor(
    private readonly todaysMatchService: TodaysMatchService,
  ) {}

  /**
   * GET /api/v1/landing/todays-match
   * 
   * Obtiene el partido del día para mostrar en el landing page.
   * Endpoint público optimizado para el componente MatchOfTheDay.
   */
  @Get('todays-match')
  @ApiOperation({
    summary: 'Get today\'s featured match for landing page',
    description: `
      Returns the most interesting match of the day with full behavioral analysis.
      The selection algorithm considers:
      - CBW confidence (narrower = higher priority)
      - League tier (Tier 1 leagues preferred)
      - Prime time schedule (18:00-22:00)
      
      Response is cached for 1 hour.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Today\'s match with behavioral analysis',
    type: TodaysMatchResponseDTO,
  })
  async getTodaysMatch(): Promise<TodaysMatchResponseDTO | { message: string }> {
    this.logger.log('Fetching today\'s match for landing page');

    try {
      const match = await this.todaysMatchService.getTodaysMatch();

      if (!match) {
        this.logger.warn('No match available for today');
        return { message: 'No matches available today' };
      }

      return match;
    } catch (error) {
      this.logger.error('Error fetching today\'s match', error);
      return { message: 'Unable to load today\'s match. Please try again later.' };
    }
  }
}
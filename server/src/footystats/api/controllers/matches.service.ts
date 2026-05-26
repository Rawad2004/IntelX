/**
 * Matches Service (con Cache)
 * 
 * Servicio para obtener partidos desde FootyStats.
 * Integra caching para reducir llamadas a la API.
 * 
 * Ubicación: src/footystats/api/controllers/matches.service.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CacheService, CacheTTL, CachePrefix } from '../../cache';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.baseUrl = this.configService.get<string>('FOOTYSTATS_BASE_URL') || 
                   'https://api.football-data-api.com';
    this.apiKey = this.configService.get<string>('FOOTYSTATS_API_KEY') || '';
  }

  /**
   * Helper para hacer requests a FootyStats
   */
  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const queryParams = new URLSearchParams({
      key: this.apiKey,
      ...params,
    });

    this.logger.debug(`FootyStats request: ${endpoint}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${url}?${queryParams}`)
      );

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'FootyStats API error');
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('FootyStats API error: 404 Not Found');
      }
      throw error;
    }
  }

  /**
   * GET /todays-matches
   * Obtiene partidos del día actual
   */
  async getTodayMatches(timezone?: string) {
    const cacheKey = this.cacheService.makeKey(
      CachePrefix.TODAY, 
      timezone || 'UTC'
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.log(`Fetching today's matches from API (tz: ${timezone || 'UTC'})`);
        
        const params: Record<string, string> = {};
        if (timezone) {
          params.timezone = timezone;
        }

        const response = await this.request<any>('/todays-matches', params);
        return response.data || [];
      },
      CacheTTL.TODAY_MATCHES
    );
  }

  /**
   * GET /todays-matches?date=YYYY-MM-DD
   * Obtiene partidos por fecha específica
   */
  async getMatchesByDate(date: string, timezone?: string) {
    const cacheKey = this.cacheService.makeKey(
      CachePrefix.TODAY, 
      'date',
      date,
      timezone || 'UTC'
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.log(`Fetching matches for date ${date} from API`);
        
        const params: Record<string, string> = { date };
        if (timezone) {
          params.timezone = timezone;
        }

        const response = await this.request<any>('/todays-matches', params);
        return response.data || [];
      },
      CacheTTL.TODAY_MATCHES
    );
  }

  /**
   * GET /match?match_id=X
   * Obtiene detalles de un partido específico
   */
  async getMatchById(matchId: number) {
    const cacheKey = this.cacheService.makeKey(CachePrefix.MATCH, matchId);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.log(`Fetching match ${matchId} from API`);
        
        const response = await this.request<any>('/match', {
          match_id: matchId.toString(),
        });

        return response.data || null;
      },
      CacheTTL.MATCH_DATA
    );
  }

  /**
   * GET /league-matches?season_id=X
   * Obtiene partidos de una liga
   */
  async getMatchesByLeague(
    leagueId: number, 
    options?: { 
      status?: 'upcoming' | 'finished' | 'all';
      page?: number;
      maxPerPage?: number;
    }
  ) {
    const cacheKey = this.cacheService.makeKey(
      CachePrefix.LEAGUE, 
      leagueId,
      options?.status || 'all',
      options?.page || 1
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.log(`Fetching league ${leagueId} matches from API`);
        
        const params: Record<string, string> = {
          season_id: leagueId.toString(),
        };

        if (options?.page) {
          params.page = options.page.toString();
        }
        if (options?.maxPerPage) {
          params.max_per_page = options.maxPerPage.toString();
        }

        const response = await this.request<any>('/league-matches', params);
        let matches = response.data || [];

        // Filtrar por status si se especifica
        if (options?.status && options.status !== 'all') {
          const statusMap: Record<string, string> = {
            'upcoming': 'incomplete',
            'finished': 'complete',
          };
          matches = matches.filter((m: any) => m.status === statusMap[options.status!]);
        }

        return matches;
      },
      CacheTTL.LEAGUE_MATCHES
    );
  }

  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }
}

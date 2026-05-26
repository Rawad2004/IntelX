/**
 * Match Data Aggregator
 * 
 * Servicio que recopila datos de múltiples endpoints de FootyStats
 * en paralelo para construir el IntelX Match Object completo.
 * 
 * Ubicación: src/footystats/services/match-data.aggregator.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Interfaces para datos agregados
 */
export interface AggregatedMatchData {
  meta: {
    matchId: number;
    hasLineups: boolean;
    hasReferee: boolean;
    dataQuality: 'high' | 'medium' | 'low';
    aggregatedAt: string;
  };
  
  match: any;           // Match details completos
  homeForm: any;        // Last 5/6/10 home team
  awayForm: any;        // Last 5/6/10 away team
  leagueStats: any;     // League season stats
  referee: any | null;  // Referee stats (si disponible)
  
  // Datos extraídos y normalizados
  h2h: any;
  trends: any;
  lineups: any | null;
  odds: any;
}

@Injectable()
export class MatchDataAggregator {
  private readonly logger = new Logger(MatchDataAggregator.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  // Cache simple en memoria
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('FOOTYSTATS_BASE_URL') || 
                   'https://api.football-data-api.com';
    this.apiKey = this.configService.get<string>('FOOTYSTATS_API_KEY') || '';
  }

  /**
   * Cache helper
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  /**
   * Realiza request a FootyStats con cache
   */
  private async request<T>(
    endpoint: string, 
    params: Record<string, any> = {},
    cacheTTL: number = 5 * 60 * 1000,
  ): Promise<T> {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    
    const cached = this.getCached<T>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${endpoint}`);
      return cached;
    }

    const url = `${this.baseUrl}${endpoint}`;
    const queryParams = new URLSearchParams({
      key: this.apiKey,
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ),
    });

    this.logger.debug(`FootyStats request: ${endpoint}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${url}?${queryParams}`, {
          timeout: 15000,
        })
      );

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'FootyStats API error');
      }

      this.setCache(cacheKey, response.data, cacheTTL);
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching ${endpoint}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Agrega todos los datos necesarios para el análisis
   */
  async aggregate(matchId: number): Promise<AggregatedMatchData> {
    this.logger.log(`Aggregating data for match ${matchId}`);
    const startTime = Date.now();

    // PASO 1: Obtener match details (base de todo)
    const match = await this.getMatchDetails(matchId);
    
    if (!match?.data) {
      throw new Error(`Match ${matchId} not found`);
    }

    const matchData = match.data;
    const homeId = matchData.homeID;
    const awayId = matchData.awayID;
    const seasonId = matchData.competition_id;
    const refereeId = matchData.refereeID;

    // PASO 2: Ejecutar requests en paralelo
    const [homeForm, awayForm, leagueStats, referee] = await Promise.all([
      this.getTeamForm(homeId).catch(err => {
        this.logger.warn(`Failed to get home form: ${err.message}`);
        return null;
      }),
      this.getTeamForm(awayId).catch(err => {
        this.logger.warn(`Failed to get away form: ${err.message}`);
        return null;
      }),
      this.getLeagueStats(seasonId).catch(err => {
        this.logger.warn(`Failed to get league stats: ${err.message}`);
        return null;
      }),
      refereeId && refereeId > 0 
        ? this.getRefereeStats(refereeId).catch(err => {
            this.logger.warn(`Failed to get referee stats: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),
    ]);

    // Determinar calidad de datos
    const hasLineups = !!(matchData.lineups?.team_a?.length > 0);
    const hasReferee = !!referee?.data;
    const hasForm = !!(homeForm?.data && awayForm?.data);
    const hasLeague = !!leagueStats?.data;

    let dataQuality: 'high' | 'medium' | 'low' = 'low';
    if (hasLineups && hasReferee && hasForm && hasLeague) {
      dataQuality = 'high';
    } else if (hasForm && hasLeague) {
      dataQuality = 'medium';
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(`Data aggregation completed in ${elapsed}ms (quality: ${dataQuality})`);

    return {
      meta: {
        matchId,
        hasLineups,
        hasReferee,
        dataQuality,
        aggregatedAt: new Date().toISOString(),
      },
      match: matchData,
      homeForm: homeForm?.data || null,
      awayForm: awayForm?.data || null,
      leagueStats: leagueStats?.data || null,
      referee: referee?.data || null,
      h2h: matchData.h2h || null,
      trends: matchData.trends || null,
      lineups: hasLineups ? matchData.lineups : null,
      odds: matchData.odds_comparison || null,
    };
  }

  /**
   * GET /match - Match details con H2H, trends, lineups
   */
  private async getMatchDetails(matchId: number) {
    return this.request<any>('/match', { match_id: matchId }, 3 * 60 * 1000);
  }

  /**
   * GET /lastx - Form últimos 5/6/10 partidos
   */
  private async getTeamForm(teamId: number) {
    return this.request<any>('/lastx', { team_id: teamId }, 10 * 60 * 1000);
  }

  /**
   * GET /league-season - Stats de la liga
   */
  private async getLeagueStats(seasonId: number) {
    return this.request<any>('/league-season', { season_id: seasonId }, 30 * 60 * 1000);
  }

  /**
   * GET /referee - Stats del árbitro
   */
  private async getRefereeStats(refereeId: number) {
    return this.request<any>('/referee', { referee_id: refereeId }, 60 * 60 * 1000);
  }

  /**
   * Limpia el cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }

  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

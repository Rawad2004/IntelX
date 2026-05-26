/**
 * Match Data Service
 * 
 * Servicio responsable de obtener TODOS los datos necesarios
 * de FootyStats para un partido específico.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FootystatsGateway } from '../footystats.gateway';
import type {
  FootyStatsMatch,
  FootyStatsMatchDetails,
  FootyStatsTeam,
  FootyStatsLastX,
  FootyStatsLeague,
  FootyStatsReferee,
  FootyStatsH2H,
} from '@shared/types';

/**
 * Datos crudos de un partido (sin normalizar)
 */
export interface RawMatchData {
  match: FootyStatsMatchDetails;
  homeTeam: FootyStatsTeam;
  awayTeam: FootyStatsTeam;
  homeLastX: FootyStatsLastX;
  awayLastX: FootyStatsLastX;
  league: FootyStatsLeague;
  referee?: FootyStatsReferee;
  h2h?: FootyStatsH2H;
  dataCompleteness: number;
  missingData: string[];
}

/**
 * Datos para lista de partidos
 */
export interface RawMatchListData {
  matches: FootyStatsMatch[];
  date: string;
}

@Injectable()
export class MatchDataService {
  private readonly logger = new Logger(MatchDataService.name);

  constructor(
    private readonly footystatsGateway: FootystatsGateway,
  ) {}

  /**
   * Obtiene todos los datos necesarios para analizar un partido
   */
  async getMatchData(matchId: number): Promise<RawMatchData> {
    this.logger.log(`Fetching complete data for match ${matchId}`);
    
    const missingData: string[] = [];
    
    // 1. Obtener detalles del partido
    const match = await this.fetchMatchDetails(matchId);
    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }

    // 2. Obtener datos de equipos en paralelo
    const [homeTeam, awayTeam] = await Promise.all([
      this.fetchTeamData(match.homeID, 'home'),
      this.fetchTeamData(match.awayID, 'away'),
    ]);

    if (!homeTeam) missingData.push('homeTeam');
    if (!awayTeam) missingData.push('awayTeam');

    // 3. Obtener Last X de ambos equipos en paralelo
    const [homeLastX, awayLastX] = await Promise.all([
      this.fetchLastX(match.homeID, 'home'),
      this.fetchLastX(match.awayID, 'away'),
    ]);

    if (!homeLastX?.last5) missingData.push('homeLastX');
    if (!awayLastX?.last5) missingData.push('awayLastX');

    // 4. Obtener datos de liga
    const league = await this.fetchLeagueData(match.competition_id);
    if (!league) missingData.push('league');

    // 5. Obtener datos de árbitro (opcional pero importante para DRF)
    let referee: FootyStatsReferee | undefined = undefined;
    if (match.referee_id) {
      const refereeData = await this.fetchRefereeData(match.referee_id);
      if (refereeData) {
        referee = refereeData;
      } else {
        missingData.push('referee');
      }
    } else {
      missingData.push('referee');
    }

    // 6. Obtener H2H (opcional)
    let h2h: FootyStatsH2H | undefined = undefined;
    try {
      const h2hData = await this.fetchH2H(match.homeID, match.awayID);
      if (h2hData) {
        h2h = h2hData;
      } else {
        missingData.push('h2h');
      }
    } catch {
      missingData.push('h2h');
    }

    // Calcular completitud de datos
    const dataCompleteness = this.calculateDataCompleteness(missingData);

    this.logger.log(
      `Match ${matchId} data fetched. Completeness: ${(dataCompleteness * 100).toFixed(0)}%` +
      (missingData.length > 0 ? `. Missing: ${missingData.join(', ')}` : ''),
    );

    return {
      match,
      homeTeam: homeTeam || this.createEmptyTeam(match.homeID, match.home_name),
      awayTeam: awayTeam || this.createEmptyTeam(match.awayID, match.away_name),
      homeLastX: homeLastX || this.createEmptyLastX(),
      awayLastX: awayLastX || this.createEmptyLastX(),
      league: league || this.createEmptyLeague(match.competition_id),
      referee,
      h2h,
      dataCompleteness,
      missingData,
    };
  }

  /**
   * Obtiene partidos del día
   */
  async getTodayMatches(timezone?: string): Promise<RawMatchListData> {
    const today = this.getTodayDate(timezone);
    this.logger.log(`Fetching matches for ${today}`);
    
    try {
      const matches = await this.footystatsGateway.getTodayMatches();
      return {
        matches: matches || [],
        date: today,
      };
    } catch (error) {
      this.logger.error(`Error fetching today's matches: ${error.message}`);
      return { matches: [], date: today };
    }
  }

  /**
   * Obtiene partidos por fecha
   */
  async getMatchesByDate(date: string): Promise<RawMatchListData> {
    this.logger.log(`Fetching matches for ${date}`);
    
    try {
      const matches = await this.footystatsGateway.getMatchesByDate(date);
      return {
        matches: matches || [],
        date,
      };
    } catch (error) {
      this.logger.error(`Error fetching matches for ${date}: ${error.message}`);
      return { matches: [], date };
    }
  }

  /**
   * Obtiene partidos de una liga
   */
  async getLeagueMatches(leagueId: number): Promise<FootyStatsMatch[]> {
    this.logger.log(`Fetching matches for league ${leagueId}`);
    
    try {
      return await this.footystatsGateway.getLeagueMatches(leagueId) || [];
    } catch (error) {
      this.logger.error(`Error fetching league ${leagueId} matches: ${error.message}`);
      return [];
    }
  }

  // ===========================================================================
  // PRIVATE FETCH METHODS
  // ===========================================================================

  private async fetchMatchDetails(matchId: number): Promise<FootyStatsMatchDetails | null> {
    try {
      return await this.footystatsGateway.getMatchDetails(matchId);
    } catch (error) {
      this.logger.error(`Error fetching match ${matchId}: ${error.message}`);
      return null;
    }
  }

  private async fetchTeamData(teamId: number, label: string): Promise<FootyStatsTeam | null> {
    try {
      return await this.footystatsGateway.getTeamStats(teamId);
    } catch (error) {
      this.logger.warn(`Error fetching ${label} team ${teamId}: ${error.message}`);
      return null;
    }
  }

  private async fetchLastX(teamId: number, label: string): Promise<FootyStatsLastX | null> {
    try {
      return await this.footystatsGateway.getTeamLastX(teamId);
    } catch (error) {
      this.logger.warn(`Error fetching ${label} lastX for team ${teamId}: ${error.message}`);
      return null;
    }
  }

  private async fetchLeagueData(leagueId: number): Promise<FootyStatsLeague | null> {
    try {
      return await this.footystatsGateway.getLeagueStats(leagueId);
    } catch (error) {
      this.logger.warn(`Error fetching league ${leagueId}: ${error.message}`);
      return null;
    }
  }

  private async fetchRefereeData(refereeId: number): Promise<FootyStatsReferee | null> {
    try {
      return await this.footystatsGateway.getRefereeStats(refereeId);
    } catch (error) {
      this.logger.warn(`Error fetching referee ${refereeId}: ${error.message}`);
      return null;
    }
  }

  private async fetchH2H(homeTeamId: number, awayTeamId: number): Promise<FootyStatsH2H | null> {
    try {
      return await this.footystatsGateway.getH2H(homeTeamId, awayTeamId);
    } catch (error) {
      this.logger.warn(`Error fetching H2H: ${error.message}`);
      return null;
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private calculateDataCompleteness(missingData: string[]): number {
    const totalFields = 7;
    const presentFields = totalFields - missingData.filter(d => 
      ['homeTeam', 'awayTeam', 'homeLastX', 'awayLastX', 'league', 'referee'].includes(d)
    ).length;
    
    return presentFields / totalFields;
  }

  private getTodayDate(timezone?: string): string {
    const now = new Date();
    if (timezone) {
      try {
        return now.toLocaleDateString('en-CA', { timeZone: timezone });
      } catch {
        // Fallback to UTC
      }
    }
    return now.toISOString().split('T')[0];
  }

  private createEmptyTeam(id: number, name: string): FootyStatsTeam {
    return {
      id,
      name,
      cleanName: name,
      image: '',
      country: '',
    } as FootyStatsTeam;
  }

  private createEmptyLastX(): FootyStatsLastX {
    return {
      last5: {} as FootyStatsTeam,
      last6: undefined,
      last10: undefined,
    };
  }

  private createEmptyLeague(id: number): FootyStatsLeague {
    return {
      id,
      name: '',
      image: '',
      country: '',
    } as FootyStatsLeague;
  }
}
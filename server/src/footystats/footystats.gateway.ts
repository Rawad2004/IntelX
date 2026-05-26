/**
 * FootystatsGateway
 * 
 * Gateway para comunicación con FootyStats API.
 * Todos los métodos necesarios para el análisis IntelX.
 */

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FootystatsGateway {
  private readonly logger = new Logger(FootystatsGateway.name);
  private readonly base = process.env.FOOTYSTATS_BASE_URL || 'https://api.footystats.org';
  private readonly key = process.env.FOOTYSTATS_API_KEY;

  // ===========================================================================
  // MATCHES
  // ===========================================================================

  /**
   * Obtiene partidos del día actual
   */
  async getTodayMatches(): Promise<any[]> {
    return this.request('/todays-matches');
  }

  /**
   * Obtiene partidos por fecha específica
   */
  async getMatchesByDate(date: string): Promise<any[]> {
    // date format: YYYY-MM-DD
    return this.request('/todays-matches', { date });
  }

  /**
   * Obtiene detalles de un partido específico
   */
  async getMatchDetails(matchId: number): Promise<any> {
    return this.request('/matches', { match_id: matchId });
  }

  /**
   * Obtiene partidos de una liga
   */
  async getLeagueMatches(leagueId: number): Promise<any[]> {
    return this.request('/league-matches', { league_id: leagueId });
  }

  // ===========================================================================
  // TEAMS
  // ===========================================================================

  /**
   * Obtiene estadísticas de un equipo
   */
  async getTeamStats(teamId: number): Promise<any> {
    return this.request('/team', { team_id: teamId });
  }

  /**
   * Obtiene Last X (5/6/10) de un equipo
   */
  async getTeamLastX(teamId: number): Promise<any> {
    return this.request('/lastx', { team_id: teamId });
  }

  // ===========================================================================
  // LEAGUES
  // ===========================================================================

  /**
   * Obtiene estadísticas de una liga
   */
  async getLeagueStats(leagueId: number): Promise<any> {
    return this.request('/league', { league_id: leagueId });
  }

  /**
   * Obtiene tabla de posiciones de una liga
   */
  async getLeagueTable(leagueId: number): Promise<any> {
    return this.request('/league-tables', { league_id: leagueId });
  }

  // ===========================================================================
  // REFEREES
  // ===========================================================================

  /**
   * Obtiene estadísticas de un árbitro
   */
  async getRefereeStats(refereeId: number): Promise<any> {
    return this.request('/referee', { referee_id: refereeId });
  }

  // ===========================================================================
  // H2H
  // ===========================================================================

  /**
   * Obtiene historial de enfrentamientos entre dos equipos
   */
  async getH2H(homeTeamId: number, awayTeamId: number): Promise<any> {
    return this.request('/h2h', { 
      team_a_id: homeTeamId, 
      team_b_id: awayTeamId,
    });
  }

  // ===========================================================================
  // PLAYERS (opcional, para futuras features)
  // ===========================================================================

  /**
   * Obtiene estadísticas de jugadores de una liga
   */
  async getLeaguePlayers(leagueId: number): Promise<any[]> {
    return this.request('/league-players', { league_id: leagueId });
  }

  // ===========================================================================
  // PRIVATE
  // ===========================================================================

  /**
   * Método base para hacer requests a FootyStats API
   */
  private async request(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.key) {
      throw new Error('FOOTYSTATS_API_KEY is missing');
    }

    const queryParams = new URLSearchParams({
      key: this.key,
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ),
    });

    const url = `${this.base}${endpoint}?${queryParams}`;

    this.logger.debug(`Requesting: ${endpoint}`);

    try {
      const res = await fetch(url, { method: 'GET' });
      
      if (!res.ok) {
        throw new Error(`FootyStats API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      
      // FootyStats devuelve { data: [...] } o { data: {...} }
      return data.data ?? data;
      
    } catch (error) {
      this.logger.error(`FootyStats API error for ${endpoint}: ${error.message}`);
      throw error;
    }
  }
}
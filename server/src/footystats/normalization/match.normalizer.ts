/**
 * Match Normalizer
 * 
 * Transforma datos raw de FootyStats Match a NormalizedMatch de IntelX.
 * 
 * Responsabilidades:
 * 1. Mapear campos de FootyStats a nombres IntelX
 * 2. Convertir status de FootyStats a MatchStatus de IntelX
 * 3. Estructurar lineups y bench
 * 4. Normalizar H2H
 * 5. ELIMINAR todos los datos prohibidos (odds, predictions)
 */

import { Injectable } from '@nestjs/common';
import type {
  FootyStatsMatch,
  FootyStatsMatchDetails,
  FootyStatsH2H,
} from '@shared/types';
import type {
  NormalizedMatch,
  NormalizedMatchDetails,
  NormalizedTeamBasic,
  MatchStatus,
  MatchStats,
  LineupPlayer,
  BenchPlayer,
  PlayerEvent,
  NormalizedH2H,
  H2HMatch,
  NormalizedLeague,
  NormalizedReferee,
} from '@shared/types';
import { stripProhibitedFieldsDeep } from './odds.stripper';
import { TeamNormalizer } from './team.normalizer';
import { LastXNormalizer } from './lastx.normalizer';

@Injectable()
export class MatchNormalizer {
  constructor(
    private readonly teamNormalizer: TeamNormalizer,
    private readonly lastXNormalizer: LastXNormalizer,
  ) {}

  /**
   * Normaliza un partido para vista de lista
   */
  normalizeBasic(raw: FootyStatsMatch): NormalizedMatch {
    const clean = stripProhibitedFieldsDeep(raw);

    return {
      id: clean.id,
      status: this.mapStatus(clean.status),
      dateUnix: clean.date_unix,
      dateISO: new Date(clean.date_unix * 1000).toISOString(),
      
      // League
      leagueId: clean.competition_id,
      leagueName: clean.competition_name ?? '',
      leagueImage: this.buildLeagueImageUrl(clean.competition_id),
      season: clean.season ?? '',
      
      // Teams (basic)
      homeTeam: this.buildTeamBasic(
        clean.homeID,
        clean.home_name,
        clean.home_image,
      ),
      awayTeam: this.buildTeamBasic(
        clean.awayID,
        clean.away_name,
        clean.away_image,
      ),
      
      // Score (if available)
      homeGoals: clean.status === 'complete' ? clean.homeGoalCount : undefined,
      awayGoals: clean.status === 'complete' ? clean.awayGoalCount : undefined,
      htHomeGoals: clean.status === 'complete' ? clean.ht_goals_team_a : undefined,
      htAwayGoals: clean.status === 'complete' ? clean.ht_goals_team_b : undefined,
      
      // Stadium
      stadiumName: clean.stadium_name || undefined,
      
      // Referee
      refereeId: clean.referee_id || undefined,
      
      // Risk (internal use)
      risk: clean.risk,
    };
  }

  /**
   * Normaliza un partido con todos los detalles
   * Requiere datos adicionales de equipos, lastX, liga, árbitro
   */
  normalizeDetails(
    raw: FootyStatsMatchDetails,
    homeTeamData: any,
    awayTeamData: any,
    homeLastXData: any,
    awayLastXData: any,
    leagueData: any,
    refereeData?: any,
  ): NormalizedMatchDetails {
    const basicMatch = this.normalizeBasic(raw);
    const clean = stripProhibitedFieldsDeep(raw);

    return {
      ...basicMatch,
      
      // Full team data
      homeTeamFull: this.teamNormalizer.normalize(homeTeamData),
      awayTeamFull: this.teamNormalizer.normalize(awayTeamData),
      
      // Last X data
      homeLastX: this.lastXNormalizer.normalize(homeLastXData),
      awayLastX: this.lastXNormalizer.normalize(awayLastXData),
      
      // Match stats (if finished/live)
      stats: this.extractMatchStats(clean),
      
      // Lineups
      lineups: clean.lineup ? {
        home: this.normalizeLineup(clean.lineup.team_a),
        away: this.normalizeLineup(clean.lineup.team_b),
      } : undefined,
      
      // Bench
      bench: clean.bench ? {
        home: this.normalizeBench(clean.bench.team_a),
        away: this.normalizeBench(clean.bench.team_b),
      } : undefined,
      
      // H2H
      h2h: clean.h2h ? this.normalizeH2H(clean.h2h) : undefined,
      
      // Referee
      referee: refereeData ? this.normalizeReferee(refereeData) : undefined,
      
      // League
      league: this.normalizeLeague(leagueData),
    };
  }

  /**
   * Mapea status de FootyStats a MatchStatus de IntelX
   */
  private mapStatus(status: string): MatchStatus {
    switch (status) {
      case 'complete':
        return 'finished';
      case 'incomplete':
        return 'upcoming';
      case 'suspended':
        return 'suspended';
      case 'canceled':
        return 'canceled';
      default:
        return 'upcoming';
    }
  }

  /**
   * Construye URL de imagen de liga
   */
  private buildLeagueImageUrl(leagueId: number): string {
    return `https://cdn.footystats.org/img/leagues/${leagueId}.png`;
  }

  /**
   * Construye objeto básico de equipo
   */
  private buildTeamBasic(
    id: number,
    name: string,
    image: string,
  ): NormalizedTeamBasic {
    return {
      id,
      name,
      cleanName: this.cleanTeamName(name),
      image: image ?? '',
      tablePosition: undefined, // Se llena después si está disponible
      formRun: undefined, // Se llena después si está disponible
    };
  }

  /**
   * Limpia nombre de equipo (quita sufijos como FC, etc.)
   */
  private cleanTeamName(name: string): string {
    return name
      .replace(/\s*(FC|CF|SC|AC|AS|SS|US|CD|SD|CA|RC|RCD|UD|AD|Club|Athletic|United|City|Town|Rovers|Wanderers)\s*$/i, '')
      .trim();
  }

  /**
   * Extrae estadísticas del partido
   */
  private extractMatchStats(match: FootyStatsMatchDetails): MatchStats | undefined {
    if (match.status !== 'complete') {
      return undefined;
    }

    return {
      possession: {
        home: match.team_a_possession ?? 50,
        away: match.team_b_possession ?? 50,
      },
      shots: {
        home: match.team_a_shots ?? 0,
        away: match.team_b_shots ?? 0,
      },
      shotsOnTarget: {
        home: match.team_a_shotsOnTarget ?? 0,
        away: match.team_b_shotsOnTarget ?? 0,
      },
      corners: {
        home: match.team_a_corners ?? 0,
        away: match.team_b_corners ?? 0,
      },
      fouls: {
        home: match.team_a_fouls ?? 0,
        away: match.team_b_fouls ?? 0,
      },
      yellowCards: {
        home: match.team_a_yellow_cards ?? 0,
        away: match.team_b_yellow_cards ?? 0,
      },
      redCards: {
        home: match.team_a_red_cards ?? 0,
        away: match.team_b_red_cards ?? 0,
      },
      offsides: {
        home: match.team_a_offsides ?? 0,
        away: match.team_b_offsides ?? 0,
      },
      xg: {
        home: match.team_a_xg ?? 0,
        away: match.team_b_xg ?? 0,
      },
    };
  }

  /**
   * Normaliza lineup de jugadores
   */
  private normalizeLineup(players: any[]): LineupPlayer[] {
    if (!players || !Array.isArray(players)) {
      return [];
    }

    return players.map(p => ({
      playerId: p.player_id,
      shirtNumber: p.shirt_number ?? 0,
      events: this.normalizePlayerEvents(p.player_events),
    }));
  }

  /**
   * Normaliza eventos de jugador
   */
  private normalizePlayerEvents(events: any[]): PlayerEvent[] {
    if (!events || !Array.isArray(events)) {
      return [];
    }

    return events.map(e => ({
      type: this.mapEventType(e.event_type),
      time: e.event_time ?? 0,
    }));
  }

  /**
   * Mapea tipo de evento
   */
  private mapEventType(type: string): PlayerEvent['type'] {
    switch (type?.toLowerCase()) {
      case 'goal':
        return 'goal';
      case 'yellow':
        return 'yellow';
      case 'red':
        return 'red';
      case 'owngoal':
        return 'ownGoal';
      case 'penaltymissed':
        return 'penaltyMissed';
      default:
        return 'goal';
    }
  }

  /**
   * Normaliza bench (suplentes)
   */
  private normalizeBench(subs: any[]): BenchPlayer[] {
    if (!subs || !Array.isArray(subs)) {
      return [];
    }

    return subs.map(s => ({
      playerInId: s.player_in_id,
      playerOutId: s.player_out_id,
      shirtNumber: s.player_in_shirt_number ?? 0,
      time: s.player_out_time ?? 0,
    }));
  }

  /**
   * Normaliza H2H
   */
  private normalizeH2H(h2h: FootyStatsH2H): NormalizedH2H {
    const results = h2h.previous_matches_results;
    const stats = h2h.betting_stats;

    return {
      totalMatches: results.totalMatches ?? 0,
      homeWins: results.team_a_wins ?? 0,
      awayWins: results.team_b_wins ?? 0,
      draws: results.draw ?? 0,
      homeWinPercentage: results.team_a_win_percentage ?? 0,
      awayWinPercentage: results.team_b_win_percentage ?? 0,
      drawPercentage: results.draw_percentage ?? 0,
      avgGoals: stats.avg_goals ?? 0,
      bttsPercentage: stats.bttsPercentage ?? 0,
      over25Percentage: stats.over25 ?? 0,
      recentMatches: this.normalizeH2HMatches(h2h.previous_matches_ids),
    };
  }

  /**
   * Normaliza partidos H2H
   */
  private normalizeH2HMatches(matches: any[]): H2HMatch[] {
    if (!matches || !Array.isArray(matches)) {
      return [];
    }

    return matches.slice(0, 5).map(m => ({
      id: m.id,
      date: m.date_unix,
      homeGoals: m.team_a_goals ?? 0,
      awayGoals: m.team_b_goals ?? 0,
    }));
  }

  /**
   * Normaliza datos de liga
   */
  private normalizeLeague(league: any): NormalizedLeague {
    if (!league) {
      return {
        id: 0,
        name: '',
        image: '',
        country: '',
        season: '',
        avgGoalsPerGame: 2.5,
        avgCornersPerGame: 10,
        avgCardsPerGame: 4,
        bttsPercentage: 50,
        over25Percentage: 50,
        homeWinPercentage: 45,
        awayWinPercentage: 30,
        drawPercentage: 25,
      };
    }

    const clean = stripProhibitedFieldsDeep(league);

    return {
      id: clean.id,
      name: clean.name ?? '',
      image: clean.image ?? '',
      country: clean.country ?? '',
      season: clean.season ?? '',
      avgGoalsPerGame: clean.seasonAVG_overall ?? 2.5,
      avgCornersPerGame: clean.corners_avg_overall ?? 10,
      avgCardsPerGame: clean.cards_avg_overall ?? 4,
      bttsPercentage: clean.btts_percentage ?? 50,
      over25Percentage: clean.over_25_percentage ?? 50,
      homeWinPercentage: clean.home_win_percentage ?? 45,
      awayWinPercentage: clean.away_win_percentage ?? 30,
      drawPercentage: clean.draw_percentage ?? 25,
    };
  }

  /**
   * Normaliza datos de árbitro
   */
  private normalizeReferee(referee: any): NormalizedReferee {
    if (!referee) {
      return {
        id: 0,
        name: '',
        age: 0,
        nationality: '',
        matchesOfficiated: 0,
        goalsPerMatch: 0,
        yellowCardsTotal: 0,
        redCardsTotal: 0,
        cardsPerMatch: 0,
        penaltiesGiven: 0,
        penaltiesPerMatch: 0,
        bttsPercentage: 0,
      };
    }

    const clean = stripProhibitedFieldsDeep(referee);
    const appearances = clean.appearances_overall ?? 1;

    return {
      id: clean.id,
      name: clean.full_name ?? '',
      age: clean.age ?? 0,
      nationality: clean.nationality ?? '',
      matchesOfficiated: appearances,
      goalsPerMatch: clean.goals_per_match_overall ?? 0,
      yellowCardsTotal: clean.yellow_cards_overall ?? 0,
      redCardsTotal: clean.red_cards_overall ?? 0,
      cardsPerMatch: appearances > 0
        ? ((clean.yellow_cards_overall ?? 0) + (clean.red_cards_overall ?? 0)) / appearances
        : 0,
      penaltiesGiven: clean.penalties_given_overall ?? 0,
      penaltiesPerMatch: clean.penalties_given_per_match_overall ?? 0,
      bttsPercentage: clean.btts_percentage ?? 0,
    };
  }
}
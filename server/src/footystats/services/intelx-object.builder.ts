/**
 * IntelX Object Builder
 * 
 * Construye el objeto IntelX Match Object que se envía al prompt de IA.
 * Normaliza y estructura todos los datos para máxima claridad.
 * 
 * Ubicación: src/footystats/services/intelx-object.builder.ts
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Tipos locales para v2 (evita dependencias circulares)
 */
interface AggregatedMatchDataV2 {
  meta: {
    matchId: number;
    hasLineups: boolean;
    hasReferee: boolean;
    dataQuality: 'high' | 'medium' | 'low';
    aggregatedAt: string;
  };
  match: any;
  homeForm: any;
  awayForm: any;
  leagueStats: any;
  referee: any | null;
  h2h: any;
  trends: any;
  lineups: any | null;
  odds: any;
}

interface CBWStateV2 {
  state: 'narrow' | 'medium' | 'wide';
  confidence: number;
  reasons: string[];
}

/**
 * IntelX Match Object - Estructura final para el prompt
 */
export interface IntelXMatchObject {
  meta: {
    matchId: number;
    hasLineups: boolean;
    dataQuality: 'high' | 'medium' | 'low';
    analysisVersion: string;
    generatedAt: string;
  };

  match: {
    home: { id: number; name: string; image: string | null };
    away: { id: number; name: string; image: string | null };
    league: { id: number; name: string; country: string };
    date: string;
    venue: string | null;
    status: string;
  };

  h2h: H2HData | null;
  form: { home: FormData; away: FormData };
  seasonStats: { home: SeasonSummary | null; away: SeasonSummary | null };
  leagueContext: LeagueContext | null;
  referee: RefereeData | null;
  lineups: { home: PlayerInfo[]; away: PlayerInfo[] } | null;
  odds: OddsData;
  prePotentials: PrePotentials;
  trends: { home: string[]; away: string[] };
  signals: any;
  cbw: CBWStateV2;
  weather: WeatherData | null;
}

interface H2HData {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  avgGoals: number;
  bttsPercentage: number;
  over25Percentage: number;
  over15Percentage: number;
  lastMatches: Array<{
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeGoals: number;
    awayGoals: number;
  }>;
}

interface FormSummary {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsForAvg: number;
  goalsAgainstAvg: number;
  cleanSheets: number;
  cleanSheetPct: number;
  btts: number;
  bttsPct: number;
  over25: number;
  over25Pct: number;
  xgFor: number;
  xgAgainst: number;
  ppg: number;
}

interface FormData {
  last5: FormSummary | null;
  last6: FormSummary | null;
  last10: FormSummary | null;
  formString: string;
  trend: 'improving' | 'stable' | 'declining';
}

interface SeasonSummary {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  position: number | null;
  ppg: number;
  homeRecord: string;
  awayRecord: string;
}

interface LeagueContext {
  avgGoals: number;
  avgCorners: number;
  avgCards: number;
  bttsPercentage: number;
  over25Percentage: number;
}

interface RefereeData {
  name: string;
  avgCards: number;
  avgFouls: number;
  penaltiesPerMatch: number;
  homeWinPercentage: number;
  appearances: number;
}

interface PlayerInfo {
  id: number;
  shirtNumber: number;
  events: string[];
}

interface OddsData {
  home: number | null;
  draw: number | null;
  away: number | null;
  over25: number | null;
  under25: number | null;
  bttsYes: number | null;
  bttsNo: number | null;
}

interface PrePotentials {
  btts: number;
  over15: number;
  over25: number;
  over35: number;
  corners: number;
  cards: number;
}

interface WeatherData {
  temp: number;
  humidity: string;
  wind: string;
  condition: string;
}

@Injectable()
export class IntelXObjectBuilder {
  private readonly logger = new Logger(IntelXObjectBuilder.name);

  /**
   * Construye el IntelX Match Object completo
   */
  build(data: AggregatedMatchDataV2, signals: any, cbw: CBWStateV2): IntelXMatchObject {
    this.logger.debug(`Building IntelX Object for match ${data.meta.matchId}`);

    return {
      meta: {
        matchId: data.meta.matchId,
        hasLineups: data.meta.hasLineups,
        dataQuality: data.meta.dataQuality,
        analysisVersion: '2.0.0',
        generatedAt: new Date().toISOString(),
      },

      match: this.buildMatch(data),
      h2h: this.buildH2H(data),
      form: this.buildForm(data),
      seasonStats: this.buildSeasonStats(data),
      leagueContext: this.buildLeagueContext(data),
      referee: this.buildReferee(data),
      lineups: this.buildLineups(data),
      odds: this.buildOdds(data),
      prePotentials: this.buildPrePotentials(data),
      trends: this.buildTrends(data),
      signals,
      cbw,
      weather: this.buildWeather(data),
    };
  }

  private buildMatch(data: AggregatedMatchDataV2): IntelXMatchObject['match'] {
    const match = data.match || {};
    
    return {
      home: {
        id: match.homeID || 0,
        name: match.home_name || 'Unknown',
        image: match.home_image || null,
      },
      away: {
        id: match.awayID || 0,
        name: match.away_name || 'Unknown',
        image: match.away_image || null,
      },
      league: {
        id: match.competition_id || 0,
        name: match.competition?.name || 'Unknown',
        country: match.competition?.country || 'Unknown',
      },
      date: match.date_unix 
        ? new Date(match.date_unix * 1000).toISOString() 
        : new Date().toISOString(),
      venue: match.stadium_name || null,
      status: match.status || 'unknown',
    };
  }

  private buildH2H(data: AggregatedMatchDataV2): H2HData | null {
    const h2h = data.h2h;
    if (!h2h) return null;

    const stats = h2h.betting_stats || h2h.previous_matches_results || {};
    const matches = h2h.previous_matches || [];

    return {
      totalMatches: stats.totalMatches || matches.length || 0,
      homeWins: stats.homeWins || 0,
      awayWins: stats.awayWins || 0,
      draws: stats.draws || 0,
      avgGoals: stats.avg_goals || 0,
      bttsPercentage: stats.bttsPercentage || 0,
      over25Percentage: stats.over25Percentage || 0,
      over15Percentage: stats.over15Percentage || 0,
      lastMatches: matches.slice(0, 5).map((m: any) => ({
        date: m.date_unix ? new Date(m.date_unix * 1000).toISOString() : '',
        homeTeam: m.home_name || '',
        awayTeam: m.away_name || '',
        homeGoals: m.homeGoalCount || 0,
        awayGoals: m.awayGoalCount || 0,
      })),
    };
  }

  private buildForm(data: AggregatedMatchDataV2): { home: FormData; away: FormData } {
    return {
      home: this.buildTeamForm(data.homeForm),
      away: this.buildTeamForm(data.awayForm),
    };
  }

  private buildTeamForm(formData: any): FormData {
    if (!formData) {
      return {
        last5: null,
        last6: null,
        last10: null,
        formString: '-----',
        trend: 'stable',
      };
    }

    const stats5 = formData.stats_last_5;
    const stats6 = formData.stats_last_6;
    const stats10 = formData.stats_last_10;

    return {
      last5: stats5 ? this.buildFormSummary(stats5, 5) : null,
      last6: stats6 ? this.buildFormSummary(stats6, 6) : null,
      last10: stats10 ? this.buildFormSummary(stats10, 10) : null,
      formString: formData.form_string || '-----',
      trend: this.calculateTrend(stats5, stats10),
    };
  }

  private buildFormSummary(stats: any, games: number): FormSummary {
    return {
      matches: games,
      wins: stats.wins_overall || 0,
      draws: stats.draws_overall || 0,
      losses: stats.losses_overall || 0,
      goalsFor: stats.goals_scored_overall || 0,
      goalsAgainst: stats.goals_conceded_overall || 0,
      goalsForAvg: stats.goals_scored_avg_overall || 0,
      goalsAgainstAvg: stats.goals_conceded_avg_overall || 0,
      cleanSheets: stats.clean_sheets_overall || 0,
      cleanSheetPct: stats.clean_sheet_percentage_overall || 0,
      btts: stats.btts_overall || 0,
      bttsPct: stats.btts_percentage_overall || 0,
      over25: stats.over25_overall || 0,
      over25Pct: stats.over25_percentage_overall || 0,
      xgFor: stats.xg_for_avg_overall || 0,
      xgAgainst: stats.xg_against_avg_overall || 0,
      ppg: stats.ppg_overall || 0,
    };
  }

  private calculateTrend(stats5: any, stats10: any): 'improving' | 'stable' | 'declining' {
    if (!stats5 || !stats10) return 'stable';

    const ppg5 = stats5.ppg_overall || 0;
    const ppg10 = stats10.ppg_overall || 0;

    if (ppg5 > ppg10 + 0.3) return 'improving';
    if (ppg5 < ppg10 - 0.3) return 'declining';
    return 'stable';
  }

  private buildSeasonStats(data: AggregatedMatchDataV2): { home: SeasonSummary | null; away: SeasonSummary | null } {
    const match = data.match || {};
    
    return {
      home: match.home_name ? {
        played: match.homeStats?.matches_played || 0,
        wins: match.homeStats?.wins || 0,
        draws: match.homeStats?.draws || 0,
        losses: match.homeStats?.losses || 0,
        goalsFor: match.homeStats?.goals_for || 0,
        goalsAgainst: match.homeStats?.goals_against || 0,
        position: match.home_position || null,
        ppg: match.home_ppg || 0,
        homeRecord: match.homeStats?.home_record || '',
        awayRecord: match.homeStats?.away_record || '',
      } : null,
      away: match.away_name ? {
        played: match.awayStats?.matches_played || 0,
        wins: match.awayStats?.wins || 0,
        draws: match.awayStats?.draws || 0,
        losses: match.awayStats?.losses || 0,
        goalsFor: match.awayStats?.goals_for || 0,
        goalsAgainst: match.awayStats?.goals_against || 0,
        position: match.away_position || null,
        ppg: match.away_ppg || 0,
        homeRecord: match.awayStats?.home_record || '',
        awayRecord: match.awayStats?.away_record || '',
      } : null,
    };
  }

  private buildLeagueContext(data: AggregatedMatchDataV2): LeagueContext | null {
    const ls = data.leagueStats;
    if (!ls) return null;

    return {
      avgGoals: ls.AVG_goals_per_match || 0,
      avgCorners: ls.AVG_corners_per_match || 0,
      avgCards: ls.AVG_cards_per_match || 0,
      bttsPercentage: ls.BTTS_percentage || 0,
      over25Percentage: ls.over25_percentage || 0,
    };
  }

  private buildReferee(data: AggregatedMatchDataV2): RefereeData | null {
    const ref = data.referee;
    if (!ref) return null;

    const refData = Array.isArray(ref) ? ref[0] : ref;
    if (!refData) return null;

    return {
      name: refData.name || 'Unknown',
      avgCards: refData.cards_per_match_overall || 0,
      avgFouls: refData.fouls_per_match_overall || 0,
      penaltiesPerMatch: refData.penalties_per_match_overall || 0,
      homeWinPercentage: refData.home_win_percentage || 0,
      appearances: refData.appearances_overall || 0,
    };
  }

  private buildLineups(data: AggregatedMatchDataV2): { home: PlayerInfo[]; away: PlayerInfo[] } | null {
    const lineups = data.lineups;
    if (!lineups) return null;

    const processLineup = (lineup: any[]): PlayerInfo[] => {
      return (lineup || []).map(p => ({
        id: p.player_id || 0,
        shirtNumber: p.shirt_number || 0,
        events: p.events || [],
      }));
    };

    return {
      home: processLineup(lineups.home_team),
      away: processLineup(lineups.away_team),
    };
  }

  private buildOdds(data: AggregatedMatchDataV2): OddsData {
    const match = data.match || {};
    const odds = data.odds || {};

    return {
      home: match.odds_ft_1 || odds.home || null,
      draw: match.odds_ft_x || odds.draw || null,
      away: match.odds_ft_2 || odds.away || null,
      over25: match.odds_ft_over25 || odds.over25 || null,
      under25: match.odds_ft_under25 || odds.under25 || null,
      bttsYes: match.odds_btts_yes || odds.bttsYes || null,
      bttsNo: match.odds_btts_no || odds.bttsNo || null,
    };
  }

  private buildPrePotentials(data: AggregatedMatchDataV2): PrePotentials {
    const match = data.match || {};

    return {
      btts: match.btts_potential || 0,
      over15: match.o15_potential || 0,
      over25: match.o25_potential || 0,
      over35: match.o35_potential || 0,
      corners: match.corners_potential || 0,
      cards: match.cards_potential || 0,
    };
  }

  private buildTrends(data: AggregatedMatchDataV2): { home: string[]; away: string[] } {
    const trends = data.trends || {};

    const extractTrends = (teamTrends: any): string[] => {
      if (!teamTrends || !Array.isArray(teamTrends)) return [];
      return teamTrends.map((t: any) => {
        if (Array.isArray(t)) return t.join(': ');
        if (typeof t === 'string') return t;
        return String(t);
      }).slice(0, 10);
    };

    return {
      home: extractTrends(trends.home),
      away: extractTrends(trends.away),
    };
  }

  private buildWeather(data: AggregatedMatchDataV2): WeatherData | null {
    const weather = data.match?.weather;
    if (!weather) return null;

    return {
      temp: weather.temperature_celcius?.temp || 20,
      humidity: weather.humidity || 'N/A',
      wind: weather.wind?.speed ? `${weather.wind.speed} m/s` : 'N/A',
      condition: weather.type || weather.code || 'Unknown',
    };
  }
}
/**
 * FootyStats API Raw Types
 * 
 * Estos tipos representan la estructura EXACTA de los datos que devuelve
 * la API de FootyStats. No los modificamos, solo los tipamos.
 * 
 * Documentación: https://footystats.org/api/documentations
 */

// =============================================================================
// MATCH TYPES
// =============================================================================

export interface FootyStatsMatch {
  id: number;
  homeID: number;
  awayID: number;
  home_name: string;
  away_name: string;
  home_image: string;
  away_image: string;
  competition_id: number;
  season: string;
  status: 'incomplete' | 'complete' | 'suspended' | 'canceled';
  date_unix: number;
  
  // Scores
  homeGoalCount: number;
  awayGoalCount: number;
  team_a_corners: number;
  team_b_corners: number;
  team_a_offsides: number;
  team_b_offsides: number;
  team_a_yellow_cards: number;
  team_b_yellow_cards: number;
  team_a_red_cards: number;
  team_b_red_cards: number;
  team_a_shotsOnTarget: number;
  team_b_shotsOnTarget: number;
  team_a_shotsOffTarget: number;
  team_b_shotsOffTarget: number;
  team_a_shots: number;
  team_b_shots: number;
  team_a_fouls: number;
  team_b_fouls: number;
  team_a_possession: number;
  team_b_possession: number;
  
  // xG Data
  team_a_xg: number;
  team_b_xg: number;
  total_xg: number;
  team_a_xg_prematch: number;
  team_b_xg_prematch: number;
  total_xg_prematch: number;
  
  // Goal timings
  homeGoals_timings: string; // "13,85,90'2"
  awayGoals_timings: string;
  
  // Half-time data
  ht_goals_team_a: number;
  ht_goals_team_b: number;
  
  // Stadium & Referee
  stadium_name: string;
  stadium_location: string;
  referee_id: number;
  
  // League info
  competition_name: string;
  
  // Risk indicator (FootyStats internal)
  risk: number;
  
  // Odds (PROHIBITED - will be stripped)
  odds_ft_1?: number;
  odds_ft_x?: number;
  odds_ft_2?: number;
  odds_ft_over05?: number;
  odds_ft_over15?: number;
  odds_ft_over25?: number;
  odds_ft_over35?: number;
  odds_btts_yes?: number;
  odds_btts_no?: number;
}

export interface FootyStatsMatchDetails extends FootyStatsMatch {
  // Lineups
  lineup?: {
    team_a: FootyStatsLineupPlayer[];
    team_b: FootyStatsLineupPlayer[];
  };
  
  // Bench
  bench?: {
    team_a: FootyStatsBenchPlayer[];
    team_b: FootyStatsBenchPlayer[];
  };
  
  // Card details
  team_a_card_details?: FootyStatsCardDetail[];
  team_b_card_details?: FootyStatsCardDetail[];
  
  // H2H
  h2h?: FootyStatsH2H;
  
  // Trends
  trends?: {
    home: FootyStatsTrend[];
    away: FootyStatsTrend[];
  };
  
  // Weather
  weather?: FootyStatsWeather;
}

export interface FootyStatsLineupPlayer {
  player_id: number;
  shirt_number: number;
  player_events?: FootyStatsPlayerEvent[];
}

export interface FootyStatsBenchPlayer {
  player_in_id: number;
  player_out_id: number;
  player_in_shirt_number: number;
  player_out_time: number;
}

export interface FootyStatsCardDetail {
  player_id: number;
  card_type: 'Yellow' | 'Red';
  time: number;
}

export interface FootyStatsPlayerEvent {
  event_type: 'Goal' | 'Yellow' | 'Red' | 'OwnGoal' | 'PenaltyMissed';
  event_time: number;
}

export interface FootyStatsTrend {
  tag: 'chart' | 'great' | 'good' | 'bad' | 'warning';
  text: string;
}

export interface FootyStatsWeather {
  coordinates: { lat: number; lon: number };
  temperature: { fahrenheit: number; celsius: number };
  humidity: number;
  wind: { degree: number; speed: number };
  type: string;
  clouds: number;
  pressure: number;
}

// =============================================================================
// H2H TYPES
// =============================================================================

export interface FootyStatsH2H {
  previous_matches_results: {
    team_a_wins: number;
    team_b_wins: number;
    draw: number;
    totalMatches: number;
    team_a_win_percentage: number;
    team_b_win_percentage: number;
    draw_percentage: number;
  };
  betting_stats: {
    over05: number;
    over15: number;
    over25: number;
    over35: number;
    over45: number;
    over55: number;
    btts: number;
    bttsPercentage: number;
    avg_goals: number;
    total_goals: number;
  };
  previous_matches_ids: FootyStatsH2HMatch[];
}

export interface FootyStatsH2HMatch {
  id: number;
  date_unix: number;
  team_a_goals: number;
  team_b_goals: number;
}

// =============================================================================
// TEAM TYPES
// =============================================================================

export interface FootyStatsTeam {
  id: number;
  name: string;
  cleanName: string;
  image: string;
  country: string;
  
  // Season stats
  seasonMatchesPlayed_overall: number;
  seasonMatchesPlayed_home: number;
  seasonMatchesPlayed_away: number;
  
  seasonWinsNum_overall: number;
  seasonWinsNum_home: number;
  seasonWinsNum_away: number;
  
  seasonDrawsNum_overall: number;
  seasonDrawsNum_home: number;
  seasonDrawsNum_away: number;
  
  seasonLossesNum_overall: number;
  seasonLossesNum_home: number;
  seasonLossesNum_away: number;
  
  // Goals
  seasonGoals_overall: number;
  seasonGoals_home: number;
  seasonGoals_away: number;
  
  seasonConceded_overall: number;
  seasonConceded_home: number;
  seasonConceded_away: number;
  
  seasonGoalDifference_overall: number;
  
  // Points
  seasonPoints_overall: number;
  seasonPPG_overall: number;
  seasonPPG_home: number;
  seasonPPG_away: number;
  
  // Averages
  seasonAVG_overall: number; // Goals per game
  seasonAVG_home: number;
  seasonAVG_away: number;
  
  // xG
  xg_for_avg_overall: number;
  xg_for_avg_home: number;
  xg_for_avg_away: number;
  xg_against_avg_overall: number;
  xg_against_avg_home: number;
  xg_against_avg_away: number;
  
  // Form
  formRun_overall: string; // "WWDLW"
  formRun_home: string;
  formRun_away: string;
  
  // Percentages
  seasonBTTSPercentage_overall: number;
  seasonBTTSPercentage_home: number;
  seasonBTTSPercentage_away: number;
  
  seasonOver25Percentage_overall: number;
  seasonOver25Percentage_home: number;
  seasonOver25Percentage_away: number;
  
  seasonCS_overall: number; // Clean sheets
  seasonCS_home: number;
  seasonCS_away: number;
  
  seasonCSPercentage_overall: number;
  
  // Corners
  cornersAVG_overall: number;
  cornersAVG_home: number;
  cornersAVG_away: number;
  cornersAgainstAVG_overall: number;
  cornersAgainstAVG_home: number;
  cornersAgainstAVG_away: number;
  
  // Cards
  cardsAVG_overall: number;
  cardsAVG_home: number;
  cardsAVG_away: number;
  
  // Shots
  shotsAVG_overall: number;
  shotsAVG_home: number;
  shotsAVG_away: number;
  shotsOnTargetAVG_overall: number;
  
  // Fouls
  foulsAVG_overall: number;
  foulsAVG_home: number;
  foulsAVG_away: number;
  
  // Offsides
  offsidesAVG_overall: number;
  offsidesAVG_home: number;
  offsidesAVG_away: number;
  offsidesAgainstAVG_overall?: number;
  
  // Possession
  possession_avg_overall: number;
  possession_avg_home: number;
  possession_avg_away: number;
  
  // Dangerous attacks
  dangerous_attacks_avg_overall?: number;
  dangerous_attacks_avg_home?: number;
  dangerous_attacks_avg_away?: number;
  
  // Goal timings
  goals_scored_min_0_to_10: number;
  goals_scored_min_11_to_20: number;
  goals_scored_min_21_to_30: number;
  goals_scored_min_31_to_40: number;
  goals_scored_min_41_to_50: number;
  goals_scored_min_51_to_60: number;
  goals_scored_min_61_to_70: number;
  goals_scored_min_71_to_80: number;
  goals_scored_min_81_to_90: number;
  
  goals_conceded_min_0_to_10: number;
  goals_conceded_min_11_to_20: number;
  goals_conceded_min_21_to_30: number;
  goals_conceded_min_31_to_40: number;
  goals_conceded_min_41_to_50: number;
  goals_conceded_min_51_to_60: number;
  goals_conceded_min_61_to_70: number;
  goals_conceded_min_71_to_80: number;
  goals_conceded_min_81_to_90: number;
  
  // First goal
  firstGoalScored: number; // Number of times scored first
  firstGoalScoredPercentage: number;
  
  // Table position
  tablePosition?: number;
}

// =============================================================================
// LAST X (5/6/10) TYPES
// =============================================================================

export interface FootyStatsLastX {
  // The structure is identical to FootyStatsTeam but for last X games
  // Endpoint returns nested objects for last5, last6, last10
  last5?: FootyStatsTeam;
  last6?: FootyStatsTeam;
  last10?: FootyStatsTeam;
}

// =============================================================================
// LEAGUE TYPES
// =============================================================================

export interface FootyStatsLeague {
  id: number;
  name: string;
  image: string;
  country: string;
  season: string;
  
  // League averages
  seasonAVG_overall: number;
  seasonAVG_home: number;
  seasonAVG_away: number;
  
  // Percentages
  btts_percentage: number;
  over_05_percentage: number;
  over_15_percentage: number;
  over_25_percentage: number;
  over_35_percentage: number;
  
  // Corner averages
  corners_avg_overall: number;
  corners_avg_home: number;
  corners_avg_away: number;
  
  // Card averages
  cards_avg_overall: number;
  
  // Home advantage
  home_win_percentage: number;
  away_win_percentage: number;
  draw_percentage: number;
}

// =============================================================================
// REFEREE TYPES
// =============================================================================

export interface FootyStatsReferee {
  id: number;
  full_name: string;
  age: number;
  nationality: string;
  
  // Appearances
  appearances_overall: number;
  appearances_home: number;
  appearances_away: number;
  
  // Goals
  goals_per_match_overall: number;
  goals_per_match_home: number;
  goals_per_match_away: number;
  
  // BTTS
  btts_percentage: number;
  
  // Cards (calculated from total / appearances)
  yellow_cards_overall: number;
  red_cards_overall: number;
  
  // Penalties
  penalties_given_overall: number;
  penalties_given_home: number;
  penalties_given_away: number;
  penalties_given_per_match_overall?: number; // May need to calculate
  
  // Win distribution
  wins_home: number;
  wins_away: number;
  draws_overall: number;
}

// =============================================================================
// PLAYER TYPES
// =============================================================================

export interface FootyStatsPlayer {
  id: number;
  full_name: string;
  known_as: string;
  age: number;
  nationality: string;
  position: string;
  
  // Appearances
  appearances_overall: number;
  minutes_played_overall: number;
  
  // Goals
  goals_overall: number;
  assists_overall: number;
  
  // xG
  xg_total_overall: number;
  xg_per_game_overall: number;
  xg_per_90_overall: number;
  npxg_total_overall: number; // Non-penalty xG
  xa_total_overall: number; // Expected assists
  
  // Cards
  yellow_cards_overall: number;
  red_cards_overall: number;
  
  // Minutes per goal
  minutes_per_goal_overall: number;
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

export interface FootyStatsApiResponse<T> {
  success: boolean;
  pager?: {
    current_page: number;
    max_page: number;
    results_per_page: number;
    total_results: number;
  };
  data: T;
}

export type FootyStatsTodayMatchesResponse = FootyStatsApiResponse<FootyStatsMatch[]>;
export type FootyStatsMatchDetailsResponse = FootyStatsApiResponse<FootyStatsMatchDetails>;
export type FootyStatsTeamResponse = FootyStatsApiResponse<FootyStatsTeam>;
export type FootyStatsLastXResponse = FootyStatsApiResponse<FootyStatsLastX>;
export type FootyStatsLeagueResponse = FootyStatsApiResponse<FootyStatsLeague>;
export type FootyStatsRefereeResponse = FootyStatsApiResponse<FootyStatsReferee>;
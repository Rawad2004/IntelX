/**
 * Signal Calculator Service
 * 
 * Servicio que calcula señales comportamentales de IntelX.
 * 
 * IMPORTANTE: Este archivo NO define tipos propios para evitar conflictos.
 * Los tipos vienen de @shared/types/intelx.types.ts
 * 
 * Ubicación: src/footystats/signals/signal-calculator.service.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  SignalInput,
  SignalOutput,
  BehavioralSignalStack,
  SignalBand,
  SignalId,
  DataPoint,
} from '@shared/types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS INTERNOS PARA v2 (no exportados, no conflictan)
// ═══════════════════════════════════════════════════════════════════════════

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

// Para v2 usamos un tipo más flexible
interface SignalOutputV2 {
  code: string;
  name: string;
  value: number;
  band: string;
  confidence: number;
  explanation: string;
  factors: string[];
}

interface CalculatedSignalsV2 {
  [key: string]: SignalOutputV2;
}

@Injectable()
export class SignalCalculatorService {
  private readonly logger = new Logger(SignalCalculatorService.name);

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODO PRINCIPAL v1: calculateAll (usado por analysis.service.ts)
  // Retorna BehavioralSignalStack compatible con tipos existentes
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calcula todas las señales usando SignalInput de @shared/types
   * @returns BehavioralSignalStack compatible con el sistema existente
   */
  async calculateAll(input: SignalInput): Promise<BehavioralSignalStack> {
    this.logger.debug('Calculating signals (v1) for analysis');

    const signals: SignalOutput[] = [];

    // TPI - Threat Persistence Index
    signals.push(this.calculateTPI(input));

    // LRF - Line Resolution Factor
    signals.push(this.calculateLRF(input));

    // DRF - Discipline Resolution Factor
    signals.push(this.calculateDRF(input));

    // WRF - Width Resolution Factor
    signals.push(this.calculateWRF(input));

    // MVI - Match Volatility Index
    signals.push(this.calculateMVI_v1(input));

    // GSS - Game State Stability
    signals.push(this.calculateGSS_v1(input));

    // SES - Scoring Environment Signal
    signals.push(this.calculateSES_v1(input));

    // CFS - Conversion Fragility Signal
    signals.push(this.calculateCFS_v1(input));

    // PAS - Pressure Accumulation Signal
    signals.push(this.calculatePAS_v1(input));

    // DVS - Discipline Volatility Signal
    signals.push(this.calculateDVS(input));

    // PCS - Physical Control Signal
    signals.push(this.calculatePCS_v1(input));

    // WDS - Width Dependence Signal
    signals.push(this.calculateWDS_v1(input));

    // TIS - Territorial Illusion Signal
    signals.push(this.calculateTIS_v1(input));

    // EDS - Early Disruption Signal
    signals.push(this.calculateEDS_v1(input));

    // LGE - Late Game Elasticity
    signals.push(this.calculateLGE_v1(input));

    // Calcular data completeness
    const dataCompleteness = this.calculateDataCompleteness(input);

    return {
      signals,
      calculatedAt: new Date().toISOString(),
      dataCompleteness,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS v2: Para uso con datos agregados (AnalysisOrchestrator)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calcula señales v2 usando datos agregados
   * Para uso interno del AnalysisOrchestrator
   */
  calculateV2(data: AggregatedMatchDataV2): CalculatedSignalsV2 {
    this.logger.debug(`Calculating signals (v2) for match ${data.meta.matchId}`);

    return {
      MVI: this.calculateMVI_v2(data),
      GSS: this.calculateGSS_v2(data),
      TRS: this.calculateTRS_v2(data),
      SES: this.calculateSES_v2(data),
      CFS: this.calculateCFS_v2(data),
      PAS: this.calculatePAS_v2(data),
      PCS: this.calculatePCS_v2(data),
      TIS: this.calculateTIS_v2(data),
      WDS: this.calculateWDS_v2(data),
      EDS: this.calculateEDS_v2(data),
      LGE: this.calculateLGE_v2(data),
    };
  }

  /**
   * Calcula CBW v2 usando datos agregados
   */
  calculateCBW_v2(data: AggregatedMatchDataV2, signals: CalculatedSignalsV2): CBWStateV2 {
    const reasons: string[] = [];
    let confidenceScore = 50;

    if (data.meta.hasLineups) {
      confidenceScore += 15;
      reasons.push('Lineups confirmed');
    }
    if (data.meta.hasReferee) {
      confidenceScore += 10;
      reasons.push('Referee data available');
    }
    if (data.homeForm && data.awayForm) {
      confidenceScore += 15;
      reasons.push('Team form data complete');
    }
    if (data.h2h?.previous_matches_results?.totalMatches >= 3) {
      confidenceScore += 10;
      reasons.push('H2H history available');
    }

    if (signals.MVI?.value > 70) {
      confidenceScore -= 10;
      reasons.push('High volatility expected');
    }
    if (signals.GSS?.value < 40) {
      confidenceScore -= 10;
      reasons.push('Unstable game state predicted');
    }

    let state: 'narrow' | 'medium' | 'wide';
    if (confidenceScore >= 70) {
      state = 'narrow';
    } else if (confidenceScore >= 45) {
      state = 'medium';
    } else {
      state = 'wide';
    }

    return {
      state,
      confidence: Math.max(0, Math.min(100, confidenceScore)),
      reasons,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULADORES v1 (SignalInput → SignalOutput)
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateTPI(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    // xG differential
    const homeXgDiff = input.homeTeam.xgFor - input.homeTeam.xgAgainst;
    const awayXgDiff = input.awayTeam.xgFor - input.awayTeam.xgAgainst;
    
    dataPoints.push({
      metric: 'home_xg_diff',
      value: homeXgDiff,
      source: 'team',
      weight: 0.3,
    });
    dataPoints.push({
      metric: 'away_xg_diff',
      value: awayXgDiff,
      source: 'team',
      weight: 0.3,
    });

    const combinedXg = input.homeTeam.xgFor + input.awayTeam.xgFor;
    if (combinedXg > 2.5) {
      score += 20;
    } else if (combinedXg < 1.5) {
      score -= 15;
    }

    // Dangerous attacks
    const avgDA = (input.homeTeam.dangerousAttacksAvg + input.awayTeam.dangerousAttacksAvg) / 2;
    if (avgDA > 50) {
      score += 15;
    }

    return this.buildSignalOutput('TPI', 'Threat Persistence Index', score, dataPoints, input);
  }

  private calculateLRF(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    const homeShots = input.homeTeam.shotsPerGame;
    const awayShots = input.awayTeam.shotsPerGame;
    
    dataPoints.push({
      metric: 'home_shots',
      value: homeShots,
      source: 'team',
      weight: 0.25,
    });

    if (homeShots + awayShots > 25) {
      score += 15;
    }

    return this.buildSignalOutput('LRF', 'Line Resolution Factor', score, dataPoints, input);
  }

  private calculateDRF(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    // Referee cards
    if (input.referee) {
      const cardsPerMatch = input.referee.cardsPerMatch;
      dataPoints.push({
        metric: 'referee_cards',
        value: cardsPerMatch,
        source: 'referee',
        weight: 0.4,
      });

      if (cardsPerMatch > 5) {
        score += 20;
      } else if (cardsPerMatch < 3) {
        score -= 10;
      }
    }

    // Team discipline
    const avgCards = (input.homeTeam.cardsPerGame + input.awayTeam.cardsPerGame) / 2;
    if (avgCards > 3) {
      score += 10;
    }

    return this.buildSignalOutput('DRF', 'Discipline Resolution Factor', score, dataPoints, input);
  }

  private calculateWRF(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    const homeCorners = input.homeTeam.cornersFor;
    const awayCorners = input.awayTeam.cornersFor;
    
    dataPoints.push({
      metric: 'combined_corners',
      value: homeCorners + awayCorners,
      source: 'team',
      weight: 0.3,
    });

    if (homeCorners + awayCorners > 12) {
      score += 20;
    } else if (homeCorners + awayCorners < 8) {
      score -= 10;
    }

    return this.buildSignalOutput('WRF', 'Width Resolution Factor', score, dataPoints, input);
  }

  private calculateMVI_v1(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    // H2H volatility
    if (input.h2h) {
      const avgGoals = input.h2h.avgGoals;
      dataPoints.push({
        metric: 'h2h_avg_goals',
        value: avgGoals,
        source: 'h2h',
        weight: 0.3,
      });

      if (avgGoals > 3) {
        score += 15;
      } else if (avgGoals < 2) {
        score -= 10;
      }
    }

    // Combined attack
    const combinedGoals = input.homeTeam.goalsPerGame + input.awayTeam.goalsPerGame;
    if (combinedGoals > 3) {
      score += 15;
    }

    return this.buildSignalOutput('MVI', 'Match Volatility Index', score, dataPoints, input);
  }

  private calculateGSS_v1(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    // Clean sheet percentage
    const homeCS = input.homeTeam.cleanSheetPercentage;
    const awayCS = input.awayTeam.cleanSheetPercentage;
    
    dataPoints.push({
      metric: 'home_cs_pct',
      value: homeCS,
      source: 'team',
      weight: 0.25,
    });

    if (homeCS > 40 || awayCS > 40) {
      score += 15;
    }

    // PPG difference
    const ppgDiff = Math.abs(input.homeTeam.seasonPPG - input.awayTeam.seasonPPG);
    if (ppgDiff < 0.5) {
      score += 10;
    } else if (ppgDiff > 1.5) {
      score -= 15;
    }

    return this.buildSignalOutput('GSS', 'Game State Stability', score, dataPoints, input);
  }

  private calculateSES_v1(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    // Over 2.5 percentage
    const homeOver25 = input.homeTeam.over25Percentage;
    const awayOver25 = input.awayTeam.over25Percentage;
    const avgOver25 = (homeOver25 + awayOver25) / 2;

    dataPoints.push({
      metric: 'avg_over25_pct',
      value: avgOver25,
      source: 'team',
      weight: 0.3,
    });

    if (avgOver25 > 55) {
      score += 20;
    } else if (avgOver25 < 40) {
      score -= 15;
    }

    // BTTS
    const avgBTTS = (input.homeTeam.bttsPercentage + input.awayTeam.bttsPercentage) / 2;
    if (avgBTTS > 55) {
      score += 10;
    }

    return this.buildSignalOutput('SES', 'Scoring Environment Signal', score, dataPoints, input);
  }

  private calculateCFS_v1(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    // Shot conversion (approximation)
    const homeConversion = input.homeTeam.goalsPerGame / Math.max(input.homeTeam.shotsPerGame, 1);
    const awayConversion = input.awayTeam.goalsPerGame / Math.max(input.awayTeam.shotsPerGame, 1);

    dataPoints.push({
      metric: 'home_conversion',
      value: homeConversion,
      source: 'team',
      weight: 0.3,
    });

    if (homeConversion < 0.08 || awayConversion < 0.08) {
      score += 15; // More fragile
    }

    return this.buildSignalOutput('CFS', 'Conversion Fragility Signal', score, dataPoints, input);
  }

  private calculatePAS_v1(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    const homePoss = input.homeTeam.possessionAvg;
    const awayPoss = input.awayTeam.possessionAvg;
    const diff = Math.abs(homePoss - awayPoss);

    dataPoints.push({
      metric: 'possession_diff',
      value: diff,
      source: 'team',
      weight: 0.4,
    });

    if (diff > 10) {
      score += 20;
    } else if (diff < 5) {
      score -= 10;
    }

    return this.buildSignalOutput('PAS', 'Pressure Accumulation Signal', score, dataPoints, input);
  }

  private calculateDVS(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    const homeCards = input.homeTeam.cardsPerGame;
    const awayCards = input.awayTeam.cardsPerGame;
    const avgCards = (homeCards + awayCards) / 2;

    dataPoints.push({
      metric: 'avg_cards',
      value: avgCards,
      source: 'team',
      weight: 0.3,
    });

    if (avgCards > 4) {
      score += 20;
    } else if (avgCards < 2) {
      score -= 10;
    }

    return this.buildSignalOutput('DVS', 'Discipline Volatility Signal', score, dataPoints, input);
  }

  private calculatePCS_v1(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    const homeFouls = input.homeTeam.foulsPerGame;
    const awayFouls = input.awayTeam.foulsPerGame;
    
    dataPoints.push({
      metric: 'combined_fouls',
      value: homeFouls + awayFouls,
      source: 'team',
      weight: 0.25,
    });

    if (homeFouls + awayFouls > 25) {
      score += 15;
    }

    return this.buildSignalOutput('PCS', 'Physical Control Signal', score, dataPoints, input);
  }

  private calculateWDS_v1(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    // Corner dependence
    const homeCorners = input.homeTeam.cornersFor;
    const awayCorners = input.awayTeam.cornersFor;

    dataPoints.push({
      metric: 'combined_corners',
      value: homeCorners + awayCorners,
      source: 'team',
      weight: 0.3,
    });

    if (homeCorners > 6 || awayCorners > 6) {
      score += 15;
    }

    return this.buildSignalOutput('WDS', 'Width Dependence Signal', score, dataPoints, input);
  }

  private calculateTIS_v1(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    // Possession vs goals mismatch
    const homePoss = input.homeTeam.possessionAvg;
    const homeGoals = input.homeTeam.goalsPerGame;
    
    // High possession but low goals = territorial illusion
    if (homePoss > 55 && homeGoals < 1.5) {
      score += 20;
    }

    dataPoints.push({
      metric: 'home_possession',
      value: homePoss,
      source: 'team',
      weight: 0.3,
    });

    return this.buildSignalOutput('TIS', 'Territorial Illusion Signal', score, dataPoints, input);
  }

  private calculateEDS_v1(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    // First goal percentage
    const homeFirstGoal = input.homeTeam.firstGoalScoredPercentage;
    const awayFirstGoal = input.awayTeam.firstGoalScoredPercentage;

    dataPoints.push({
      metric: 'home_first_goal_pct',
      value: homeFirstGoal,
      source: 'team',
      weight: 0.3,
    });

    if (homeFirstGoal > 50 || awayFirstGoal > 50) {
      score += 15;
    }

    // Goals in first 30 minutes
    const homeEarly = (input.homeTeam.goalsByPeriod?.min_0_15 || 0) + 
                      (input.homeTeam.goalsByPeriod?.min_16_30 || 0);
    if (homeEarly > 0.5) {
      score += 10;
    }

    return this.buildSignalOutput('EDS', 'Early Disruption Signal', score, dataPoints, input);
  }

  private calculateLGE_v1(input: SignalInput): SignalOutput {
    const dataPoints: DataPoint[] = [];
    let score = 50;

    // Goals in last 30 minutes
    const homeLate = (input.homeTeam.goalsByPeriod?.min_61_75 || 0) + 
                     (input.homeTeam.goalsByPeriod?.min_76_90 || 0);
    const awayLate = (input.awayTeam.goalsByPeriod?.min_61_75 || 0) + 
                     (input.awayTeam.goalsByPeriod?.min_76_90 || 0);

    dataPoints.push({
      metric: 'combined_late_goals',
      value: homeLate + awayLate,
      source: 'team',
      weight: 0.4,
    });

    if (homeLate + awayLate > 1) {
      score += 20;
    }

    return this.buildSignalOutput('LGE', 'Late Game Elasticity', score, dataPoints, input);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULADORES v2 (AggregatedMatchDataV2 → SignalOutputV2)
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateMVI_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 50;

    if (data.h2h?.betting_stats) {
      const avgGoals = data.h2h.betting_stats.avg_goals || 0;
      factors.push(`H2H avg goals: ${avgGoals.toFixed(1)}`);
      if (avgGoals > 3) score += 15;
      else if (avgGoals < 2) score -= 10;
    }

    const homeForm = data.homeForm?.stats_last_5;
    const awayForm = data.awayForm?.stats_last_5;
    if (homeForm && awayForm) {
      const totalAvg = (homeForm.goals_scored_avg_overall || 0) + (awayForm.goals_scored_avg_overall || 0);
      if (totalAvg > 3.5) {
        score += 20;
        factors.push(`Combined attack: ${totalAvg.toFixed(1)}`);
      }
    }

    return this.buildSignalOutputV2('MVI', 'Match Volatility Index', score, factors);
  }

  private calculateGSS_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 50;

    const homeForm = data.homeForm?.stats_last_5;
    const awayForm = data.awayForm?.stats_last_5;

    if (homeForm?.clean_sheet_percentage_overall > 40) {
      score += 15;
      factors.push(`Home CS: ${homeForm.clean_sheet_percentage_overall}%`);
    }
    if (awayForm?.clean_sheet_percentage_overall > 40) {
      score += 15;
      factors.push(`Away CS: ${awayForm.clean_sheet_percentage_overall}%`);
    }

    const ppgDiff = Math.abs((data.match?.home_ppg || 0) - (data.match?.away_ppg || 0));
    if (ppgDiff < 0.5) {
      score += 10;
      factors.push('Evenly matched');
    } else if (ppgDiff > 1.5) {
      score -= 15;
      factors.push('Large quality gap');
    }

    return this.buildSignalOutputV2('GSS', 'Game State Stability', score, factors);
  }

  private calculateTRS_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 50;

    const totalXG = (data.match?.team_a_xg_prematch || 0) + (data.match?.team_b_xg_prematch || 0);
    if (totalXG > 2.5) {
      score += 20;
      factors.push(`Combined xG: ${totalXG.toFixed(2)}`);
    } else if (totalXG < 1.5) {
      score -= 15;
      factors.push(`Low xG: ${totalXG.toFixed(2)}`);
    }

    return this.buildSignalOutputV2('TRS', 'Tempo Regime Signal', score, factors);
  }

  private calculateSES_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 50;

    const o25Potential = data.match?.o25_potential || 0;
    if (o25Potential > 60) {
      score += 20;
      factors.push(`O2.5 potential: ${o25Potential}%`);
    } else if (o25Potential < 40) {
      score -= 15;
      factors.push(`Low O2.5: ${o25Potential}%`);
    }

    const bttsPotential = data.match?.btts_potential || 0;
    if (bttsPotential > 55) {
      score += 15;
      factors.push(`BTTS: ${bttsPotential}%`);
    }

    return this.buildSignalOutputV2('SES', 'Scoring Environment Signal', score, factors);
  }

  private calculateCFS_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 50;

    const cornersPotential = data.match?.corners_potential || 0;
    if (cornersPotential > 10) {
      score += 20;
      factors.push(`Corners: ${cornersPotential.toFixed(1)}`);
    } else if (cornersPotential < 8) {
      score -= 10;
      factors.push(`Low corners: ${cornersPotential.toFixed(1)}`);
    }

    return this.buildSignalOutputV2('CFS', 'Corner Frequency Signal', score, factors);
  }

  private calculatePAS_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 50;

    const homeForm = data.homeForm?.stats_last_5;
    const awayForm = data.awayForm?.stats_last_5;

    if (homeForm?.possession_avg_overall && awayForm?.possession_avg_overall) {
      const diff = Math.abs(homeForm.possession_avg_overall - awayForm.possession_avg_overall);
      if (diff > 15) {
        score += 25;
        factors.push(`Possession gap: ${diff.toFixed(0)}%`);
      } else if (diff < 5) {
        score -= 10;
        factors.push('Similar styles');
      }
    }

    return this.buildSignalOutputV2('PAS', 'Possession Asymmetry Signal', score, factors);
  }

  private calculatePCS_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 50;

    const homeForm = data.homeForm?.stats_last_5;
    const awayForm = data.awayForm?.stats_last_5;

    if (homeForm && awayForm) {
      const homeShots = homeForm.shots_avg_overall || 0;
      const awayShots = awayForm.shots_avg_overall || 0;
      if (homeShots > 14 || awayShots > 14) {
        score += 20;
        factors.push('High pressure team');
      }
    }

    return this.buildSignalOutputV2('PCS', 'Pressure & Counter Signal', score, factors);
  }

  private calculateTIS_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 50;

    if (data.trends?.home?.length > 0) {
      const trends = data.trends.home.map((t: any) => Array.isArray(t) ? t[0] : t);
      if (trends.some((t: string) => t?.includes?.('great'))) {
        score += 10;
        factors.push('Home in form');
      }
      if (trends.some((t: string) => t?.includes?.('bad'))) {
        score -= 10;
        factors.push('Home struggling');
      }
    }

    return this.buildSignalOutputV2('TIS', 'Tactical Intent Signal', score, factors);
  }

  private calculateWDS_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 30;

    const weather = data.match?.weather;
    if (weather) {
      if (weather.code === 'rain' || weather.type?.includes?.('rain')) {
        score += 25;
        factors.push('Rain expected');
      }
      const windSpeed = parseFloat(weather.wind?.speed) || 0;
      if (windSpeed > 10) {
        score += 15;
        factors.push(`Wind: ${windSpeed}m/s`);
      }
    }

    return this.buildSignalOutputV2('WDS', 'Weather/Disruption Signal', score, factors);
  }

  private calculateEDS_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 50;

    const homeForm = data.homeForm?.stats_last_5;
    if (homeForm?.fhg_goals_scored_avg_overall > 0.8) {
      score += 15;
      factors.push(`Home FH goals: ${homeForm.fhg_goals_scored_avg_overall.toFixed(2)}`);
    }

    return this.buildSignalOutputV2('EDS', 'Early Dominance Signal', score, factors);
  }

  private calculateLGE_v2(data: AggregatedMatchDataV2): SignalOutputV2 {
    const factors: string[] = [];
    let score = 50;

    if (data.leagueStats) {
      const leagueAvgGoals = data.leagueStats.AVG_goals_per_match || 0;
      if (leagueAvgGoals > 2.8) {
        score += 20;
        factors.push(`League avg: ${leagueAvgGoals.toFixed(2)}`);
      } else if (leagueAvgGoals < 2.2) {
        score -= 15;
        factors.push(`Low league: ${leagueAvgGoals.toFixed(2)}`);
      }
    }

    return this.buildSignalOutputV2('LGE', 'League Effect', score, factors);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private buildSignalOutput(
    id: SignalId,
    name: string,
    rawScore: number,
    dataPoints: DataPoint[],
    input: SignalInput,
  ): SignalOutput {
    const value = Math.max(0, Math.min(100, rawScore));
    const band = this.scoreToBand(value);
    const confidence = this.calculateConfidence(dataPoints);

    return {
      id,
      name,
      value,
      band,
      confidence,
      explanation: this.generateExplanation(id, band, value),
      dataPoints,
      homeValue: this.extractHomeValue(id, input),
      awayValue: this.extractAwayValue(id, input),
    };
  }

  private buildSignalOutputV2(
    code: string,
    name: string,
    rawScore: number,
    factors: string[],
  ): SignalOutputV2 {
    const value = Math.max(0, Math.min(100, rawScore));
    const band = this.scoreToBandString(value);

    return {
      code,
      name,
      value,
      band,
      confidence: 0.7,
      explanation: `${name}: ${band}`,
      factors: factors.length > 0 ? factors : ['Insufficient data'],
    };
  }

  private scoreToBand(value: number): SignalBand {
    if (value < 35) return 'LOW';
    if (value < 65) return 'MEDIUM';
    return 'HIGH';
  }

  private scoreToBandString(value: number): string {
    if (value < 35) return 'LOW';
    if (value < 65) return 'MEDIUM';
    return 'HIGH';
  }

  private calculateConfidence(dataPoints: DataPoint[]): number {
    if (dataPoints.length === 0) return 0.3;
    const totalWeight = dataPoints.reduce((sum, dp) => sum + dp.weight, 0);
    return Math.min(0.9, 0.3 + totalWeight);
  }

  private generateExplanation(id: SignalId, band: SignalBand, value: number): string {
    const explanations: Record<SignalId, Record<SignalBand, string>> = {
      TPI: {
        LOW: 'Baja persistencia de amenaza - pocas oportunidades esperadas',
        MEDIUM: 'Amenaza moderada - actividad ofensiva normal',
        HIGH: 'Alta persistencia de amenaza - muchas oportunidades esperadas',
      },
      MVI: {
        LOW: 'Baja volatilidad - partido predecible',
        MEDIUM: 'Volatilidad moderada',
        HIGH: 'Alta volatilidad - resultado impredecible',
      },
      GSS: {
        LOW: 'Baja estabilidad - cambios frecuentes esperados',
        MEDIUM: 'Estabilidad moderada',
        HIGH: 'Alta estabilidad - ventajas tienden a mantenerse',
      },
      SES: {
        LOW: 'Entorno de pocos goles',
        MEDIUM: 'Entorno de goles promedio',
        HIGH: 'Entorno de muchos goles',
      },
      LRF: { LOW: 'Baja resolución', MEDIUM: 'Resolución normal', HIGH: 'Alta resolución' },
      DRF: { LOW: 'Baja disciplina', MEDIUM: 'Disciplina normal', HIGH: 'Alta disciplina' },
      WRF: { LOW: 'Poco juego amplio', MEDIUM: 'Juego amplio normal', HIGH: 'Mucho juego amplio' },
      CFS: { LOW: 'Conversión eficiente', MEDIUM: 'Conversión normal', HIGH: 'Conversión frágil' },
      PAS: { LOW: 'Poca acumulación', MEDIUM: 'Acumulación normal', HIGH: 'Alta acumulación' },
      DVS: { LOW: 'Baja volatilidad disciplinaria', MEDIUM: 'Normal', HIGH: 'Alta volatilidad disciplinaria' },
      PCS: { LOW: 'Poco control físico', MEDIUM: 'Control normal', HIGH: 'Alto control físico' },
      WDS: { LOW: 'Poca dependencia de banda', MEDIUM: 'Normal', HIGH: 'Alta dependencia de banda' },
      TIS: { LOW: 'Territorio productivo', MEDIUM: 'Normal', HIGH: 'Ilusión territorial' },
      EDS: { LOW: 'Inicio tranquilo esperado', MEDIUM: 'Normal', HIGH: 'Disrupción temprana esperada' },
      LGE: { LOW: 'Final tranquilo esperado', MEDIUM: 'Normal', HIGH: 'Alta elasticidad final' },
    };

    return explanations[id]?.[band] || `${name}: ${band}`;
  }

  private extractHomeValue(id: SignalId, input: SignalInput): number | undefined {
    switch (id) {
      case 'TPI': return input.homeTeam.xgFor;
      case 'SES': return input.homeTeam.over25Percentage;
      case 'PAS': return input.homeTeam.possessionAvg;
      default: return undefined;
    }
  }

  private extractAwayValue(id: SignalId, input: SignalInput): number | undefined {
    switch (id) {
      case 'TPI': return input.awayTeam.xgFor;
      case 'SES': return input.awayTeam.over25Percentage;
      case 'PAS': return input.awayTeam.possessionAvg;
      default: return undefined;
    }
  }

  private calculateDataCompleteness(input: SignalInput): number {
    let score = 0;
    let total = 0;

    // Check team data
    total += 2;
    if (input.homeTeam.xgFor > 0) score++;
    if (input.awayTeam.xgFor > 0) score++;

    // Check lastX
    total += 2;
    if (input.homeLastX?.last5?.games > 0) score++;
    if (input.awayLastX?.last5?.games > 0) score++;

    // Check league
    total += 1;
    if (input.league?.avgGoalsPerGame > 0) score++;

    // Check referee (optional)
    total += 1;
    if (input.referee && input.referee.cardsPerMatch > 0) score++;

    // Check H2H (optional)
    total += 1;
    if (input.h2h && input.h2h.totalMatches > 0) score++;

    return score / total;
  }
}
/**
 * Match Transformer
 * 
 * Transforma datos normalizados a DTOs listos para el frontend.
 */

import { Injectable } from '@nestjs/common';
import type {
  NormalizedMatch,
  NormalizedMatchDetails,
  NormalizedLastX,
  NormalizedH2H,
  NormalizedReferee,
  CBWResult,
} from '@shared/types';
import type {
  MatchListItemDTO,
  MatchDetailDTO,
  FormIndicatorDTO,
  LastXDTO,
  H2HDTO,
  H2HMatchDTO,
  TeamStatsDTO,
  RefereeDTO,
  MatchStatsDTO,
} from '../dto';

@Injectable()
export class MatchTransformer {
  /**
   * Transforma partido para vista de lista
   */
  toListItem(
    match: NormalizedMatch,
    cbwState?: CBWResult['state'],
    headline?: string,
  ): MatchListItemDTO {
    const date = new Date(match.dateUnix * 1000);
    
    return {
      id: match.id,
      status: match.status,
      dateTime: match.dateUnix,
      dateFormatted: this.formatDate(date),
      timeFormatted: this.formatTime(date),
      
      league: {
        id: match.leagueId,
        name: match.leagueName,
        image: match.leagueImage,
      },
      
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        shortName: match.homeTeam.cleanName,
        image: match.homeTeam.image,
        position: match.homeTeam.tablePosition,
        form: this.parseFormToIndicators(match.homeTeam.formRun || ''),
      },
      
      awayTeam: {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        shortName: match.awayTeam.cleanName,
        image: match.awayTeam.image,
        position: match.awayTeam.tablePosition,
        form: this.parseFormToIndicators(match.awayTeam.formRun || ''),
      },
      
      score: match.homeGoals !== undefined ? {
        home: match.homeGoals,
        away: match.awayGoals!,
        htHome: match.htHomeGoals,
        htAway: match.htAwayGoals,
      } : undefined,
      
      preview: {
        cbw: cbwState || 'medium',
        cbwColor: this.getCBWColor(cbwState || 'medium'),
        headline,
      },
    };
  }

  /**
   * Transforma partido con detalles completos
   */
  toDetail(
    match: NormalizedMatchDetails,
    cbwState?: CBWResult['state'],
    headline?: string,
  ): MatchDetailDTO {
    const listItem = this.toListItem(match, cbwState, headline);
    
    return {
      ...listItem,
      
      stadium: match.stadiumName,
      
      referee: match.referee ? this.transformReferee(match.referee) : undefined,
      
      stats: match.stats ? this.transformMatchStats(match.stats) : undefined,
      
      lineups: match.lineups ? {
        home: match.lineups.home.map(p => ({
          playerId: p.playerId,
          shirtNumber: p.shirtNumber,
          events: p.events.map(e => ({
            type: e.type,
            time: e.time,
            icon: this.getEventIcon(e.type),
          })),
        })),
        away: match.lineups.away.map(p => ({
          playerId: p.playerId,
          shirtNumber: p.shirtNumber,
          events: p.events.map(e => ({
            type: e.type,
            time: e.time,
            icon: this.getEventIcon(e.type),
          })),
        })),
      } : undefined,
      
      bench: match.bench,
      
      h2h: match.h2h ? this.transformH2H(match.h2h) : undefined,
      
      teamStats: {
        home: this.transformTeamStats(match.homeTeamFull),
        away: this.transformTeamStats(match.awayTeamFull),
      },
      
      lastX: {
        home: this.transformLastX(match.homeLastX),
        away: this.transformLastX(match.awayLastX),
      },
    };
  }

  /**
   * Parsea string de forma a indicadores visuales
   */
  parseFormToIndicators(form: string): FormIndicatorDTO[] {
    return form
      .slice(0, 5)
      .split('')
      .map(char => {
        const result = char.toUpperCase() as 'W' | 'D' | 'L';
        return {
          result,
          color: this.getFormColor(result),
        };
      });
  }

  /**
   * Color para resultado de forma
   */
  private getFormColor(result: 'W' | 'D' | 'L'): 'green' | 'yellow' | 'red' {
    switch (result) {
      case 'W': return 'green';
      case 'D': return 'yellow';
      case 'L': return 'red';
    }
  }

  /**
   * Color para CBW
   */
  private getCBWColor(state: CBWResult['state']): 'green' | 'yellow' | 'red' {
    switch (state) {
      case 'narrow': return 'green';
      case 'medium': return 'yellow';
      case 'wide': return 'red';
    }
  }

  /**
   * Formatea fecha
   */
  private formatDate(date: Date): string {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  /**
   * Formatea hora
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
    });
  }

  /**
   * Transforma Last X
   */
  private transformLastX(lastX: NormalizedLastX): LastXDTO {
    const last5 = lastX.last5;
    const trend = this.calculateTrend(lastX);
    
    return {
      form: last5.form,
      formIndicators: this.parseFormToIndicators(last5.form),
      trend,
      trendIcon: this.getTrendIcon(trend),
      trendColor: this.getTrendColor(trend),
      stats: {
        games: last5.games,
        wins: last5.wins,
        draws: last5.draws,
        losses: last5.losses,
        goalsFor: last5.goalsFor,
        goalsAgainst: last5.goalsAgainst,
        ppg: last5.ppg,
        xgFor: last5.xgFor,
        xgAgainst: last5.xgAgainst,
        btts: last5.bttsPercentage,
        over25: last5.over25Percentage,
      },
    };
  }

  /**
   * Calcula tendencia
   */
  private calculateTrend(lastX: NormalizedLastX): 'improving' | 'stable' | 'declining' {
    if (!lastX.last10 || lastX.last10.games === 0) {
      return 'stable';
    }

    const diff = lastX.last5.ppg - lastX.last10.ppg;
    if (diff > 0.3) return 'improving';
    if (diff < -0.3) return 'declining';
    return 'stable';
  }

  /**
   * Icono de tendencia
   */
  private getTrendIcon(trend: 'improving' | 'stable' | 'declining'): 'arrow-up' | 'minus' | 'arrow-down' {
    switch (trend) {
      case 'improving': return 'arrow-up';
      case 'stable': return 'minus';
      case 'declining': return 'arrow-down';
    }
  }

  /**
   * Color de tendencia
   */
  private getTrendColor(trend: 'improving' | 'stable' | 'declining'): 'green' | 'yellow' | 'red' {
    switch (trend) {
      case 'improving': return 'green';
      case 'stable': return 'yellow';
      case 'declining': return 'red';
    }
  }

  /**
   * Transforma H2H
   */
  private transformH2H(h2h: NormalizedH2H): H2HDTO {
    return {
      totalMatches: h2h.totalMatches,
      homeWins: h2h.homeWins,
      awayWins: h2h.awayWins,
      draws: h2h.draws,
      avgGoals: h2h.avgGoals,
      bttsPercentage: h2h.bttsPercentage,
      recentMatches: h2h.recentMatches.map(m => ({
        id: m.id,
        date: this.formatDate(new Date(m.date * 1000)),
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        result: m.homeGoals > m.awayGoals ? 'home' : 
                m.homeGoals < m.awayGoals ? 'away' : 'draw',
      })),
    };
  }

  /**
   * Transforma estadísticas de equipo
   */
  private transformTeamStats(team: any): TeamStatsDTO {
    return {
      position: team.tablePosition ?? 0,
      played: team.seasonMatchesPlayed ?? 0,
      won: team.seasonWins ?? 0,
      drawn: team.seasonDraws ?? 0,
      lost: team.seasonLosses ?? 0,
      goalsFor: team.seasonGoals ?? 0,
      goalsAgainst: team.seasonConceded ?? 0,
      goalDifference: team.seasonGoalDifference ?? 0,
      points: team.seasonPoints ?? 0,
      ppg: team.seasonPPG ?? 0,
      xgFor: team.xgFor ?? 0,
      xgAgainst: team.xgAgainst ?? 0,
      xgDifference: team.xgDifference ?? 0,
      cleanSheetPct: team.cleanSheetPercentage ?? 0,
      bttsPct: team.bttsPercentage ?? 0,
      over25Pct: team.over25Percentage ?? 0,
      cornersFor: team.cornersFor ?? 0,
      cornersAgainst: team.cornersAgainst ?? 0,
      cardsPerGame: team.cardsPerGame ?? 0,
    };
  }

  /**
   * Transforma árbitro
   */
  private transformReferee(referee: NormalizedReferee): RefereeDTO {
    return {
      id: referee.id,
      name: referee.name,
      cardsPerMatch: referee.cardsPerMatch,
      penaltiesPerMatch: referee.penaltiesPerMatch,
    };
  }

  /**
   * Transforma stats del partido
   */
  private transformMatchStats(stats: any): MatchStatsDTO {
    return {
      possession: stats.possession,
      shots: stats.shots,
      shotsOnTarget: stats.shotsOnTarget,
      corners: stats.corners,
      fouls: stats.fouls,
      yellowCards: stats.yellowCards,
      redCards: stats.redCards,
      offsides: stats.offsides,
      xg: stats.xg,
    };
  }

  /**
   * Icono para evento
   */
  private getEventIcon(type: string): string {
    switch (type) {
      case 'goal': return 'ball';
      case 'yellow': return 'yellow-card';
      case 'red': return 'red-card';
      case 'ownGoal': return 'own-goal';
      case 'penaltyMissed': return 'penalty-missed';
      default: return 'ball';
    }
  }
}
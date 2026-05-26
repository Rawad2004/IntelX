/**
 * Today's Match Service
 * 
 * Servicio que selecciona el "Match of the Day" y transforma
 * los datos al formato que espera el frontend MatchOfTheDay.
 * 
 * Ubicación: src/footystats/services/todays-match.service.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { MatchesService } from '../api/controllers/matches.service';
import { BehavioralAnalysisService } from './behavioral-analysis.service';
import { CacheService, CachePrefix, CacheTTL } from '../cache';

// TTL para Today's Match: 1 hora (mismo que MATCH_ANALYSIS)
const TODAYS_MATCH_TTL = CacheTTL.MATCH_ANALYSIS;
import { BehavioralReadyDTO, BehavioralAnalysisResponseDTO } from '../api/dto/behavioral-analysis.dto';
import {
  TodaysMatchResponseDTO,
  TodaysMatchDTOBuilder,
  BehaviorSnapshotDTO,
  DomainProfileDTO,
  TeamDTO,
  StabilityGate,
  RiskLevel,
  mapCBWToStabilityGate,
  mapCBWToCBWLevel,
  mapBandToRiskLevel,
  generateTeamTags,
} from '../api/dto/todays match.dto';

// Colores conocidos de equipos populares
const TEAM_COLORS: Record<string, string> = {
  'Arsenal': '#EF0107',
  'Chelsea': '#034694',
  'Liverpool': '#C8102E',
  'Manchester City': '#6CABDD',
  'Manchester United': '#DA291C',
  'Tottenham': '#132257',
  'Barcelona': '#A50044',
  'Real Madrid': '#FEBE10',
  'Bayern Munich': '#DC052D',
  'Borussia Dortmund': '#FDE100',
  'Paris Saint-Germain': '#004170',
  'Juventus': '#000000',
  'Inter Milan': '#0068A8',
  'AC Milan': '#FB090B',
  'Atletico Madrid': '#CB3524',
};

// Ligas por tier
const TIER_1_LEAGUES = [39, 140, 135, 78, 61]; // Premier, LaLiga, Serie A, Bundesliga, Ligue 1
const TIER_2_LEAGUES = [2, 3, 88, 94, 253];     // UCL, UEL, Eredivisie, Primeira, MLS
const TIER_3_LEAGUES = [262, 71, 128];          // Liga MX, Brasileirão, Argentina

@Injectable()
export class TodaysMatchService {
  private readonly logger = new Logger(TodaysMatchService.name);

  constructor(
    private readonly matchesService: MatchesService,
    private readonly behavioralService: BehavioralAnalysisService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Obtiene el partido del día para el landing page.
   * Cached por 1 hora.
   */
  async getTodaysMatch(): Promise<TodaysMatchResponseDTO | null> {
    const cacheKey = `${CachePrefix.ANALYSIS}:todays-match:v2`;
    
    // Intentar obtener de cache
    try {
      const cached = await this.cacheService.get<TodaysMatchResponseDTO>(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached today\'s match');
        return cached;
      }
    } catch (error) {
      this.logger.warn('Cache read error', error);
    }

    try {
      // 1. Obtener partidos de hoy
      const todaysMatches = await this.matchesService.getTodayMatches();
      
      if (!todaysMatches?.length) {
        this.logger.warn('No matches found for today');
        return null;
      }

      this.logger.log(`Found ${todaysMatches.length} matches for today`);

      // 2. Seleccionar el mejor partido
      const selectedMatch = await this.selectBestMatch(todaysMatches);
      
      if (!selectedMatch) {
        this.logger.warn('Could not select a match');
        return null;
      }

      this.logger.log(`Selected match: ${selectedMatch.homeTeam?.name} vs ${selectedMatch.awayTeam?.name}`);

      // 3. Obtener análisis comportamental
      let analysis: BehavioralAnalysisResponseDTO | null = null;
      try {
        analysis = await this.behavioralService.getAnalysis(selectedMatch.id);
      } catch (error) {
        this.logger.warn(`No behavioral analysis for match ${selectedMatch.id}`, error);
      }

      // 4. Transformar al DTO del frontend
      const response = this.transformToFrontendDTO(selectedMatch, analysis);

      // 5. Cachear resultado
      try {
        await this.cacheService.set(cacheKey, response, TODAYS_MATCH_TTL);
      } catch (error) {
        this.logger.warn('Cache write error', error);
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting today\'s match', error);
      return null;
    }
  }

  /**
   * Selecciona el partido más interesante basado en:
   * 1. CBW más estrecho (mayor confianza)
   * 2. Liga tier (Tier 1 preferido)
   * 3. Horario prime time (18:00-22:00)
   */
  private async selectBestMatch(matches: any[]): Promise<any | null> {
    if (!matches.length) return null;

    // Calcular score para cada partido
    const scored = await Promise.all(
      matches.map(async (match) => {
        const score = await this.calculateMatchScore(match);
        return { match, score };
      })
    );

    // Ordenar por score descendente
    scored.sort((a, b) => b.score - a.score);

    this.logger.debug(`Top match score: ${scored[0]?.score}`);
    return scored[0]?.match || null;
  }

  /**
   * Calcula un score para ranking de partidos
   */
  private async calculateMatchScore(match: any): Promise<number> {
    let score = 0;

    // Liga tier (máx 60 puntos) - FootyStats usa competition_id
    const leagueId = match.competition_id;
    if (TIER_1_LEAGUES.includes(leagueId)) {
      score += 60;
    } else if (TIER_2_LEAGUES.includes(leagueId)) {
      score += 40;
    } else if (TIER_3_LEAGUES.includes(leagueId)) {
      score += 20;
    }

    // Horario prime time 18:00-22:00 (máx 15 puntos)
    const matchDate = new Date((match.date_unix || 0) * 1000);
    const hour = matchDate.getHours();
    if (hour >= 18 && hour <= 22) {
      score += 15;
    } else if (hour >= 14 && hour <= 17) {
      score += 8;
    }

    // CBW - mayor confianza = más puntos (máx 25 puntos)
    try {
      const hasAnalysis = await this.behavioralService.hasReadyAnalysis(match.id);
      if (hasAnalysis) {
        const analysis = await this.behavioralService.getAnalysis(match.id);
        if (analysis?.status === 'ready') {
          const ready = analysis as BehavioralReadyDTO;
          if (ready.cbw?.state === 'narrow') {
            score += 25;
          } else if (ready.cbw?.state === 'medium') {
            score += 15;
          } else {
            score += 5;
          }
        }
      }
    } catch {
      // Sin análisis disponible
    }

    return score;
  }

  /**
   * Transforma los datos al formato del frontend MatchOfTheDay
   * NOTA: FootyStats usa snake_case: home_name, away_name, home_image, etc.
   */
  private transformToFrontendDTO(
    match: any,
    analysis: BehavioralAnalysisResponseDTO | null
  ): TodaysMatchResponseDTO {
    const builder = new TodaysMatchDTOBuilder();

    // Extraer liga desde match_url o competition_id
    const leagueName = this.extractLeagueName(match);
    
    // Info básica del partido
    builder.setMatchInfo(
      String(match.id),
      leagueName,
      this.formatTime(match.date_unix)
    );

    // Equipos - FootyStats usa home_name, away_name, home_image, away_image
    builder.setHomeTeam(this.buildTeamDTOFromFootyStats(match, analysis, true));
    builder.setAwayTeam(this.buildTeamDTOFromFootyStats(match, analysis, false));

    // Si hay análisis listo
    if (analysis?.status === 'ready') {
      const ready = analysis as BehavioralReadyDTO;
      
      builder.setBehaviorSnapshot(this.buildBehaviorSnapshot(ready));
      builder.setDomains([
        this.buildGoalsDomain(ready),
        this.buildCornersDomain(ready),
        this.buildCardsDomain(ready),
      ]);
      builder.setAiAnalysis(ready.envelope?.text || this.getDefaultAnalysis(match));
      builder.setQuickRead(ready.envelope?.summary || this.getDefaultQuickRead(match));
      builder.setDataConfidence(this.getDataConfidenceMessage(ready));
    } else {
      // Datos de fallback
      builder.setBehaviorSnapshot(this.getDefaultSnapshot());
      builder.setDomains([
        this.getDefaultDomain('Goals'),
        this.getDefaultDomain('Corners'),
        this.getDefaultDomain('Cards'),
      ]);
      builder.setAiAnalysis(this.getDefaultAnalysis(match));
      builder.setQuickRead(this.getDefaultQuickRead(match));
      builder.setDataConfidence('Analysis in progress - check back closer to kickoff');
    }

    return builder.build();
  }

  /**
   * Extrae el nombre de la liga desde match_url o usa competition_id
   */
  private extractLeagueName(match: any): string {
    // match_url tiene formato: "/netherlands/sc-cambuur-leeuwarden-vs-fc-emmen-h2h-stats"
    if (match.match_url) {
      const parts = match.match_url.split('/');
      if (parts.length >= 2) {
        // Capitalizar el país/liga
        const leaguePart = parts[1];
        return leaguePart
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
    
    // Fallback: usar competition_id para mapear ligas conocidas
    const leagueMap: Record<number, string> = {
      14987: 'Eredivisie',
      47: 'Premier League',
      87: 'La Liga',
      88: 'Serie A',
      78: 'Bundesliga',
      61: 'Ligue 1',
    };
    
    return leagueMap[match.competition_id] || `League ${match.competition_id || 'Unknown'}`;
  }

  /**
   * Construye TeamDTO desde estructura FootyStats (home_name, away_name, etc.)
   */
  private buildTeamDTOFromFootyStats(match: any, analysis: BehavioralAnalysisResponseDTO | null, isHome: boolean): TeamDTO {
    const name = isHome ? (match.home_name || 'Home Team') : (match.away_name || 'Away Team');
    const short = name.substring(0, 3).toUpperCase();
    const imageUrl = isHome ? match.home_image : match.away_image;
    
    // Construir URL completa del logo
    // FootyStats devuelve: "teams/argentina-ca-huracan.png"
    // URL correcta: "https://cdn.footystats.org/img/teams/argentina-ca-huracan.png"
    let logo: string | undefined;
    if (imageUrl) {
      if (imageUrl.startsWith('http')) {
        logo = imageUrl;
      } else if (imageUrl.startsWith('teams/')) {
        // Agregar prefijo /img/ que falta
        logo = `https://cdn.footystats.org/img/${imageUrl}`;
      } else {
        logo = `https://cdn.footystats.org/img/teams/${imageUrl}`;
      }
    }
    
    let tags: string[] = [];
    if (analysis?.status === 'ready') {
      const ready = analysis as BehavioralReadyDTO;
      const signals = ready.dominantSignals?.map(s => ({ id: s.id, band: s.band })) || [];
      tags = generateTeamTags(signals, isHome);
    } else {
      tags = isHome ? ['Home Advantage'] : ['Away Form'];
    }

    return {
      name,
      short,
      color: TEAM_COLORS[name] || this.generateTeamColor(name),
      tags,
      logo,
    };
  }

  /**
   * Construye el DTO de un equipo (legacy - para compatibilidad)
   */
  private buildTeamDTO(team: any, analysis: BehavioralAnalysisResponseDTO | null, isHome: boolean): TeamDTO {
    const name = team?.name || (isHome ? 'Home Team' : 'Away Team');
    const short = team?.shortName || name.substring(0, 3).toUpperCase();
    
    let tags: string[] = [];
    if (analysis?.status === 'ready') {
      const ready = analysis as BehavioralReadyDTO;
      const signals = ready.dominantSignals?.map(s => ({ id: s.id, band: s.band })) || [];
      tags = generateTeamTags(signals, isHome);
    } else {
      tags = isHome ? ['Home Advantage'] : ['Away Form'];
    }

    return {
      name,
      short,
      color: TEAM_COLORS[name] || this.generateTeamColor(name),
      tags,
      logo: team?.logo,
    };
  }

  /**
   * Genera un color basado en el nombre del equipo
   */
  private generateTeamColor(teamName: string): string {
    let hash = 0;
    for (let i = 0; i < teamName.length; i++) {
      hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 45%)`;
  }

  /**
   * Construye el Behavior Snapshot desde el análisis
   */
  private buildBehaviorSnapshot(analysis: BehavioralReadyDTO): BehaviorSnapshotDTO {
    const cbwLevel = mapCBWToCBWLevel(analysis.cbw.state);
    const stabilityGate = mapCBWToStabilityGate(analysis.cbw.state);

    // Extraer pressure profile de señales
    const tpiSignal = analysis.dominantSignals?.find(s => s.id === 'TPI');
    const pressureProfile: RiskLevel = tpiSignal 
      ? mapBandToRiskLevel(tpiSignal.band) 
      : 'Medium';

    // Resolution style desde structural factors
    const resolutionStyle = analysis.structuralFactors?.resolution?.description 
      || this.inferResolutionStyle(analysis);

    // Break risk basado en contradicciones y flags
    let breakRisk: RiskLevel = 'Medium';
    const flagCount = analysis.riskFlags?.count || 0;
    if (analysis.contradictions?.hasContradictions || flagCount > 2) {
      breakRisk = 'High';
    } else if (flagCount === 0 && !analysis.contradictions?.hasContradictions) {
      breakRisk = 'Low';
    }

    return {
      pressureProfile,
      resolutionStyle,
      breakRisk,
      cbwLevel,
      stabilityGate,
    };
  }

  /**
   * Infiere el estilo de resolución desde las señales
   */
  private inferResolutionStyle(analysis: BehavioralReadyDTO): string {
    const signals = analysis.dominantSignals || [];
    const parts: string[] = [];

    const wds = signals.find(s => s.id === 'WDS');
    const wrf = signals.find(s => s.id === 'WRF');
    const lrf = signals.find(s => s.id === 'LRF');
    const drf = signals.find(s => s.id === 'DRF');

    if (wds?.band === 'HIGH' || wrf?.band === 'HIGH') {
      parts.push('Wing Crosses');
    }
    if (lrf?.band === 'HIGH') {
      parts.push('Late Goals');
    }
    if (drf?.band === 'HIGH') {
      parts.push('Direct Play');
    }

    if (parts.length === 0) {
      parts.push('Mixed Resolution');
    }

    return parts.join(' + ');
  }

  /**
   * Construye el domain de Goals
   */
  private buildGoalsDomain(analysis: BehavioralReadyDTO): DomainProfileDTO {
    const sesSignal = analysis.dominantSignals?.find(s => s.id === 'SES');
    const cfsSignal = analysis.dominantSignals?.find(s => s.id === 'CFS');
    
    const status = this.determineStatus(sesSignal?.band, analysis.cbw.state);

    return {
      domain: 'Goals',
      status,
      summary: sesSignal?.explanation || 'Goal-scoring patterns are within expected parameters.',
      drivers: this.extractDrivers(analysis, ['TPI', 'SES', 'CFS']),
      uncertaintyFactors: this.extractUncertaintyFactors(analysis),
      leagueBaseline: 'Medium',
      matchRegime: sesSignal ? mapBandToRiskLevel(sesSignal.band) : 'Medium',
    };
  }

  /**
   * Construye el domain de Corners
   */
  private buildCornersDomain(analysis: BehavioralReadyDTO): DomainProfileDTO {
    const wdsSignal = analysis.dominantSignals?.find(s => s.id === 'WDS');
    const status = this.determineStatus(wdsSignal?.band, analysis.cbw.state);

    return {
      domain: 'Corners',
      status,
      summary: wdsSignal?.explanation || 'Corner patterns depend on width exploitation.',
      drivers: this.extractDrivers(analysis, ['WDS', 'WRF', 'TIS']),
      uncertaintyFactors: ['Weather may affect delivery', 'Tactical changes possible'],
      leagueBaseline: 'Medium',
      matchRegime: wdsSignal ? mapBandToRiskLevel(wdsSignal.band) : 'Medium',
    };
  }

  /**
   * Construye el domain de Cards
   */
  private buildCardsDomain(analysis: BehavioralReadyDTO): DomainProfileDTO {
    const dvsSignal = analysis.dominantSignals?.find(s => s.id === 'DVS');
    // Cards siempre más incertidumbre
    const status: StabilityGate = dvsSignal?.band === 'HIGH' ? 'AMBER' : 'RED';

    return {
      domain: 'Cards',
      status,
      summary: 'Card outcomes are referee-dependent and scoreline-sensitive.',
      drivers: this.extractDrivers(analysis, ['DVS', 'PCS']),
      uncertaintyFactors: ['Referee assignment pending', 'Scoreline dependency high'],
      leagueBaseline: 'Medium',
      matchRegime: dvsSignal ? mapBandToRiskLevel(dvsSignal.band) : 'Medium',
    };
  }

  /**
   * Determina el status basado en la señal y CBW
   */
  private determineStatus(signalBand?: string, cbwState?: string): StabilityGate {
    if (cbwState === 'wide') return 'RED';
    if (!signalBand) return 'AMBER';
    if (signalBand === 'HIGH' && cbwState === 'narrow') return 'GREEN';
    if (signalBand === 'MEDIUM' || cbwState === 'medium') return 'AMBER';
    return 'RED';
  }

  /**
   * Extrae drivers de las señales
   */
  private extractDrivers(analysis: BehavioralReadyDTO, signalIds: string[]): string[] {
    const drivers: string[] = [];
    
    for (const id of signalIds) {
      const signal = analysis.dominantSignals?.find(s => s.id === id);
      if (signal) {
        drivers.push(`${signal.name}: ${signal.bandLabel}`);
      }
    }

    if (drivers.length === 0) {
      drivers.push('Pattern analysis in progress');
    }

    return drivers.slice(0, 3);
  }

  /**
   * Extrae factores de incertidumbre
   */
  private extractUncertaintyFactors(analysis: BehavioralReadyDTO): string[] {
    const factors: string[] = [];

    if (analysis.contradictions?.hasContradictions) {
      factors.push('Form data shows contradictions');
    }

    const riskItems = analysis.riskFlags?.items || [];
    for (const item of riskItems.slice(0, 2)) {
      factors.push(item.message);
    }

    if (factors.length === 0) {
      factors.push('Standard pre-match uncertainty');
    }

    return factors.slice(0, 2);
  }

  /**
   * Mensaje de confianza de datos
   */
  private getDataConfidenceMessage(analysis: BehavioralReadyDTO): string {
    if (analysis.cbw.state === 'narrow') {
      return 'Strong recent data available for both teams';
    }
    if (analysis.cbw.state === 'medium') {
      return 'Moderate data confidence - some gaps in recent form';
    }
    return 'Limited recent data - interpret with caution';
  }

  // ============================================
  // FALLBACK METHODS
  // ============================================

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  private getDefaultSnapshot(): BehaviorSnapshotDTO {
    return {
      pressureProfile: 'Medium',
      resolutionStyle: 'Analysis pending',
      breakRisk: 'Medium',
      cbwLevel: 'Wide',
      stabilityGate: 'AMBER',
    };
  }

  private getDefaultDomain(domain: 'Goals' | 'Corners' | 'Cards'): DomainProfileDTO {
    return {
      domain,
      status: 'AMBER',
      summary: `${domain} analysis is being processed.`,
      drivers: ['Data collection in progress'],
      uncertaintyFactors: ['Full analysis not yet available'],
      leagueBaseline: 'Medium',
      matchRegime: 'Medium',
    };
  }

  private getDefaultAnalysis(match: any): string {
    const home = match.home_name || 'Home team';
    const away = match.away_name || 'Away team';
    return `The IntelX engine is processing behavioral patterns for ${home} vs ${away}. Full analysis including pressure indices, resolution pathways, and confidence governance will be available closer to kickoff. Early indicators suggest standard pre-match preparation with behavioral modeling in progress.`;
  }

  private getDefaultQuickRead(match: any): string {
    const home = match.home_name || 'Home team';
    const away = match.away_name || 'Away team';
    return `${home} vs ${away} is being analyzed. Behavioral patterns and confidence bands will be finalized closer to kickoff. Check back for the complete assessment.`;
  }
}
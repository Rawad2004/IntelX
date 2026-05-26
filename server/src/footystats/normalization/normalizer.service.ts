/**
 * Normalizer Service
 * 
 * Servicio principal que orquesta toda la normalización de datos
 * de FootyStats a tipos IntelX.
 * 
 * Este servicio es el ÚNICO punto de entrada para normalización.
 * Garantiza que TODOS los datos pasen por el odds stripper.
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  FootyStatsMatch,
  FootyStatsMatchDetails,
  FootyStatsTeam,
  FootyStatsLastX,
  FootyStatsLeague,
  FootyStatsReferee,
} from '@shared/types';
import type {
  NormalizedMatch,
  NormalizedMatchDetails,
  NormalizedTeam,
  NormalizedLastX,
  NormalizedLeague,
  NormalizedReferee,
  FormValidation,
  SignalInput,
} from '@shared/types';

import { MatchNormalizer } from './match.normalizer';
import { TeamNormalizer } from './team.normalizer';
import { LastXNormalizer } from './lastx.normalizer';
import { FormValidator } from './form.validator';
import { stripProhibitedFieldsDeep, findProhibitedFieldsDeep } from './odds.stripper';

@Injectable()
export class NormalizerService {
  private readonly logger = new Logger(NormalizerService.name);

  constructor(
    private readonly matchNormalizer: MatchNormalizer,
    private readonly teamNormalizer: TeamNormalizer,
    private readonly lastXNormalizer: LastXNormalizer,
    private readonly formValidator: FormValidator,
  ) {}

  // ===========================================================================
  // MATCH NORMALIZATION
  // ===========================================================================

  /**
   * Normaliza un partido para vista de lista
   */
  normalizeMatch(raw: FootyStatsMatch): NormalizedMatch {
    this.logProhibitedFields(raw, 'match');
    return this.matchNormalizer.normalizeBasic(raw);
  }

  /**
   * Normaliza múltiples partidos para vista de lista
   */
  normalizeMatches(rawMatches: FootyStatsMatch[]): NormalizedMatch[] {
    return rawMatches.map(m => this.normalizeMatch(m));
  }

  /**
   * Normaliza un partido con todos los detalles
   */
  normalizeMatchDetails(
    rawMatch: FootyStatsMatchDetails,
    rawHomeTeam: FootyStatsTeam,
    rawAwayTeam: FootyStatsTeam,
    rawHomeLastX: FootyStatsLastX,
    rawAwayLastX: FootyStatsLastX,
    rawLeague: FootyStatsLeague,
    rawReferee?: FootyStatsReferee,
  ): NormalizedMatchDetails {
    // Log any prohibited fields found
    this.logProhibitedFields(rawMatch, 'matchDetails');
    this.logProhibitedFields(rawHomeTeam, 'homeTeam');
    this.logProhibitedFields(rawAwayTeam, 'awayTeam');

    return this.matchNormalizer.normalizeDetails(
      rawMatch,
      rawHomeTeam,
      rawAwayTeam,
      rawHomeLastX,
      rawAwayLastX,
      rawLeague,
      rawReferee,
    );
  }

  // ===========================================================================
  // TEAM NORMALIZATION
  // ===========================================================================

  /**
   * Normaliza un equipo
   */
  normalizeTeam(raw: FootyStatsTeam): NormalizedTeam {
    this.logProhibitedFields(raw, 'team');
    return this.teamNormalizer.normalize(raw);
  }

  // ===========================================================================
  // LAST X NORMALIZATION
  // ===========================================================================

  /**
   * Normaliza datos de Last X
   */
  normalizeLastX(raw: FootyStatsLastX): NormalizedLastX {
    this.logProhibitedFields(raw, 'lastX');
    return this.lastXNormalizer.normalize(raw);
  }

  // ===========================================================================
  // FORM VALIDATION
  // ===========================================================================

  /**
   * Valida la forma de ambos equipos
   */
  validateForm(
    homeLastX: NormalizedLastX,
    awayLastX: NormalizedLastX,
  ): FormValidation {
    return this.formValidator.validate(homeLastX, awayLastX);
  }

  // ===========================================================================
  // SIGNAL INPUT BUILDER
  // ===========================================================================

  /**
   * Construye el input para los calculadores de señales
   * Este es el método que conecta la normalización con el cálculo de señales
   */
  buildSignalInput(matchDetails: NormalizedMatchDetails): SignalInput {
    return {
      homeTeam: matchDetails.homeTeamFull,
      awayTeam: matchDetails.awayTeamFull,
      homeLastX: matchDetails.homeLastX,
      awayLastX: matchDetails.awayLastX,
      league: matchDetails.league,
      referee: matchDetails.referee,
      h2h: matchDetails.h2h,
    };
  }

  /**
   * Método completo: normaliza y construye input para señales
   */
  async prepareForAnalysis(
    rawMatch: FootyStatsMatchDetails,
    rawHomeTeam: FootyStatsTeam,
    rawAwayTeam: FootyStatsTeam,
    rawHomeLastX: FootyStatsLastX,
    rawAwayLastX: FootyStatsLastX,
    rawLeague: FootyStatsLeague,
    rawReferee?: FootyStatsReferee,
  ): Promise<{
    matchDetails: NormalizedMatchDetails;
    signalInput: SignalInput;
    formValidation: FormValidation;
  }> {
    // 1. Normalizar partido completo
    const matchDetails = this.normalizeMatchDetails(
      rawMatch,
      rawHomeTeam,
      rawAwayTeam,
      rawHomeLastX,
      rawAwayLastX,
      rawLeague,
      rawReferee,
    );

    // 2. Construir input para señales
    const signalInput = this.buildSignalInput(matchDetails);

    // 3. Validar forma
    const formValidation = this.validateForm(
      matchDetails.homeLastX,
      matchDetails.awayLastX,
    );

    this.logger.log(
      `Prepared analysis for match ${matchDetails.id}: ` +
      `${matchDetails.homeTeam.name} vs ${matchDetails.awayTeam.name}`,
    );

    return {
      matchDetails,
      signalInput,
      formValidation,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Log de campos prohibidos encontrados (para debugging)
   */
  private logProhibitedFields(obj: any, context: string): void {
    const prohibited = findProhibitedFieldsDeep(obj);
    
    if (prohibited.length > 0) {
      this.logger.warn(
        `Found ${prohibited.length} prohibited fields in ${context}: ${prohibited.slice(0, 5).join(', ')}${prohibited.length > 5 ? '...' : ''}`,
      );
    }
  }

  /**
   * Limpia cualquier objeto de campos prohibidos
   * Útil para datos que llegan de fuentes no controladas
   */
  sanitize<T>(obj: T): T {
    return stripProhibitedFieldsDeep(obj);
  }

  /**
   * Verifica si los datos son suficientes para análisis
   */
  isDataSufficient(matchDetails: NormalizedMatchDetails): {
    sufficient: boolean;
    missing: string[];
  } {
    const missing: string[] = [];

    // Verificar datos de equipo
    if (!matchDetails.homeTeamFull.seasonMatchesPlayed) {
      missing.push('homeTeam seasonStats');
    }
    if (!matchDetails.awayTeamFull.seasonMatchesPlayed) {
      missing.push('awayTeam seasonStats');
    }

    // Verificar Last X
    if (!this.lastXNormalizer.isDataSufficient(matchDetails.homeLastX)) {
      missing.push('homeLastX');
    }
    if (!this.lastXNormalizer.isDataSufficient(matchDetails.awayLastX)) {
      missing.push('awayLastX');
    }

    // Verificar forma
    if (!this.formValidator.isDataSufficient(matchDetails.homeLastX, matchDetails.awayLastX)) {
      missing.push('formData');
    }

    return {
      sufficient: missing.length === 0,
      missing,
    };
  }
}
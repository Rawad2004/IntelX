/**
 * Normalization Module
 * 
 * Módulo NestJS que registra todos los normalizadores.
 */

import { Module } from '@nestjs/common';

import { NormalizerService } from './normalizer.service';
import { MatchNormalizer } from './match.normalizer';
import { TeamNormalizer } from './team.normalizer';
import { LastXNormalizer } from './lastx.normalizer';
import { FormValidator } from './form.validator';

@Module({
  providers: [
    NormalizerService,
    MatchNormalizer,
    TeamNormalizer,
    LastXNormalizer,
    FormValidator,
  ],
  exports: [
    NormalizerService,
    MatchNormalizer,
    TeamNormalizer,
    LastXNormalizer,
    FormValidator,
  ],
})
export class NormalizationModule {}
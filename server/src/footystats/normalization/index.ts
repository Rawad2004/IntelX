/**
 * Normalization Module Index
 */

export { NormalizationModule } from './normalization.module';
export { NormalizerService } from './normalizer.service';
export { MatchNormalizer } from './match.normalizer';
export { TeamNormalizer } from './team.normalizer';
export { LastXNormalizer } from './lastx.normalizer';
export { FormValidator } from './form.validator';

// Odds stripper utilities
export {
  stripProhibitedFields,
  stripProhibitedFieldsDeep,
  findProhibitedFields,
  findProhibitedFieldsDeep,
  stripAndLog,
} from './odds.stripper';
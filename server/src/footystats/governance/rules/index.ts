/**
 * Governance Rules Index
 */

export {
  ALL_WIDEN_RULES,
  tpiSesConflictRule,
  gssMviConflictRule,
  highVolatilityRule,
  formContradictionRule,
  lowConfidenceRule,
  resolutionConflictRule,
  extremeDifferentialRule,
  missingRefereeRule,
} from './widen.rules';
export type { WidenRule, WidenRuleResult } from './widen.rules';

export {
  ALL_NARROW_RULES,
  NARROW_THRESHOLD,
  signalAlignmentRule,
  highDataConfidenceRule,
  lowVolatilityRule,
  consistentFormRule,
} from './narrow.rules';
export type { NarrowRule, NarrowRuleResult } from './narrow.rules';
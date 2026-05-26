/**
 * Governance Module Index
 * 
 * Punto de entrada principal para el módulo de gobernanza CBW.
 * 
 * Usage:
 * ```typescript
 * import { GovernanceModule, CBWGovernanceService } from './governance';
 * import type { CBWUIStyle } from './governance';
 * ```
 */

export { GovernanceModule } from './governance.module';
export { CBWGovernanceService } from './cbw.service';
export type { CBWUIStyle } from './cbw.service';
export * from './rules';
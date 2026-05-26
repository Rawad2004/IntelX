/**
 * Governance Module
 * 
 * Módulo NestJS que registra el servicio de CBW Governance.
 * 
 * Usage:
 * ```typescript
 * // En footystats.module.ts
 * imports: [GovernanceModule]
 * ```
 */

import { Module } from '@nestjs/common';
import { CBWGovernanceService } from './cbw.service';

@Module({
  providers: [CBWGovernanceService],
  exports: [CBWGovernanceService],
})
export class GovernanceModule {}
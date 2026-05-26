/**
 * Services Module
 * 
 * Módulo NestJS que registra los servicios de integración.
 */

import { Module, forwardRef } from '@nestjs/common';

import { MatchDataService } from './match-data.service';
import { AnalysisService } from './analysis.service';
import { FootystatsGateway } from '../footystats.gateway';
import { FootyAiService } from '../ai/footy-ai.service';

// Importar módulos dependientes
import { NormalizationModule } from '../normalization';
import { SignalsModule } from '../signals';
import { GovernanceModule } from '../governance';
import { ApiModule } from '../api';

@Module({
  imports: [
    NormalizationModule,
    SignalsModule,
    GovernanceModule,
    forwardRef(() => ApiModule), // forwardRef para evitar dependencia circular
  ],
  providers: [
    MatchDataService,
    AnalysisService,
    FootystatsGateway,
    FootyAiService,
  ],
  exports: [
    MatchDataService,
    AnalysisService,
  ],
})
export class ServicesModule {}
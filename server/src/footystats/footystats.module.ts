/**
 * Footystats Module (con Cache)
 * 
 * Módulo principal de FootyStats que integra todos los submódulos.
 * Ahora incluye IntelXCacheModule para caching global.
 * 
 * Ubicación: src/footystats/footystats.module.ts
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Cache Module (Global)
import { IntelXCacheModule } from './cache';

// Sub-modules
import { ApiModule } from './api/api.module';
import { ServicesModule } from './services/services.module';
import { NormalizationModule } from './normalization/normalization.module';
import { SignalsModule } from './signals/signals.module';

// Legacy components
import { FootystatsGateway } from './footystats.gateway';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    
    // Cache global - debe estar antes de otros módulos que lo usen
    IntelXCacheModule,
    
    // Sub-modules
    ApiModule,
    ServicesModule,
    NormalizationModule,
    SignalsModule,
  ],
  providers: [
    FootystatsGateway,
  ],
  exports: [
    FootystatsGateway,
    ApiModule,
    ServicesModule,
    IntelXCacheModule,
  ],
})
export class FootystatsModule {}
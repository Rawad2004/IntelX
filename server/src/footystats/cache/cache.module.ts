/**
 * Cache Module
 * 
 * Módulo de cache para IntelX.
 * Exporta CacheService como singleton global.
 * 
 * Ubicación: src/footystats/cache/cache.module.ts
 */

import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class IntelXCacheModule {}

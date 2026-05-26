/**
 * Cache Service
 * 
 * Servicio de cache en memoria para IntelX.
 * Cachea análisis AI y datos de FootyStats para reducir
 * llamadas a APIs externas y costos de OpenAI.
 * 
 * TTL Strategy:
 * - Match data (FootyStats): 5 minutos
 * - AI Analysis: 1 hora (partido no iniciado)
 * - AI Analysis: 5 minutos (partido en vivo) - TODO
 * - League data: 15 minutos
 * - Today's matches: 2 minutos
 * 
 * Ubicación: src/footystats/cache/cache.service.ts
 */

import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

// TTL en milisegundos
export const CacheTTL = {
  MATCH_DATA: 5 * 60 * 1000,        // 5 minutos
  MATCH_ANALYSIS: 60 * 60 * 1000,   // 1 hora
  MATCH_PREVIEW: 30 * 60 * 1000,    // 30 minutos
  LEAGUE_MATCHES: 15 * 60 * 1000,   // 15 minutos
  TODAY_MATCHES: 2 * 60 * 1000,     // 2 minutos
  TEAM_STATS: 30 * 60 * 1000,       // 30 minutos
  SIGNALS: 60 * 60 * 1000,          // 1 hora (determinísticos)
  CBW: 60 * 60 * 1000,              // 1 hora
} as const;

// Prefijos para keys
export const CachePrefix = {
  MATCH: 'match',
  ANALYSIS: 'analysis',
  PREVIEW: 'preview',
  SIGNALS: 'signals',
  CBW: 'cbw',
  LEAGUE: 'league',
  TODAY: 'today',
  TEAM: 'team',
} as const;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  
  // Stats
  private hits = 0;
  private misses = 0;

  /**
   * Genera una key de cache
   */
  makeKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Obtiene un valor del cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      this.logger.debug(`Cache EXPIRED: ${key}`);
      return null;
    }

    this.hits++;
    this.logger.debug(`Cache HIT: ${key}`);
    return entry.data as T;
  }

  /**
   * Guarda un valor en el cache
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    const entry: CacheEntry<T> = {
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cache SET: ${key} (TTL: ${ttlMs / 1000}s)`);
  }

  /**
   * Elimina un valor del cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache DELETE: ${key}`);
    }
    return deleted;
  }

  /**
   * Elimina valores por prefijo
   */
  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.logger.debug(`Cache DELETE by prefix "${prefix}": ${count} entries`);
    return count;
  }

  /**
   * Invalida cache de un partido específico
   * Útil cuando cambia el estado del partido
   */
  invalidateMatch(matchId: number): void {
    const prefixes = [
      this.makeKey(CachePrefix.MATCH, matchId),
      this.makeKey(CachePrefix.ANALYSIS, matchId),
      this.makeKey(CachePrefix.PREVIEW, matchId),
      this.makeKey(CachePrefix.SIGNALS, matchId),
      this.makeKey(CachePrefix.CBW, matchId),
    ];

    let count = 0;
    for (const prefix of prefixes) {
      if (this.cache.delete(prefix)) {
        count++;
      }
    }

    this.logger.log(`Invalidated cache for match ${matchId}: ${count} entries`);
  }

  /**
   * Limpia entradas expiradas
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.logger.log(`Cache cleanup: removed ${count} expired entries`);
    }

    return count;
  }

  /**
   * Limpia todo el cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.logger.log(`Cache cleared: ${size} entries removed`);
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Verifica si una key existe y no está expirada
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Obtiene el tiempo restante de TTL en segundos
   */
  getTTL(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : null;
  }

  /**
   * Wrapper para get-or-set pattern
   * Si el valor existe en cache, lo devuelve
   * Si no, ejecuta la función y guarda el resultado
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttlMs: number
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute factory
    const data = await factory();
    
    // Save to cache
    this.set(key, data, ttlMs);
    
    return data;
  }
}

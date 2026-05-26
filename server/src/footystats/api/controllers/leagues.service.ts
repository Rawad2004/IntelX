/**
 * Leagues Service
 * 
 * Servicio para obtener ligas desde FootyStats.
 * Integrado dentro de footystats/api/controllers.
 * 
 * Ubicación: src/footystats/api/controllers/leagues.service.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CacheService, CacheTTL, CachePrefix } from '../../cache';

/**
 * Normaliza la URL de imagen
 * FootyStats devuelve URLs en varios formatos:
 * - "https://cdn.footystats.org/img/..." (completa)
 * - "img/competitions/..." (relativa)
 * - "/img/competitions/..." (relativa con /)
 */
function normalizeImageUrl(image: string | null | undefined, fallbackBase: string): string | null {
  if (!image) return null;
  
  // Si ya es una URL completa de CDN, usarla directamente
  if (image.startsWith('https://cdn.footystats.org')) {
    return image;
  }
  
  // Si es una URL completa de otro dominio, usarla
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  
  // Si es relativa, construir URL completa con CDN
  const cleanPath = image.startsWith('/') ? image.slice(1) : image;
  return `https://cdn.footystats.org/${cleanPath}`;
}

/**
 * Aplana las temporadas de una liga de FootyStats.
 *
 * FootyStats /league-list shape:
 *   { name, country, league_name, image, season: [{ id, year }, ...] }
 *
 * Cada match en today_matches viene con competition_id = season.id (no league id),
 * así que necesitamos un registro por temporada para poder resolver por ID.
 */
function flattenLeagueSeasons(raw: any, imageBase: string): any[] {
  const seasons = Array.isArray(raw?.season) ? raw.season : [];
  const image = normalizeImageUrl(raw?.image, imageBase);
  const name = raw?.name || raw?.league_name || null;
  const country = raw?.country ?? null;
  const countryCode = raw?.country_code ?? null;

  if (seasons.length === 0) {
    return raw?.id
      ? [
          {
            id: raw.id,
            name,
            country,
            countryCode,
            image,
            year: null,
          },
        ]
      : [];
  }

  return seasons
    .filter((s: any) => Number.isFinite(Number(s?.id)))
    .map((s: any) => ({
      id: Number(s.id),
      name,
      country,
      countryCode,
      image,
      year: s?.year ?? null,
    }));
}

@Injectable()
export class LeaguesService {
  private readonly logger = new Logger(LeaguesService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly imageBase: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.baseUrl = this.configService.get<string>('FOOTYSTATS_BASE_URL') || 
                   'https://api.football-data-api.com';
    this.apiKey = this.configService.get<string>('FOOTYSTATS_API_KEY') || '';
    this.imageBase = this.configService.get<string>('FOOTYSTATS_IMAGE_BASE') || 
                     'https://cdn.footystats.org';
  }

  /**
   * Helper para hacer requests a FootyStats
   */
  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const queryParams = new URLSearchParams({
      key: this.apiKey,
      ...params,
    });

    this.logger.debug(`FootyStats request: ${endpoint}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${url}?${queryParams}`)
      );

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'FootyStats API error');
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('FootyStats API error: 404 Not Found');
      }
      throw error;
    }
  }

  /**
   * Lista todas las ligas
   */
  async list(params?: { q?: string; countryId?: number }) {
    // Cache key basado en countryId
    const cacheKey = this.cacheService.makeKey(
      'leagues',
      params?.countryId || 'all'
    );

    // TTL de 30 minutos para ligas (no cambian frecuentemente)
    const LEAGUES_TTL = 30 * 60 * 1000;

    const allLeagues = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.log(`Fetching leagues from API`);
        
        const requestParams: Record<string, string> = {};
        if (params?.countryId) {
          requestParams.country_id = params.countryId.toString();
        }

        const response = await this.request<any>('/league-list', requestParams);
        const data = Array.isArray(response?.data) ? response.data : [];

        const leagues: any[] = [];
        for (const item of data) {
          leagues.push(...flattenLeagueSeasons(item, this.imageBase));
        }

        leagues.sort((a: any, b: any) =>
          (a.country ?? '').localeCompare(b.country ?? '') ||
          (a.name ?? '').localeCompare(b.name ?? '')
        );

        return leagues;
      },
      LEAGUES_TTL
    );

    // Filtrar por query si existe (después del cache para no duplicar entradas)
    if (params?.q) {
      const q = params.q.trim().toLowerCase();
      return allLeagues.filter((l: any) =>
        `${l.name ?? ''} ${l.country ?? ''}`.toLowerCase().includes(q)
      );
    }

    return allLeagues;
  }

  /**
   * Busca una liga por competitionId (FootyStats season id).
   * Devuelve null si no se encuentra o si la llamada falla.
   * Usa el cache compartido de list() — primera llamada llena el cache,
   * siguientes son lookups en memoria.
   */
  async findById(competitionId: number | null | undefined): Promise<{
    id: number;
    name: string | null;
    country: string | null;
    image: string | null;
  } | null> {
    if (!competitionId || !Number.isFinite(competitionId)) return null;

    try {
      const all = await this.list();
      const found = all.find((l: any) => Number(l.id) === Number(competitionId));
      if (!found) return null;
      return {
        id: found.id,
        name: found.name ?? null,
        country: found.country ?? null,
        image: found.image ?? null,
      };
    } catch (err: any) {
      this.logger.warn(
        `findById(${competitionId}) failed: ${err?.message ?? err}`,
      );
      return null;
    }
  }
}
/**
 * Common DTOs
 * 
 * DTOs compartidos por todos los endpoints.
 * Estos definen la estructura de las respuestas de API.
 */

/**
 * Wrapper estándar para todas las respuestas de API
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta?: ApiMeta;
  error?: ApiError;
}

/**
 * Metadata de la respuesta
 */
export interface ApiMeta {
  timestamp: string;
  count?: number;
  page?: number;
  totalPages?: number;
  totalItems?: number;
}

/**
 * Error de API
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Paginación para queries
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta & {
    page: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Información básica de liga para embeber en otros DTOs
 */
export interface LeagueBasicDTO {
  id: number;
  name: string;
  image: string;
  country?: string;
}

/**
 * Información básica de equipo para embeber en otros DTOs
 */
export interface TeamBasicDTO {
  id: number;
  name: string;
  shortName: string;
  image: string;
  position?: number;
}

/**
 * Indicador de forma para UI (los puntos W/D/L)
 */
export interface FormIndicatorDTO {
  result: 'W' | 'D' | 'L';
  color: 'green' | 'yellow' | 'red';
}

/**
 * CBW para UI
 */
export interface CBWDTO {
  state: 'narrow' | 'medium' | 'wide';
  label: string;
  color: 'green' | 'yellow' | 'red';
  confidence: number;
  reasons: string[];
}

/**
 * Helper para crear respuesta exitosa
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ApiMeta>,
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Helper para crear respuesta de error
 */
export function createErrorResponse<T = never>(
  code: string,
  message: string,
  details?: Record<string, any>,
): ApiResponse<T> {
  return {
    success: false,
    data: null,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Helper para crear respuesta paginada
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      count: data.length,
      page,
      totalPages,
      totalItems,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
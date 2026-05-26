/**
 * Odds Stripper
 * 
 * CRÍTICO: Elimina TODOS los datos prohibidos de los objetos de FootyStats
 * antes de que entren al sistema IntelX.
 * 
 * Datos prohibidos (del Canonical Spec):
 * - Odds/cuotas de cualquier tipo
 * - Predicciones de FootyStats
 * - Tips o recomendaciones
 * - Datos de mercado
 * 
 * Este módulo es la PRIMERA línea de defensa contra datos prohibidos.
 */

/**
 * Lista de prefijos/patrones de campos prohibidos
 */
const PROHIBITED_FIELD_PATTERNS = [
  // Odds
  'odds_',
  'odd_',
  'betting_',
  'bet_',
  
  // Predictions
  'prediction',
  'predicted',
  'tip_',
  'tips_',
  'pick_',
  
  // Market data
  'market_',
  'price_',
  'value_bet',
  
  // Probability percentages that imply betting
  'win_probability',
  'draw_probability',
  'loss_probability',
];

/**
 * Lista de campos específicos prohibidos
 */
const PROHIBITED_FIELDS = new Set([
  // Explicit odds fields from FootyStats
  'odds_ft_1',
  'odds_ft_x', 
  'odds_ft_2',
  'odds_ft_over05',
  'odds_ft_over15',
  'odds_ft_over25',
  'odds_ft_over35',
  'odds_ft_over45',
  'odds_ft_under05',
  'odds_ft_under15',
  'odds_ft_under25',
  'odds_ft_under35',
  'odds_ft_under45',
  'odds_btts_yes',
  'odds_btts_no',
  'odds_1x',
  'odds_x2',
  'odds_12',
  'odds_comparison',
  'pre_match_odds',
  'live_odds',
  
  // FootyStats predictions
  'match_prediction',
  'score_prediction',
  'predicted_winner',
  'tip',
  'best_bet',
  'value_bet',
  
  // Any field that could be confused with betting advice
  'recommended_bet',
  'suggested_outcome',
]);

/**
 * Verifica si un nombre de campo está prohibido
 */
function isProhibitedField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  
  // Check exact matches
  if (PROHIBITED_FIELDS.has(lowerField)) {
    return true;
  }
  
  // Check patterns
  for (const pattern of PROHIBITED_FIELD_PATTERNS) {
    if (lowerField.startsWith(pattern) || lowerField.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Elimina campos prohibidos de un objeto (shallow)
 * 
 * @param obj - Objeto a limpiar
 * @returns Objeto sin campos prohibidos
 */
export function stripProhibitedFields<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const cleaned = { ...obj };
  
  for (const key of Object.keys(cleaned)) {
    if (isProhibitedField(key)) {
      delete cleaned[key];
    }
  }
  
  return cleaned;
}

/**
 * Elimina campos prohibidos de un objeto (deep/recursivo)
 * 
 * @param obj - Objeto a limpiar recursivamente
 * @returns Objeto sin campos prohibidos en ningún nivel
 */
export function stripProhibitedFieldsDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => stripProhibitedFieldsDeep(item)) as unknown as T;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (!isProhibitedField(key)) {
      cleaned[key] = stripProhibitedFieldsDeep(value);
    }
  }
  
  return cleaned as T;
}

/**
 * Verifica si un objeto contiene campos prohibidos
 * Útil para logging/debugging
 * 
 * @param obj - Objeto a verificar
 * @returns Array de campos prohibidos encontrados
 */
export function findProhibitedFields(obj: Record<string, any>): string[] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }

  const found: string[] = [];
  
  for (const key of Object.keys(obj)) {
    if (isProhibitedField(key)) {
      found.push(key);
    }
  }
  
  return found;
}

/**
 * Verifica recursivamente si hay campos prohibidos
 */
export function findProhibitedFieldsDeep(
  obj: any,
  path: string = '',
): string[] {
  if (obj === null || obj === undefined) {
    return [];
  }

  if (Array.isArray(obj)) {
    return obj.flatMap((item, index) => 
      findProhibitedFieldsDeep(item, `${path}[${index}]`)
    );
  }

  if (typeof obj !== 'object') {
    return [];
  }

  const found: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (isProhibitedField(key)) {
      found.push(currentPath);
    }
    
    found.push(...findProhibitedFieldsDeep(value, currentPath));
  }
  
  return found;
}

/**
 * Wrapper que loguea si encuentra campos prohibidos antes de eliminarlos
 */
export function stripAndLog<T extends Record<string, any>>(
  obj: T,
  context: string = 'unknown',
): T {
  const prohibited = findProhibitedFields(obj);
  
  if (prohibited.length > 0) {
    console.warn(
      `[OddsStripper] Found ${prohibited.length} prohibited fields in ${context}:`,
      prohibited.join(', '),
    );
  }
  
  return stripProhibitedFields(obj);
}
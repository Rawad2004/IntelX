// src/footystats/ai/footy-ai.service.ts
/**
 * FootyAiService v2
 * 
 * - Mantiene el método analyzeMatch() existente (v1)
 * - Agrega nuevo método analyzeMatchV2() para análisis con datos agregados
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';

import { INTELX_MASTER_PROMPT_RUNTIME } from './intelx.master-prompt.runtime';
import { INTELX_CANONICAL_SPEC_V1_RUNTIME } from './intelx.canonical-spec.runtime';
import type { IntelXMatchObject } from '../services/intelx-object.builder';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS v1 (existente)
// ═══════════════════════════════════════════════════════════════════════════

export const IntelXAnalysisSchema = z.object({
  meta: z.object({
    engine: z.literal('IntelX'),
    version: z.literal('1.26'),
    matchId: z.number(),
    generatedAt: z.string(),
    mode: z.literal('A'),
    cbw: z.enum(['Narrow', 'Medium', 'Wide']),
  }),
  sections: z.object({
    leagueContext: z.string(),
    formValidation: z.string(),
    structuralMatchup: z.string(),
    behavioralSignalStack: z.array(
      z.object({
        signal: z.string(),
        reading: z.string(),
        strength: z.enum(['low', 'medium', 'high']),
      }),
    ),
    riskFlags: z.array(z.string()),
    canonicalSummary: z.string(),
  }),
  ui: z.object({
    headline: z.string(),
    bullets: z.array(z.string()),
    disclaimers: z.array(z.string()),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS v2 (nuevo)
// ═══════════════════════════════════════════════════════════════════════════

export const IntelXAnalysisV2Schema = z.object({
  summary: z.object({
    headline: z.string(),
    verdict: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  markets: z.object({
    over25: z.object({
      market: z.string(),
      recommendation: z.enum(['yes', 'no', 'lean_yes', 'lean_no', 'avoid']),
      confidence: z.number(),
      reasoning: z.string(),
      value: z.enum(['good', 'fair', 'poor', 'unknown']),
    }),
    btts: z.object({
      market: z.string(),
      recommendation: z.enum(['yes', 'no', 'lean_yes', 'lean_no', 'avoid']),
      confidence: z.number(),
      reasoning: z.string(),
      value: z.enum(['good', 'fair', 'poor', 'unknown']),
    }),
    result: z.object({
      market: z.string(),
      recommendation: z.enum(['yes', 'no', 'lean_yes', 'lean_no', 'avoid']),
      confidence: z.number(),
      reasoning: z.string(),
      value: z.enum(['good', 'fair', 'poor', 'unknown']),
    }),
    corners: z.object({
      market: z.string(),
      recommendation: z.enum(['yes', 'no', 'lean_yes', 'lean_no', 'avoid']),
      confidence: z.number(),
      reasoning: z.string(),
      value: z.enum(['good', 'fair', 'poor', 'unknown']),
    }),
    cards: z.object({
      market: z.string(),
      recommendation: z.enum(['yes', 'no', 'lean_yes', 'lean_no', 'avoid']),
      confidence: z.number(),
      reasoning: z.string(),
      value: z.enum(['good', 'fair', 'poor', 'unknown']),
    }),
  }),
  keyFactors: z.object({
    positive: z.array(z.string()),
    negative: z.array(z.string()),
    neutral: z.array(z.string()),
  }),
  signals: z.object({
    dominant: z.array(z.string()),
    alerts: z.array(z.string()),
  }),
  narrative: z.string(),
  recommendations: z.object({
    primary: z.object({
      market: z.string(),
      pick: z.string(),
      confidence: z.number(),
      reasoning: z.string(),
    }),
    secondary: z.object({
      market: z.string(),
      pick: z.string(),
      confidence: z.number(),
      reasoning: z.string(),
    }).nullable(),
    avoid: z.array(z.string()),
  }),
  disclaimers: z.array(z.string()),
});

export type IntelXAnalysisV2 = z.infer<typeof IntelXAnalysisV2Schema> & {
  matchId: number;
  generatedAt: string;
  model: string;
  tokens: number;
};

@Injectable()
export class FootyAiService {
  private readonly logger = new Logger(FootyAiService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxTokens: number;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY') || '';
    if (!apiKey) this.logger.warn('⚠️ OPENAI_API_KEY missing');

    this.client = new OpenAI({ apiKey });

    this.model = this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    this.timeoutMs = Number(this.config.get<string>('OPENAI_TIMEOUT_MS') || 60_000);
    this.maxTokens = Number(this.config.get<string>('OPENAI_MAX_TOKENS') || 520);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODO v1 (existente - sin cambios)
  // ═══════════════════════════════════════════════════════════════════════════

  async analyzeMatch(aiInput: any): Promise<{
    analysis: any;
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
    model?: string;
  }> {
    const matchId = Number(aiInput?.meta?.matchId ?? 0);
    const generatedAt = (aiInput?.meta?.generatedAt as string) || new Date().toISOString();

    aiInput.meta = aiInput.meta || {};
    aiInput.meta.matchId = matchId;
    aiInput.meta.generatedAt = generatedAt;

    const systemBlock = `${INTELX_MASTER_PROMPT_RUNTIME}\n\n---\n\n${INTELX_CANONICAL_SPEC_V1_RUNTIME}`;

    const userPrompt = `
Return ONLY valid JSON. No markdown. No extra keys.

Top-level keys: meta, sections, ui.

meta:
- engine="IntelX"
- version="1.26"
- mode="A"
- matchId=${matchId}
- generatedAt="${generatedAt}"
- cbw="Narrow" | "Medium" | "Wide"

sections (strings must be compact, no paragraphs):
- leagueContext (<= 240 chars)
- formValidation (2 lines EXACT, <= 220 chars total):
  "HOME 5: ... | 6: ... | 10: ...\\nAWAY 5: ... | 6: ... | 10: ..."
- structuralMatchup (<= 260 chars)
- behavioralSignalStack (max 7 items):
  [{signal, reading, strength(low|medium|high)}]
  reading <= 72 chars
- riskFlags (max 6, each <= 42 chars)
- canonicalSummary (<= 220 chars, max 2 sentences)

ui:
- headline (<= 46 chars)
- bullets (max 6, each <= 52 chars)
- disclaimers (max 3, each <= 64 chars)

Rules:
- Prematch only. No odds. No betting. No predictions.
- If data missing: write "insufficient data" IN THAT FIELD but keep shape.
- If lineups not confirmed: add risk flag like "lineups unconfirmed".

INPUT JSON:
${JSON.stringify(aiInput)}
`.trim();

    let res: any;
    try {
      res = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemBlock },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: this.maxTokens,
        },
        { timeout: this.timeoutMs },
      );
    } catch (e: any) {
      throw new Error(e?.message || String(e));
    }

    const content = res.choices?.[0]?.message?.content ?? '{}';
    const parsed = this.safeParseJson(content);

    const ok = IntelXAnalysisSchema.safeParse(parsed);
    const analysis = ok.success ? this.postProcess(ok.data) : this.fallbackAnalysis(matchId, generatedAt, content, ok);

    const usage = res.usage
      ? {
          input_tokens: res.usage.prompt_tokens,
          output_tokens: res.usage.completion_tokens,
          total_tokens: res.usage.total_tokens,
        }
      : undefined;

    return { analysis, usage, model: res.model };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODO v2 (nuevo - para análisis con datos agregados)
  // ═══════════════════════════════════════════════════════════════════════════

  async analyzeMatchV2(matchObject: IntelXMatchObject): Promise<IntelXAnalysisV2> {
    this.logger.log(`Generating v2 AI analysis for match ${matchObject.meta.matchId}`);
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPromptV2();
    const userPrompt = this.buildUserPromptV2(matchObject);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      }, { timeout: this.timeoutMs });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = this.safeParseJson(content);
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`V2 AI analysis completed in ${elapsed}ms`);

      // Validar con schema
      const validated = IntelXAnalysisV2Schema.safeParse(parsed);
      
      if (validated.success) {
        return {
          matchId: matchObject.meta.matchId,
          ...validated.data,
          generatedAt: new Date().toISOString(),
          model: this.model,
          tokens: response.usage?.total_tokens || 0,
        };
      } else {
        // Fallback si no valida
        this.logger.warn('V2 analysis failed validation, using fallback');
        return this.fallbackAnalysisV2(matchObject.meta.matchId, parsed, validated);
      }
    } catch (error: any) {
      this.logger.error(`V2 AI analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * System prompt v2
   */
  private buildSystemPromptV2(): string {
    return `Eres IntelX, un sistema experto de análisis de fútbol basado en comportamiento estadístico.

## TU ROL
Analizas partidos usando datos estadísticos para identificar patrones comportamentales, NO para predecir resultados exactos. Tu enfoque es probabilístico y basado en evidencia.

## PRINCIPIOS FUNDAMENTALES
1. **Nunca predices con certeza absoluta** - Siempre expresas probabilidades y niveles de confianza
2. **Identificas valor, no ganadores** - Tu objetivo es encontrar discrepancias entre probabilidad real y odds
3. **Transparency** - Siempre explicas el "por qué" detrás de cada conclusión
4. **Reconoces limitaciones** - Si los datos son insuficientes, lo dices claramente

## SEÑALES QUE ENTIENDES
- MVI (Match Volatility Index): Volatilidad esperada del partido
- GSS (Game State Stability): Estabilidad del marcador
- TRS (Tempo Regime Signal): Ritmo de juego esperado
- SES (Scoring Environment Signal): Entorno de goles
- CFS (Corner Frequency Signal): Frecuencia de corners
- PAS (Possession Asymmetry Signal): Asimetría de posesión
- PCS (Pressure & Counter Signal): Presión y contraataque
- CBW (Confidence Band Width): Narrow/Medium/Wide

## FORMATO DE RESPUESTA
Responde SIEMPRE en JSON válido con esta estructura exacta:

{
  "summary": {
    "headline": "string (max 100 chars, impactante pero informativo)",
    "verdict": "string (2-3 oraciones con el veredicto principal)",
    "confidence": "high|medium|low"
  },
  "markets": {
    "over25": {
      "market": "Over 2.5 Goals",
      "recommendation": "yes|no|lean_yes|lean_no|avoid",
      "confidence": 0-100,
      "reasoning": "string explicando por qué",
      "value": "good|fair|poor|unknown"
    },
    "btts": { ... mismo formato ... },
    "result": { ... mismo formato ... },
    "corners": { ... mismo formato ... },
    "cards": { ... mismo formato ... }
  },
  "keyFactors": {
    "positive": ["factor 1", "factor 2"],
    "negative": ["riesgo 1", "riesgo 2"],
    "neutral": ["dato informativo"]
  },
  "signals": {
    "dominant": ["señal más relevante", "segunda señal"],
    "alerts": ["alerta importante si hay"]
  },
  "narrative": "string (300-500 palabras de análisis narrativo completo)",
  "recommendations": {
    "primary": {
      "market": "nombre del mercado",
      "pick": "selección específica",
      "confidence": 0-100,
      "reasoning": "por qué esta es la mejor opción"
    },
    "secondary": null o mismo formato,
    "avoid": ["mercado a evitar", "razón"]
  },
  "disclaimers": ["disclaimer relevante basado en calidad de datos"]
}

## REGLAS CRÍTICAS
1. NO uses frases como "el equipo X ganará" - usa "probabilidad elevada de..."
2. Si CBW es "wide", reduce confianza en todas las recomendaciones
3. Si no hay lineups, añade disclaimer sobre incertidumbre
4. Prioriza datos recientes (last 5) sobre históricos
5. El H2H es contexto, no determinante
6. Siempre considera el contexto de liga
7. CRÍTICO: Si un campo aparece como "N/D" o "Sin datos", reconócelo
   explícitamente como dato no disponible. NUNCA digas "el promedio es 0.00",
   "0 goles por partido", "0%" o frases similares cuando el dato sea N/D —
   eso es alucinación. Di "los datos de la liga no están disponibles" u omite
   la métrica por completo.`;
  }

  /**
   * Formatea un número opcional para el prompt. Si es 0 o falsy, devuelve "N/D".
   * Evita que el modelo verbalice "0.00" como si fuera un dato real cuando en
   * realidad significa "dato no disponible".
   */
  private fmtNum(value: number | null | undefined, digits = 2): string {
    if (value === null || value === undefined) return 'N/D';
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return 'N/D';
    return n.toFixed(digits);
  }

  private fmtPct(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/D';
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return 'N/D';
    return `${n}%`;
  }

  /**
   * User prompt v2 con datos del IntelX Match Object
   */
  private buildUserPromptV2(data: IntelXMatchObject): string {
    return `## DATOS DEL PARTIDO

### META
- Match ID: ${data.meta.matchId}
- Calidad de datos: ${data.meta.dataQuality}
- Lineups disponibles: ${data.meta.hasLineups ? 'SÍ' : 'NO'}

### PARTIDO
${data.match.home.name} (Local) vs ${data.match.away.name} (Visitante)
- Liga: ${data.match.league.name} (${data.match.league.country})
- Fecha: ${data.match.date}
- Venue: ${data.match.venue || 'No especificado'}

### H2H (Head to Head)
${data.h2h && data.h2h.totalMatches > 0 ? `
- Total partidos: ${data.h2h.totalMatches}
- Victorias local: ${data.h2h.homeWins}
- Victorias visitante: ${data.h2h.awayWins}
- Empates: ${data.h2h.draws}
- Promedio goles: ${this.fmtNum(data.h2h.avgGoals)}
- BTTS histórico: ${this.fmtPct(data.h2h.bttsPercentage)}
- Over 2.5 histórico: ${this.fmtPct(data.h2h.over25Percentage)}
` : 'Sin datos H2H disponibles (omitir referencias a enfrentamientos previos)'}

### FORMA RECIENTE (Últimos 5 partidos)
**${data.match.home.name}:**
${data.form.home.last5 ? `
- Record: ${data.form.home.last5.wins}W-${data.form.home.last5.draws}D-${data.form.home.last5.losses}L
- Goles a favor avg: ${this.fmtNum(data.form.home.last5.goalsForAvg)}
- Goles en contra avg: ${this.fmtNum(data.form.home.last5.goalsAgainstAvg)}
- xG a favor: ${this.fmtNum(data.form.home.last5.xgFor)}
- Clean sheets: ${this.fmtPct(data.form.home.last5.cleanSheetPct)}
- BTTS: ${this.fmtPct(data.form.home.last5.bttsPct)}
- Over 2.5: ${this.fmtPct(data.form.home.last5.over25Pct)}
- PPG: ${this.fmtNum(data.form.home.last5.ppg)}
` : 'Sin datos de forma reciente disponibles'}

**${data.match.away.name}:**
${data.form.away.last5 ? `
- Record: ${data.form.away.last5.wins}W-${data.form.away.last5.draws}D-${data.form.away.last5.losses}L
- Goles a favor avg: ${this.fmtNum(data.form.away.last5.goalsForAvg)}
- Goles en contra avg: ${this.fmtNum(data.form.away.last5.goalsAgainstAvg)}
- xG a favor: ${this.fmtNum(data.form.away.last5.xgFor)}
- Clean sheets: ${this.fmtPct(data.form.away.last5.cleanSheetPct)}
- BTTS: ${this.fmtPct(data.form.away.last5.bttsPct)}
- Over 2.5: ${this.fmtPct(data.form.away.last5.over25Pct)}
- PPG: ${this.fmtNum(data.form.away.last5.ppg)}
` : 'Sin datos de forma reciente disponibles'}

### CONTEXTO DE LIGA
${data.leagueContext ? `
- Promedio goles/partido: ${this.fmtNum(data.leagueContext.avgGoals)}
- Promedio corners/partido: ${this.fmtNum(data.leagueContext.avgCorners)}
- Promedio tarjetas/partido: ${this.fmtNum(data.leagueContext.avgCards)}
- BTTS liga: ${this.fmtPct(data.leagueContext.bttsPercentage)}
- Over 2.5 liga: ${this.fmtPct(data.leagueContext.over25Percentage)}
NOTA: Los valores "N/D" significan dato no disponible. NO los describas como
"0.00", "0%" o "promedio cero" en el análisis — son datos faltantes, no ceros.
` : 'Sin contexto de liga (omitir referencias a promedios de la liga en el análisis)'}

### ÁRBITRO
${data.referee ? `
- Nombre: ${data.referee.name}
- Tarjetas promedio: ${data.referee.avgCards.toFixed(2)}
- Penaltis por partido: ${data.referee.penaltiesPerMatch.toFixed(2)}
- % victorias local: ${data.referee.homeWinPercentage}%
- Partidos arbitrados: ${data.referee.appearances}
` : 'Sin datos del árbitro'}

### POTENCIALES PRE-PARTIDO
- BTTS: ${data.prePotentials.btts}%
- Over 1.5: ${data.prePotentials.over15}%
- Over 2.5: ${data.prePotentials.over25}%
- Over 3.5: ${data.prePotentials.over35}%
- Corners esperados: ${data.prePotentials.corners}
- Tarjetas esperadas: ${data.prePotentials.cards}

### ODDS
- Local: ${data.odds.home || 'N/A'}
- Empate: ${data.odds.draw || 'N/A'}
- Visitante: ${data.odds.away || 'N/A'}
- Over 2.5: ${data.odds.over25 || 'N/A'}
- Under 2.5: ${data.odds.under25 || 'N/A'}
- BTTS Sí: ${data.odds.bttsYes || 'N/A'}
- BTTS No: ${data.odds.bttsNo || 'N/A'}

### SEÑALES CALCULADAS (IntelX Engine)
${Object.entries(data.signals).map(([key, signal]: [string, any]) => 
  `- ${signal.code} (${signal.name}): ${signal.value}/100 [${signal.level}]
    → ${signal.description}
    → Factores: ${signal.factors.join(', ')}`
).join('\n')}

### CONFIDENCE BAND WIDTH (CBW)
- Estado: ${data.cbw.state.toUpperCase()}
- Confianza: ${data.cbw.confidence}%
- Razones: ${data.cbw.reasons.join(', ')}

### TRENDS (FootyStats)
**Local:**
${data.trends.home.length > 0 ? data.trends.home.map(t => `- ${t}`).join('\n') : '- Sin trends disponibles'}

**Visitante:**
${data.trends.away.length > 0 ? data.trends.away.map(t => `- ${t}`).join('\n') : '- Sin trends disponibles'}

### CLIMA
${data.weather ? `
- Temperatura: ${data.weather.temp}°C
- Humedad: ${data.weather.humidity}
- Viento: ${data.weather.wind}
- Condición: ${data.weather.condition}
` : 'Sin datos meteorológicos'}

---

Analiza este partido y genera el JSON de respuesta siguiendo exactamente el formato especificado.`;
  }

  /**
   * Fallback v2 si falla validación
   */
  private fallbackAnalysisV2(matchId: number, raw: any, validation: any): IntelXAnalysisV2 {
    const defaultMarket = {
      market: 'Unknown',
      recommendation: 'avoid' as const,
      confidence: 0,
      reasoning: 'Insufficient data',
      value: 'unknown' as const,
    };

    return {
      matchId,
      summary: {
        headline: raw?.summary?.headline || 'Analysis unavailable',
        verdict: raw?.summary?.verdict || 'Could not generate analysis',
        confidence: 'low',
      },
      markets: {
        over25: raw?.markets?.over25 || { ...defaultMarket, market: 'Over 2.5 Goals' },
        btts: raw?.markets?.btts || { ...defaultMarket, market: 'BTTS' },
        result: raw?.markets?.result || { ...defaultMarket, market: '1X2' },
        corners: raw?.markets?.corners || { ...defaultMarket, market: 'Corners' },
        cards: raw?.markets?.cards || { ...defaultMarket, market: 'Cards' },
      },
      keyFactors: {
        positive: raw?.keyFactors?.positive || [],
        negative: raw?.keyFactors?.negative || ['Validation failed'],
        neutral: raw?.keyFactors?.neutral || [],
      },
      signals: {
        dominant: raw?.signals?.dominant || [],
        alerts: raw?.signals?.alerts || ['Analysis validation failed'],
      },
      narrative: raw?.narrative || 'Unable to generate narrative due to validation errors.',
      recommendations: {
        primary: raw?.recommendations?.primary || {
          market: 'None',
          pick: 'No recommendation',
          confidence: 0,
          reasoning: 'Insufficient data',
        },
        secondary: null,
        avoid: raw?.recommendations?.avoid || ['All markets due to data issues'],
      },
      disclaimers: ['Analysis validation failed', 'Results may be incomplete'],
      generatedAt: new Date().toISOString(),
      model: this.model,
      tokens: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS COMUNES
  // ═══════════════════════════════════════════════════════════════════════════

  private safeParseJson(text: string): any {
    try {
      return JSON.parse(text);
    } catch (e: any) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(text.slice(start, end + 1));
        } catch (e2: any) {
          return { _parseError: e2?.message || String(e2), _raw: text };
        }
      }
      return { _parseError: e?.message || String(e), _raw: text };
    }
  }

  private clamp(s: any, max: number) {
    const str = String(s ?? '');
    return str.length <= max ? str : str.slice(0, max - 1) + '…';
  }

  private postProcess(a: z.infer<typeof IntelXAnalysisSchema>) {
    a.ui.headline = this.clamp(a.ui.headline, 46);
    a.ui.bullets = (a.ui.bullets || []).slice(0, 6).map((x) => this.clamp(x, 52));
    a.ui.disclaimers = (a.ui.disclaimers || []).slice(0, 3).map((x) => this.clamp(x, 64));

    a.sections.leagueContext = this.clamp(a.sections.leagueContext, 240);
    a.sections.formValidation = this.clamp(a.sections.formValidation, 220);
    a.sections.structuralMatchup = this.clamp(a.sections.structuralMatchup, 260);
    a.sections.canonicalSummary = this.clamp(a.sections.canonicalSummary, 220);

    a.sections.riskFlags = (a.sections.riskFlags || []).slice(0, 6).map((x) => this.clamp(x, 42));

    a.sections.behavioralSignalStack = (a.sections.behavioralSignalStack || [])
      .slice(0, 7)
      .map((s) => ({
        signal: this.clamp(s.signal, 18),
        reading: this.clamp(s.reading, 72),
        strength: s.strength,
      }));

    a.meta.engine = 'IntelX';
    a.meta.version = '1.26';
    a.meta.mode = 'A';
    if (!a.meta.cbw) a.meta.cbw = 'Wide';

    return a;
  }

  private fallbackAnalysis(matchId: number, generatedAt: string, raw: string, ok: any) {
    return {
      meta: { engine: 'IntelX', version: '1.26', matchId, generatedAt, mode: 'A', cbw: 'Wide' },
      sections: {
        leagueContext: 'insufficient data',
        formValidation:
          'HOME 5: insufficient data | 6: insufficient data | 10: insufficient data\n' +
          'AWAY 5: insufficient data | 6: insufficient data | 10: insufficient data',
        structuralMatchup: 'insufficient data',
        behavioralSignalStack: [],
        riskFlags: ['insufficient data'],
        canonicalSummary: 'insufficient data',
      },
      ui: { headline: 'insufficient data', bullets: [], disclaimers: ['insufficient data'] },
      _rawPreview: String(raw || '').slice(0, 1200),
      _validationErrors: ok?.success ? null : ok?.error?.issues ?? null,
    };
  }
}

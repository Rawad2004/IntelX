// src/footystats/ai/intelx.schema.ts

export const INTELX_UI_SCHEMA_NAME = 'intelx_prematch_ui_v126';

export const INTELX_UI_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['meta', 'sections', 'ui'],
  properties: {
    meta: {
      type: 'object',
      additionalProperties: false,
      required: ['engine', 'version', 'matchId', 'generatedAt', 'mode', 'cbw'],
      properties: {
        engine: { type: 'string', enum: ['IntelX'] },
        version: { type: 'string', enum: ['1.26'] },
        matchId: { type: 'number' },
        generatedAt: { type: 'string' },
        mode: { type: 'string', enum: ['A'] },
        cbw: { type: 'string', enum: ['Narrow', 'Medium', 'Wide'] },
      },
    },
    sections: {
      type: 'object',
      additionalProperties: false,
      required: [
        'leagueContext',
        'formValidation',
        'structuralMatchup',
        'behavioralSignalStack',
        'riskFlags',
        'canonicalSummary',
      ],
      properties: {
        leagueContext: { type: 'string' },
        formValidation: { type: 'string' },
        structuralMatchup: { type: 'string' },
        behavioralSignalStack: {
          type: 'array',
          maxItems: 7,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['signal', 'reading', 'strength'],
            properties: {
              signal: { type: 'string' },
              reading: { type: 'string' },
              strength: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
          },
        },
        riskFlags: {
          type: 'array',
          maxItems: 6,
          items: { type: 'string' },
        },
        canonicalSummary: { type: 'string' },
      },
    },
    ui: {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'bullets', 'disclaimers'],
      properties: {
        headline: { type: 'string' },
        bullets: { type: 'array', maxItems: 6, items: { type: 'string' } },
        disclaimers: { type: 'array', maxItems: 3, items: { type: 'string' } },
      },
    },
  },
} as const;

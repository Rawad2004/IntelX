// matches.intelx.ts
// IntelX builders / normalizers for match intelligence payloads

export type Confidence = 'low' | 'medium' | 'high';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function bandFromSignal(signal: number): Confidence {
  if (signal >= 0.7) return 'high';
  if (signal >= 0.4) return 'medium';
  return 'low';
}

/**
 * Converts incoming values (number | numeric string | null) into number | null
 * - null/undefined/'' => null
 * - numeric string => number
 * - non-numeric => null
 */
function toNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Builds IntelX pre-game insight object.
 * Accepts both src.preMatch and src.prematch
 * Normalizes common key variants: homePPG/homePpg, totalXG/xgTotal, etc.
 */
export function buildIntelXPreGame(match: any) {
  const src = match?.preMatch || match?.prematch || {};

  const pm = {
    homePPG: toNum(src.homePPG ?? src.homePpg),
    awayPPG: toNum(src.awayPPG ?? src.awayPpg),
    homeXG: toNum(src.homeXG ?? src.xgHome),
    awayXG: toNum(src.awayXG ?? src.xgAway),
    totalXG: toNum(src.totalXG ?? src.xgTotal),

    bttsPotential: toNum(src.bttsPotential),
    cornersPotential: toNum(src.cornersPotential),
    cardsPotential: toNum(src.cardsPotential),
    offsidesPotential: toNum(src.offsidesPotential),
  };

  const totalXg = pm.totalXG ?? 0;
  const cards = pm.cardsPotential ?? 0;
  const corners = pm.cornersPotential ?? 0;
  const offsides = pm.offsidesPotential ?? 0;
  const btts = pm.bttsPotential;

  // ✅ Signal quality: cuenta como lleno si es número válido (incluye 0)
  const fields = [pm.homePPG, pm.awayPPG, pm.homeXG, pm.awayXG, pm.totalXG];
  const filled = fields.filter((v) => v !== null).length;
  const signal = clamp(filled / fields.length, 0, 1);

  // Ranges simples (educacionales)
  const goalsRange =
    totalXg >= 3.2 ? '2–4'
    : totalXg >= 2.6 ? '2–3'
    : totalXg >= 2.1 ? '1–3'
    : totalXg > 0 ? '0–2'
    : 'insufficient data';

  const cornersRange =
    corners >= 11 ? '9–13'
    : corners >= 9 ? '8–12'
    : corners > 0 ? '6–10'
    : 'insufficient data';

  const cardsRange =
    cards >= 5 ? '4–7'
    : cards >= 3.2 ? '3–6'
    : cards > 0 ? '2–5'
    : 'insufficient data';

  const offsidesRange =
    offsides >= 4 ? '3–6'
    : offsides >= 2.5 ? '2–5'
    : offsides > 0 ? '1–4'
    : 'insufficient data';

  return {
    context: {
      kickoffUnix: match?.kickoffUnix ?? null,
      state: match?.state ?? null,
      competitionId: match?.competitionId ?? null,
    },
    baseline: {
      ppg: { home: pm.homePPG, away: pm.awayPPG },
      xg: { home: pm.homeXG, away: pm.awayXG, total: pm.totalXG },
    },
    expectations: {
      goalsRange,
      bttsPotential: btts === null ? 'n/a' : `${btts}%`,
      cornersRange,
      cardsRange,
      offsidesRange,
    },
    confidence: {
      stability: bandFromSignal(signal),
      signalQuality: Number(signal.toFixed(2)),
      note:
        signal >= 0.7 ? 'Solid pre-match signal from core metrics.'
        : signal >= 0.4 ? 'Some pre-match signal, but incomplete.'
        : 'Low signal — many inputs are missing.',
    },
    education: {
      takeaway:
        'Pre-game intelligence estimates how a match may behave (tempo, goals, discipline) without predicting outcomes.',
    },
  };
}

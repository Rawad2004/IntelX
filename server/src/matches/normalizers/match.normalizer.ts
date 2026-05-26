export type IntelXMatchState = 'upcoming' | 'live' | 'finished' | 'unknown';

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isTruthy(v: any) {
  const s = String(v ?? '').toLowerCase().trim();
  return v === true || v === 1 || s === '1' || s === 'true' || s === 'yes';
}

/**
 * ✅ Inferencia robusta:
 * - Si kickoff está en el futuro => upcoming (aunque provider diga "complete")
 * - Si status es complete/finished => finished (salvo que esté claramente en vivo)
 * - Live solo si el kickoff ya pasó y hay señales reales
 */
export function inferStateFromRaw(
  raw: any,
  kickoffUnix?: number,
): IntelXMatchState {
  const status = String(raw?.status ?? '').toLowerCase().trim();
  const nowUnix = Math.floor(Date.now() / 1000);

  // 0) Guardia por kickoff (esto arregla el bug de "complete" en futuros)
  if (kickoffUnix && kickoffUnix > nowUnix + 120) {
    return 'upcoming';
  }

  // 1) Señales fuertes de LIVE
  const liveByFlag =
    isTruthy(raw?.is_live) ||
    isTruthy(raw?.match_live) ||
    isTruthy(raw?.inplay) ||
    isTruthy(raw?.in_play);

  const elapsed = toNumber(raw?.time_elapsed ?? raw?.minute ?? raw?.time, 0);
  const liveByTime = elapsed > 0 && elapsed < 130;

  // 2) Complete/Finished => normalmente finished
  if (
    status.includes('complete') ||
    status.includes('finished') ||
    status === 'ft'
  ) {
    return liveByFlag || liveByTime ? 'live' : 'finished';
  }

  // 3) Upcoming por texto
  if (
    status.includes('incomplete') ||
    status.includes('scheduled') ||
    status.includes('upcoming')
  ) {
    return 'upcoming';
  }

  // 4) Live por texto o señales (solo si kickoff ya pasó o no hay kickoff)
  if (
    status.includes('live') ||
    status.includes('inplay') ||
    status.includes('in_play')
  ) {
    return 'live';
  }
  if (liveByFlag || liveByTime) return 'live';

  return 'unknown';
}

export function normalizeTeamImage(
  imageBase: string,
  img: string | null | undefined,
) {
  if (!img) return null;
  if (/^https?:\/\//i.test(img)) return img;
  const base = imageBase.replace(/\/$/, '');
  const path = img.startsWith('/') ? img : `/${img}`;
  return `${base}${path}`;
}

export function normalizeTodayMatch(raw: any, imageBase: string) {
  const kickoffUnix = toNumber(raw?.date_unix, 0);
  const statusRaw = raw?.status ?? null;

  // ✅ ahora inferimos con kickoff guard
  const state = inferStateFromRaw(raw, kickoffUnix);

  // ✅ FIX: competitionId en el root (lo necesita tu DB para filtrar por league)
  const competitionId =
    toNumber(raw?.competition_id ?? raw?.league_id, 0) || null;

  return {
    id: toNumber(raw?.id),

    // ✅ root field para DB/filter
    competitionId,

    // opcional: mantener objeto league para UI/compat
    league: {
      id: competitionId ?? 0,
      season: raw?.season ?? null,
    },

    kickoffUnix,
    state,
    statusRaw,

    home: {
      id: toNumber(raw?.homeID),
      name: raw?.home_name ?? null,
      logo: normalizeTeamImage(imageBase, raw?.home_image),
    },
    away: {
      id: toNumber(raw?.awayID),
      name: raw?.away_name ?? null,
      logo: normalizeTeamImage(imageBase, raw?.away_image),
    },

    score: {
      home: toNumber(raw?.homeGoalCount, 0),
      away: toNumber(raw?.awayGoalCount, 0),
      total: toNumber(raw?.totalGoalCount, 0),
    },

    // ✅ tu payload usa "prematch"
    prematch: {
      xgHome: raw?.team_a_xg_prematch ?? null,
      xgAway: raw?.team_b_xg_prematch ?? null,
      xgTotal: raw?.total_xg_prematch ?? null,
      homePpg: raw?.pre_match_home_ppg ?? raw?.home_ppg ?? null,
      awayPpg: raw?.pre_match_away_ppg ?? raw?.away_ppg ?? null,
    },
  };
}

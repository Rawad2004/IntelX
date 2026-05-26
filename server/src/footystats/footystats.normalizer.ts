/**
 * Normaliza un match de FootyStats (Today Matches)
 * hacia el shape base que usa IntelX.
 */

export type MatchState = "live" | "upcoming" | "finished" | "unknown";

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isTruthy(v: any) {
  const s = String(v ?? "").toLowerCase().trim();
  return v === true || v === 1 || s === "1" || s === "true" || s === "yes";
}

/**
 * ✅ Inferencia robusta:
 * - Si kickoff está en el futuro => upcoming (aunque provider diga "complete")
 * - Si status es complete/finished => finished (salvo que esté claramente en vivo)
 * - Live solo si el kickoff ya pasó y hay señales reales
 */
function inferState(raw: any, kickoffUnix?: number): MatchState {
  const status = String(raw?.status ?? "").toLowerCase().trim();
  const nowUnix = Math.floor(Date.now() / 1000);

  // 0) Guardia por kickoff (arregla "complete" en futuros)
  if (kickoffUnix && kickoffUnix > nowUnix + 120) {
    return "upcoming";
  }

  // 1) Señales fuertes de LIVE
  const liveByFlag =
    isTruthy(raw?.is_live) ||
    isTruthy(raw?.match_live) ||
    isTruthy(raw?.inplay) ||
    isTruthy(raw?.in_play);

  const elapsed = toNumber(raw?.time_elapsed ?? raw?.minute ?? raw?.time, 0);
  const liveByTime = elapsed > 0 && elapsed < 130;

  // 2) Finished por texto
  if (status.includes("complete") || status.includes("finished") || status === "ft") {
    return liveByFlag || liveByTime ? "live" : "finished";
  }

  // 3) Upcoming por texto
  if (
    status.includes("incomplete") ||
    status.includes("scheduled") ||
    status.includes("upcoming")
  ) {
    return "upcoming";
  }

  // 4) Live por texto
  if (status.includes("live") || status.includes("inplay") || status.includes("in_play")) {
    return "live";
  }

  // 5) Live por señales (solo si ya debería haber empezado o no hay kickoff)
  if (liveByFlag || liveByTime) return "live";

  // 6) Fallbacks
  const hasGoalsOrXg =
    toNumber(raw?.homeGoalCount, 0) > 0 ||
    toNumber(raw?.awayGoalCount, 0) > 0 ||
    toNumber(raw?.team_a_xg, 0) > 0 ||
    toNumber(raw?.team_b_xg, 0) > 0;

  if (hasGoalsOrXg && (!kickoffUnix || kickoffUnix <= nowUnix + 120)) return "live";

  // WinningTeam != -1 suele indicar FT
  if (toNumber(raw?.winningTeam, -1) !== -1) return "finished";

  return "unknown";
}

export function normalizeTodayMatch(raw: any) {
  const kickoffUnix = toNumber(raw?.date_unix, 0) || null;
  const competitionId = toNumber(raw?.competition_id ?? raw?.league_id, 0) || null;
  const state = inferState(raw, kickoffUnix ?? undefined);

  return {
    id: toNumber(raw?.id),
    competitionId,
    kickoffUnix,
    statusRaw: raw?.status ?? null,
    state,

    // ✅ Competition info (NUEVO)
    competition_name: raw?.competition_name ?? raw?.league_name ?? null,
    competition_image: raw?.competition_image ?? raw?.league_image ?? null,
    country: raw?.country ?? null,

    home: {
      id: toNumber(raw?.homeID),
      name: raw?.home_name ?? null,
    },

    away: {
      id: toNumber(raw?.awayID),
      name: raw?.away_name ?? null,
    },

    // ✅ Team images - URLs completas desde FootyStats (NUEVO)
    home_image: raw?.home_image ?? null,
    away_image: raw?.away_image ?? null,

    // ✅ Score en root level para fácil acceso
    homeGoalCount: toNumber(raw?.homeGoalCount, 0),
    awayGoalCount: toNumber(raw?.awayGoalCount, 0),
    totalGoalCount: toNumber(raw?.totalGoalCount, 0),

    // Score object (legacy)
    score: {
      home: toNumber(raw?.homeGoalCount, 0),
      away: toNumber(raw?.awayGoalCount, 0),
      total: toNumber(raw?.totalGoalCount, 0),
    },

    // ✅ Pre-match metrics
    prematch: {
      homePpg: raw?.pre_match_home_ppg ?? raw?.home_ppg ?? null,
      awayPpg: raw?.pre_match_away_ppg ?? raw?.away_ppg ?? null,
      xgHome: raw?.team_a_xg_prematch ?? null,
      xgAway: raw?.team_b_xg_prematch ?? null,
      xgTotal: raw?.total_xg_prematch ?? null,
      cornersPotential:
        typeof raw?.corners_potential === "number"
          ? Number(raw.corners_potential)
          : null,
      cardsPotential:
        typeof raw?.cards_potential === "number"
          ? Number(raw.cards_potential)
          : null,
      offsidesPotential:
        typeof raw?.offsides_potential === "number"
          ? Number(raw.offsides_potential)
          : null,
      bttsPotential:
        typeof raw?.btts_potential === "number"
          ? Number(raw.btts_potential)
          : null,
    },

    // ✅ Pre-match metrics en root level (para compatibilidad con frontend)
    pre_match_home_ppg: raw?.pre_match_home_ppg ?? raw?.home_ppg ?? null,
    pre_match_away_ppg: raw?.pre_match_away_ppg ?? raw?.away_ppg ?? null,
    team_a_xg_prematch: raw?.team_a_xg_prematch ?? null,
    team_b_xg_prematch: raw?.team_b_xg_prematch ?? null,
    total_xg_prematch: raw?.total_xg_prematch ?? null,
    btts_potential: raw?.btts_potential ?? null,
    corners_potential: raw?.corners_potential ?? null,
    cards_potential: raw?.cards_potential ?? null,
    offsides_potential: raw?.offsides_potential ?? null,

    urls: {
      match: raw?.match_url ?? null,
      home: raw?.home_url ?? null,
      away: raw?.away_url ?? null,
    },
  };
}
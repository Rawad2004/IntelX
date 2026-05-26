// src/footystats/ai/footy-ai-input.builder.ts

export type TeamFormWindow = {
  window: 5 | 6 | 10;
  played: number; // debe ser = window cuando haya data completa
  points?: number | null;
  ppg?: number | null;
  gf?: number | null;
  ga?: number | null;
  xgFor?: number | null;
  xgAgainst?: number | null;
  note?: string | null; // "insufficient data" si falta
};

export type RecentMatchLite = {
  matchId: number;
  dateUnix: number | null;
  competitionId?: number | null;

  home: { id: number | null; name?: string | null };
  away: { id: number | null; name?: string | null };

  score?: { home: number | null; away: number | null } | null;
  xg?: { home: number | null; away: number | null; total: number | null } | null;

  cards?: { total: number | null } | null;
  corners?: { total: number | null } | null;

  flags?: {
    redCard?: boolean | null;
    cleanSheetHome?: boolean | null;
    cleanSheetAway?: boolean | null;
  };
};

export type LineupPlayerLite = {
  name: string;
  position?: string | null;
  number?: number | null;
  status?: 'starter' | 'sub' | 'unknown';
};

export type LineupLite = {
  formation?: string | null;
  players: LineupPlayerLite[]; // starters primero
};

export type IntelXAiInput = {
  meta: {
    matchId: number;
    generatedAt: string;
    kickoffUnix?: number | null;
    competitionId?: number | null;
  };

  match: {
    homeTeam: { id: number; name?: string | null };
    awayTeam: { id: number; name?: string | null };
    venue?: { stadium?: string | null };
  };

  prematchCore: {
    ppg?: { home?: number | null; away?: number | null };
    xg?: { home?: number | null; away?: number | null; total?: number | null };
    potentials?: {
      btts?: number | null;
      corners?: number | null;
      cards?: number | null;
      offsides?: number | null;
    };
  };

  form: {
    home: { last5: TeamFormWindow; last6: TeamFormWindow; last10: TeamFormWindow };
    away: { last5: TeamFormWindow; last6: TeamFormWindow; last10: TeamFormWindow };
  };

  recentMatches: {
    home: RecentMatchLite[];
    away: RecentMatchLite[];
    h2h?: RecentMatchLite[];
  };

  lineups: {
    isConfirmed: boolean;
    home?: LineupLite | null;
    away?: LineupLite | null;
    missingReason?: string | null;
  };

  referee: {
    id?: number | null;
    name?: string | null;
    avgCards?: number | null;
    note?: string | null;
  };
};

function toNumber(v: any): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStr(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function emptyForm(window: 5 | 6 | 10): TeamFormWindow {
  return { window, played: 0, note: 'insufficient data' };
}

// ------------------------------
// ✅ Lineups compact (reduce tokens)
// ------------------------------
function compactPlayers(list: LineupPlayerLite[], max = 16): LineupPlayerLite[] {
  const starters = list.filter((p) => p.status === 'starter');
  const subs = list.filter((p) => p.status === 'sub');
  const rest = list.filter((p) => p.status !== 'starter' && p.status !== 'sub');

  const out = [
    ...starters.slice(0, 11),
    ...subs.slice(0, Math.max(0, max - Math.min(11, starters.length))),
  ];

  if (out.length < max) out.push(...rest.slice(0, max - out.length));
  return out.slice(0, max);
}

/**
 * Best-effort lineup normalization (compact).
 */
function normalizeLineupAny(input: any): LineupLite | null {
  if (!input) return null;

  const mapOne = (p: any, status: 'starter' | 'sub' | 'unknown'): LineupPlayerLite | null => {
    const name = toStr(p?.name ?? p?.player_name ?? p) ?? null;
    if (!name) return null;
    return {
      name,
      position: toStr(p?.position ?? p?.pos),
      number: toNumber(p?.number ?? p?.shirt_number) ?? null,
      status,
    };
  };

  // array simple => starters
  if (Array.isArray(input)) {
    const players = input.map((p: any) => mapOne(p, 'starter')).filter(Boolean) as LineupPlayerLite[];
    const compact = compactPlayers(players, 16);
    return compact.length ? { formation: null, players: compact } : null;
  }

  const formation = toStr(input?.formation ?? input?.formation_name);

  const startersRaw =
    input?.players ??
    input?.startingXI ??
    input?.starting_xi ??
    input?.starting11 ??
    input?.xi ??
    null;

  const subsRaw =
    input?.subs ??
    input?.substitutes ??
    input?.bench ??
    input?.substitutions ??
    null;

  const starters = Array.isArray(startersRaw)
    ? (startersRaw.map((p: any) => mapOne(p, 'starter')).filter(Boolean) as LineupPlayerLite[])
    : [];

  const subs = Array.isArray(subsRaw)
    ? (subsRaw.map((p: any) => mapOne(p, 'sub')).filter(Boolean) as LineupPlayerLite[])
    : [];

  const players = compactPlayers([...starters, ...subs], 16);
  return players.length ? { formation, players } : null;
}

function extractLineups(detailsPayload: any): {
  isConfirmed: boolean;
  home: LineupLite | null;
  away: LineupLite | null;
  missingReason: string | null;
} {
  const lineups = detailsPayload?.lineups ?? detailsPayload?.lineup ?? null;

  const homeAny =
    lineups?.home ??
    lineups?.team_a ??
    detailsPayload?.home_lineup ??
    detailsPayload?.home_team_lineup ??
    detailsPayload?.starting_xi_home ??
    null;

  const awayAny =
    lineups?.away ??
    lineups?.team_b ??
    detailsPayload?.away_lineup ??
    detailsPayload?.away_team_lineup ??
    detailsPayload?.starting_xi_away ??
    null;

  const home = normalizeLineupAny(homeAny);
  const away = normalizeLineupAny(awayAny);

  const isConfirmed = !!(home && away);
  const missingReason = isConfirmed ? null : 'no_lineups_yet';

  return { isConfirmed, home, away, missingReason };
}

// ------------------------------
// ✅ FIX REAL: /lastx payload parsing
// - payload.data = ARRAY (len=3)
// - cada item es un "team object" con stats.last_x = 5/6/10
// - NO existe item.played/item.points como tu parser anterior asumía
// ------------------------------

function pickLastXDataArray(payload: any): any[] {
  if (!payload) return [];
  const a = Array.isArray(payload?.data) ? payload.data : [];
  return Array.isArray(a) ? a : [];
}

function getStats(item: any): any | null {
  if (!item) return null;
  if (item?.stats && typeof item.stats === 'object') return item.stats;
  // fallback por si el provider devuelve directo el objeto stats
  if (typeof item === 'object') return item;
  return null;
}

function inferWindow(item: any): 5 | 6 | 10 | null {
  const stats = getStats(item);
  const w =
    toNumber(stats?.last_x) ??
    toNumber(item?.last_x) ??
    toNumber(item?.last) ??
    toNumber(item?.lastX) ??
    toNumber(item?.window) ??
    null;

  if (w === 5 || w === 6 || w === 10) return w;
  return null;
}

// toma un promedio "usable" de PPG desde stats (no perfecto, pero consistente)
function pickPpg(stats: any): number | null {
  return (
    toNumber(stats?.seasonPPG_overall) ??
    toNumber(stats?.seasonPPG_home) ??
    toNumber(stats?.seasonPPG_away) ??
    toNumber(stats?.HTPPG_overall) ??
    toNumber(stats?.ppg_2hg_overall) ??
    null
  );
}

function pickXgFor(stats: any): number | null {
  return (
    toNumber(stats?.xg_for_avg_overall) ??
    // a veces vienen separados (home/away); como fallback uso overall si existe, si no promedio simple
    (toNumber(stats?.xg_for_avg_home) != null && toNumber(stats?.xg_for_avg_away) != null
      ? ((toNumber(stats?.xg_for_avg_home) as number) + (toNumber(stats?.xg_for_avg_away) as number)) / 2
      : toNumber(stats?.xg_for_avg_home) ?? toNumber(stats?.xg_for_avg_away) ?? null) ??
    null
  );
}

function pickXgAgainst(stats: any): number | null {
  return (
    toNumber(stats?.xg_against_avg_overall) ??
    (toNumber(stats?.xg_against_avg_home) != null && toNumber(stats?.xg_against_avg_away) != null
      ? ((toNumber(stats?.xg_against_avg_home) as number) + (toNumber(stats?.xg_against_avg_away) as number)) / 2
      : toNumber(stats?.xg_against_avg_home) ?? toNumber(stats?.xg_against_avg_away) ?? null) ??
    null
  );
}

/**
 * Construye TeamFormWindow a partir del item "team object" para una ventana.
 *
 * Regla importante:
 * - Si el item EXISTE para esa ventana -> played = window y note = null (NO insuficiente)
 * - Solo "insufficient data" cuando NO hay item para esa ventana.
 */
function buildWindowFromLastXItem(item: any, window: 5 | 6 | 10): TeamFormWindow {
  if (!item || typeof item !== 'object') return emptyForm(window);

  const stats = getStats(item) ?? {};
  const ppg = pickPpg(stats);
  const xgFor = pickXgFor(stats);
  const xgAgainst = pickXgAgainst(stats);

  // si hay item para esa ventana, asumimos played completo (el endpoint ya viene filtrado por last_x)
  // si el provider alguna vez manda "match_num" úsalo, pero nunca lo dejes en 0 por default.
  const played =
    toNumber(item?.last_x_match_num) ??
    toNumber(stats?.last_x_match_num) ??
    window;

  return {
    window,
    played: Number.isFinite(played) && (played as number) > 0 ? (played as number) : window,
    points: null, // no inventar; si luego encuentras un campo real lo conectas aquí
    ppg,
    gf: null,
    ga: null,
    xgFor,
    xgAgainst,
    note: null,
  };
}

export function buildFormPackFromLastX(
  _teamId: number,
  lastxPayload: any,
): {
  form: { last5: TeamFormWindow; last6: TeamFormWindow; last10: TeamFormWindow };
  recent: RecentMatchLite[];
} {
  const arr = pickLastXDataArray(lastxPayload);

  const byWindow = new Map<number, any>();
  for (const it of arr) {
    const w = inferWindow(it);
    if (w) byWindow.set(w, it);
  }

  const last5 = byWindow.has(5) ? buildWindowFromLastXItem(byWindow.get(5), 5) : emptyForm(5);
  const last6 = byWindow.has(6) ? buildWindowFromLastXItem(byWindow.get(6), 6) : emptyForm(6);
  const last10 = byWindow.has(10) ? buildWindowFromLastXItem(byWindow.get(10), 10) : emptyForm(10);

  return {
    form: { last5, last6, last10 },
    // /lastx NO trae lista de matches (en tu provider actual), así que vacío.
    recent: [],
  };
}

/**
 * Builder IntelXAiInput
 */
export function buildIntelXAiInput(params: {
  matchId: number;
  generatedAt: string;
  detailsPayload: any;

  formHome?: Partial<{ last5: TeamFormWindow; last6: TeamFormWindow; last10: TeamFormWindow }>;
  formAway?: Partial<{ last5: TeamFormWindow; last6: TeamFormWindow; last10: TeamFormWindow }>;
  recentHome?: RecentMatchLite[];
  recentAway?: RecentMatchLite[];
  h2h?: RecentMatchLite[];

  refereeAvgCards?: number | null;
}): IntelXAiInput {
  const { matchId, generatedAt, detailsPayload } = params;

  const kickoffUnix =
    toNumber(detailsPayload?.date_unix) ??
    toNumber(detailsPayload?.kickoffUnix) ??
    null;

  const competitionId =
    toNumber(detailsPayload?.competition_id) ??
    toNumber(detailsPayload?.competitionId) ??
    null;

  const homeId =
    toNumber(detailsPayload?.homeID ?? detailsPayload?.home_id) ??
    toNumber(detailsPayload?.home_team_id) ??
    0;

  const awayId =
    toNumber(detailsPayload?.awayID ?? detailsPayload?.away_id) ??
    toNumber(detailsPayload?.away_team_id) ??
    0;

  const homeName =
    toStr(detailsPayload?.home_name ?? detailsPayload?.homeTeamName ?? detailsPayload?.team_a_name) ??
    null;

  const awayName =
    toStr(detailsPayload?.away_name ?? detailsPayload?.awayTeamName ?? detailsPayload?.team_b_name) ??
    null;

  // prematch core
  const homePpg =
    toNumber(detailsPayload?.home_ppg) ??
    toNumber(detailsPayload?.pre_match_home_ppg) ??
    null;

  const awayPpg =
    toNumber(detailsPayload?.away_ppg) ??
    toNumber(detailsPayload?.pre_match_away_ppg) ??
    null;

  const xgHome =
    toNumber(detailsPayload?.team_a_xg) ??
    toNumber(detailsPayload?.team_a_xg_prematch) ??
    null;

  const xgAway =
    toNumber(detailsPayload?.team_b_xg) ??
    toNumber(detailsPayload?.team_b_xg_prematch) ??
    null;

  const xgTotal =
    toNumber(detailsPayload?.total_xg) ??
    toNumber(detailsPayload?.total_xg_prematch) ??
    null;

  const btts = toNumber(detailsPayload?.btts_potential);
  const corners = toNumber(detailsPayload?.corners_potential);
  const cards = toNumber(detailsPayload?.cards_potential);
  const offsides = toNumber(detailsPayload?.offsides_potential);

  const { isConfirmed, home, away, missingReason } = extractLineups(detailsPayload);

  const refereeId = toNumber(detailsPayload?.refereeID ?? detailsPayload?.referee_id) ?? null;
  const refereeName = toStr(detailsPayload?.referee_name ?? detailsPayload?.referee) ?? null;
  const refereeAvgCards =
    params.refereeAvgCards ?? toNumber(detailsPayload?.referee_avg_cards) ?? null;

  return {
    meta: { matchId, generatedAt, kickoffUnix, competitionId },

    match: {
      homeTeam: { id: homeId || 0, name: homeName },
      awayTeam: { id: awayId || 0, name: awayName },
      venue: { stadium: toStr(detailsPayload?.stadium_name) },
    },

    prematchCore: {
      ppg: { home: homePpg, away: awayPpg },
      xg: { home: xgHome, away: xgAway, total: xgTotal },
      potentials: { btts, corners, cards, offsides },
    },

    form: {
      home: {
        last5: params.formHome?.last5 ?? emptyForm(5),
        last6: params.formHome?.last6 ?? emptyForm(6),
        last10: params.formHome?.last10 ?? emptyForm(10),
      },
      away: {
        last5: params.formAway?.last5 ?? emptyForm(5),
        last6: params.formAway?.last6 ?? emptyForm(6),
        last10: params.formAway?.last10 ?? emptyForm(10),
      },
    },

    recentMatches: {
      home: (params.recentHome ?? []).slice(0, 10),
      away: (params.recentAway ?? []).slice(0, 10),
      h2h: (params.h2h ?? []).slice(0, 6),
    },

    lineups: { isConfirmed, home, away, missingReason },

    referee: {
      id: refereeId,
      name: refereeName,
      avgCards: refereeAvgCards,
      note: refereeAvgCards == null ? 'insufficient data' : null,
    },
  };
}

export type MatchState = "scheduled" | "live" | "finished" | "unknown";

export function inferMatchState(
  match: { status?: string; date_unix?: number | string },
  nowUnix = Math.floor(Date.now() / 1000),
): MatchState {
  const status = String(match.status || "").toLowerCase();
  const kickoff = Number(match.date_unix);

  if (status === "complete") return "finished";
  if (!Number.isFinite(kickoff) || kickoff <= 0) return "unknown";

  const diffMinutes = (nowUnix - kickoff) / 60;

  if (diffMinutes < -5) return "scheduled";
  if (diffMinutes >= -5 && diffMinutes <= 130) return "live";

  return "unknown";
}

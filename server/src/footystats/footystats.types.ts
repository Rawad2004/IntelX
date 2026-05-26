import type { MatchState } from "./utils/match-state";

export interface IntelXTeamMini {
  id: number;
  name: string;
  image: string | null; // raw path from FootyStats (teams/...)
}

export interface IntelXMatchMini {
  id: number;
  competitionId: number | null;
  season?: string | null;

  kickoffUnix: number | null;
  statusRaw: string;

  state: MatchState;

  home: IntelXTeamMini;
  away: IntelXTeamMini;

  // quick intel fields you already get from today matches
  preMatch: {
    homePPG?: number | null;
    awayPPG?: number | null;
    homeXG?: number | null;
    awayXG?: number | null;
    totalXG?: number | null;

    cornersPotential?: number | null;
    cardsPotential?: number | null;
    offsidesPotential?: number | null;

    bttsPotential?: number | null;
    o25Potential?: number | null;
    o15Potential?: number | null;
    o05Potential?: number | null;
  };

  // optional for routing/seo
  urls?: {
    matchUrl?: string | null;
    homeUrl?: string | null;
    awayUrl?: string | null;
  };
}

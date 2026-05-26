"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "./components/DashboardHeader";
import MatchFilters from "./components/MatchFilters";
import MatchList from "./components/MatchList";
import MatchDetail from "./components/MatchDetail";
import { getToken, clearTokens } from "@/lib/auth";

export interface Match {
  id: number;
  competitionId: number | null;
  kickoffUnix: number | null;
  statusRaw: string | null;
  state: "scheduled" | "live" | "finished" | "unknown" | "upcoming";
  home: { id: number; name: string; image?: string };
  away: { id: number; name: string; image?: string };
  payload: any;
}

// Updated to match backend response
export interface MatchAnalysis {
  success: boolean;
  data: {
    status: "ready" | "pending" | "missing" | "error";
    matchId: number;
    cbw?: {
      state: string;
      label: string;
      color: string;
      confidence: number;
      reasons: string[];
    };
    envelope?: {
      text: string;
      summary: string;
    };
    dominantSignals?: Array<{
      id: string;
      name: string;
      band: string;
      bandLabel: string;
      bandColor: string;
      explanation: string;
    }>;
    structuralFactors?: {
      pressure?: {
        label: string;
        description: string;
        direction: string;
      };
      resolution?: {
        label: string;
        description: string;
      };
      leagueContext?: {
        label: string;
        description: string;
      };
    };
    contradictions?: {
      hasContradictions: boolean;
      items: string[];
    };
    riskFlags?: {
      count: number;
      items: Array<{
        type: string;
        icon: string;
        message: string;
      }>;
    };
    governanceNote?: string;
    meta?: {
      analyzedAt: string;
      hasLineups: boolean;
      hasReferee: boolean;
      dataQuality: string;
      dataQualityLabel: string;
      expiresAt: string;
    };
  } | null;
  meta?: {
    timestamp: string;
  };
}

type Tab = "all" | "live" | "upcoming" | "finished";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

function extractLeagueName(match: Match): string | null {
  if (match.payload?.competition_name) return match.payload.competition_name;
  if (match.payload?.league_name) return match.payload.league_name;
  const imgPath = match.payload?.home_image || "";
  const countryMatch = imgPath.match(/teams\/([a-z]+)-/i);
  if (countryMatch) {
    return countryMatch[1].charAt(0).toUpperCase() + countryMatch[1].slice(1);
  }
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [matchIntel, setMatchIntel] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [leagues, setLeagues] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsAuthenticated(false);
      router.replace("/login");
    } else {
      setIsAuthenticated(true);
      fetchMatches();
    }
  }, [router]);

  const fetchMatches = async (tab: Tab = "all", force = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/footystats/matches?tab=${tab}${force ? "&force=true" : ""}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 401) {
        clearTokens();
        router.replace("/login");
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch matches");

      const data = await res.json();
      const items: Match[] = data.items || [];
      setMatches(items);
      setFilteredMatches(items);

      const uniqueLeagues = new Map<number, string>();
      items.forEach((m) => {
        if (m.competitionId) {
          const leagueName = extractLeagueName(m);
          if (leagueName && !uniqueLeagues.has(m.competitionId)) {
            uniqueLeagues.set(m.competitionId, leagueName);
          }
        }
      });

      setLeagues(
        Array.from(uniqueLeagues.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...matches];

    if (activeTab !== "all") {
      filtered = filtered.filter((m) => {
        if (activeTab === "live") return m.state === "live";
        if (activeTab === "upcoming") return m.state === "scheduled" || m.state === "upcoming";
        if (activeTab === "finished") return m.state === "finished";
        return true;
      });
    }

    if (selectedLeague) {
      filtered = filtered.filter((m) => m.competitionId === selectedLeague);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => {
        const leagueName = extractLeagueName(m)?.toLowerCase() || "";
        return (
          m.home.name.toLowerCase().includes(q) ||
          m.away.name.toLowerCase().includes(q) ||
          leagueName.includes(q)
        );
      });
    }

    setFilteredMatches(filtered);
  }, [matches, activeTab, selectedLeague, searchQuery]);

  const fetchAnalysisStatus = useCallback(async (matchId: number): Promise<MatchAnalysis | null> => {
    try {
      const token = getToken();
      if (!token) return null;

      const res = await fetch(`${API_BASE}/api/footystats/matches/${matchId}/analysis`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error("Failed to fetch analysis:", err);
      return null;
    }
  }, []);

  const startAnalysisPolling = useCallback((matchId: number) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      const analysis = await fetchAnalysisStatus(matchId);
      
      if (analysis) {
        setMatchAnalysis(analysis);
        
        // Stop polling if analysis is ready or errored
        if (analysis.data?.status === "ready" || analysis.data?.status === "error") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }
    }, 3000);
  }, [fetchAnalysisStatus]);

  const handleSelectMatch = async (match: Match) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setSelectedMatch(match);
    setMatchAnalysis(null);
    setMatchIntel(null);
    setIntelLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      const [intelRes, analysisRes] = await Promise.all([
        fetch(`${API_BASE}/api/footystats/matches/${match.id}/intel`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/footystats/matches/${match.id}/analysis`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (intelRes.ok) setMatchIntel(await intelRes.json());
      
      if (analysisRes.ok) {
        const analysisData: MatchAnalysis = await analysisRes.json();
        setMatchAnalysis(analysisData);
        
        // If analysis is pending, start polling
        if (analysisData.data?.status === "pending") {
          startAnalysisPolling(match.id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch match details:", err);
    } finally {
      setIntelLoading(false);
    }
  };

  const handleRequestAnalysis = async () => {
    if (!selectedMatch) return;
    setAnalysisLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(
        `${API_BASE}/api/footystats/matches/${selectedMatch.id}/analysis/enqueue`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        // Set pending status
        setMatchAnalysis({
          success: true,
          data: {
            status: "pending",
            matchId: selectedMatch.id,
          },
        });

        // Start polling
        startAnalysisPolling(selectedMatch.id);
      }
    } catch (err) {
      console.error("Failed to request analysis:", err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#030817] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#030817]">
      <DashboardHeader />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MatchFilters
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            fetchMatches(tab);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedLeague={selectedLeague}
          onLeagueChange={setSelectedLeague}
          leagues={leagues}
          onRefresh={() => fetchMatches(activeTab, true)}
          isLoading={isLoading}
          totalMatches={matches.length}
          filteredCount={filteredMatches.length}
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <MatchList
              matches={filteredMatches}
              selectedMatch={selectedMatch}
              onSelectMatch={handleSelectMatch}
              isLoading={isLoading}
              error={error}
            />
          </div>
          <div className="lg:col-span-2">
            <MatchDetail
              match={selectedMatch}
              intel={matchIntel}
              analysis={matchAnalysis}
              isLoading={intelLoading}
              isAnalysisLoading={analysisLoading}
              onRequestAnalysis={handleRequestAnalysis}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
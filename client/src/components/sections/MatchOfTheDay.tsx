"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
import { 
  Lightning, 
  Clock, 
  Trophy, 
  ArrowRight,
  Gauge,
  ShieldCheck,
  Warning,
  Info,
  CaretDown,
  Target,
  Waves,
  Timer,
  CircleNotch
} from "@phosphor-icons/react";

// ============================================
// TYPES - Aligned with IntelX Master Prompt v4.1
// ============================================

type StabilityGate = "GREEN" | "AMBER" | "RED";
type CBWLevel = "Narrow" | "Medium" | "Wide";
type RiskLevel = "Low" | "Medium" | "High";

interface Team {
  name: string;
  short: string;
  logo?: string;
  color: string;
  tags: string[];
}

interface BehaviorSnapshot {
  pressureProfile: RiskLevel;
  resolutionStyle: string;
  breakRisk: RiskLevel;
  cbwLevel: CBWLevel;
  stabilityGate: StabilityGate;
}

interface DomainProfile {
  domain: "Goals" | "Corners" | "Cards";
  status: StabilityGate;
  summary: string;
  drivers: string[];
  uncertaintyFactors: string[];
  leagueBaseline: RiskLevel;
  matchRegime: RiskLevel;
}

interface MatchPhase {
  range: string;
  label: string;
  description: string;
}

interface MatchData {
  id: string;
  league: string;
  time: string;
  home: Team;
  away: Team;
  behaviorSnapshot: BehaviorSnapshot;
  domains: DomainProfile[];
  phases: MatchPhase[];
  aiAnalysis: string;
  quickRead: string;
  dataConfidence: string;
}

// ============================================
// STATIC CONFIGS (outside component)
// ============================================

const STABILITY_CONFIG = {
  GREEN: { 
    bg: "rgba(16, 185, 129, 0.15)", 
    border: "rgba(16, 185, 129, 0.3)", 
    text: "text-emerald-400",
    label: "Stable & Explainable"
  },
  AMBER: { 
    bg: "rgba(251, 191, 36, 0.15)", 
    border: "rgba(251, 191, 36, 0.3)", 
    text: "text-amber-400",
    label: "Mixed Signals"
  },
  RED: { 
    bg: "rgba(239, 68, 68, 0.15)", 
    border: "rgba(239, 68, 68, 0.3)", 
    text: "text-red-400",
    label: "High Uncertainty"
  },
} as const;

const STATUS_CONFIG = {
  GREEN: { bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.2)", dot: "bg-emerald-400" },
  AMBER: { bg: "rgba(251, 191, 36, 0.08)", border: "rgba(251, 191, 36, 0.2)", dot: "bg-amber-400" },
  RED: { bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)", dot: "bg-red-400" },
} as const;

const RISK_COLORS = {
  Low: "bg-emerald-500",
  Medium: "bg-amber-500",
  High: "bg-red-500",
} as const;

const RISK_WIDTHS = {
  Low: "w-1/3",
  Medium: "w-2/3",
  High: "w-full",
} as const;

const PHASE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899"] as const;

// ============================================
// MEMOIZED HELPER COMPONENTS
// ============================================

const StabilityBadge = memo(({ gate }: { gate: StabilityGate }) => {
  const c = STABILITY_CONFIG[gate];
  
  return (
    <div 
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 sm:px-4 sm:py-2"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <ShieldCheck size={16} weight="fill" className={c.text} />
      <span className={`text-xs sm:text-sm font-semibold ${c.text}`}>{gate}</span>
      <span className="hidden sm:inline text-xs text-white/50">— {c.label}</span>
    </div>
  );
});
StabilityBadge.displayName = "StabilityBadge";

const RiskIndicator = memo(({ level, label }: { level: RiskLevel; label: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-white/60">{label}</span>
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all duration-300 ${RISK_COLORS[level]} ${RISK_WIDTHS[level]}`} />
      </div>
      <span className="w-12 text-right text-xs font-medium text-white/80">{level}</span>
    </div>
  </div>
));
RiskIndicator.displayName = "RiskIndicator";

const DomainCard = memo(({ domain }: { domain: DomainProfile }) => {
  const [expanded, setExpanded] = useState(false);
  const c = STATUS_CONFIG[domain.status];
  
  const toggleExpanded = useCallback(() => setExpanded(prev => !prev), []);
  
  return (
    <div 
      className="rounded-2xl p-5 transition-colors duration-150"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${c.dot}`} />
          <span className="font-semibold text-white">{domain.domain}</span>
        </div>
        <span className="text-xs font-medium text-white/50">{domain.status}</span>
      </div>
      
      <p className="mb-4 text-sm leading-relaxed text-white/60">{domain.summary}</p>
      
      <div className="mb-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Drivers</div>
        <div className="flex flex-wrap gap-2">
          {domain.drivers.map((driver, i) => (
            <span key={i} className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
              {driver}
            </span>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Uncertainty Factors</div>
        <ul className="space-y-1">
          {domain.uncertaintyFactors.map((factor, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/50">
              <Warning size={12} className="mt-0.5 shrink-0 text-amber-400/60" />
              {factor}
            </li>
          ))}
        </ul>
      </div>
      
      <button 
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs transition-colors duration-150 hover:bg-white/10"
      >
        <span className="text-white/50">Baseline Comparison</span>
        <CaretDown size={14} className={`text-white/40 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} />
      </button>
      
      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg bg-white/5 p-3">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/40">League</div>
            <div className="mt-1 text-sm font-medium text-white/70">{domain.leagueBaseline}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/40">This Match</div>
            <div className="mt-1 text-sm font-medium text-white">{domain.matchRegime}</div>
          </div>
        </div>
      )}
    </div>
  );
});
DomainCard.displayName = "DomainCard";

const TeamDisplay = memo(({ team, label }: { team: Team; label: string }) => (
  <div className="flex flex-1 flex-col items-center">
    <div 
      className="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold text-white sm:h-24 sm:w-24 overflow-hidden"
      style={{ 
        backgroundColor: team.color,
        boxShadow: `0 20px 40px ${team.color}40`,
      }}
    >
      {team.logo ? (
        <img 
          src={team.logo} 
          alt={team.name} 
          className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
          onError={(e) => {
            // Fallback to letter if image fails to load
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = team.short.charAt(0);
          }}
        />
      ) : (
        team.short.charAt(0)
      )}
    </div>
    <span className="text-lg font-semibold text-white">{team.name}</span>
    <span className="mt-1 text-xs text-white/40">{label}</span>
    <div className="mt-2 flex flex-wrap justify-center gap-1">
      {team.tags.slice(0, 2).map((tag, i) => (
        <span key={i} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
          {tag}
        </span>
      ))}
    </div>
  </div>
));
TeamDisplay.displayName = "TeamDisplay";

const PhaseCard = memo(({ phase, index }: { phase: MatchPhase; index: number }) => (
  <div 
    className="rounded-xl bg-white/5 p-4"
    style={{ borderTop: `3px solid ${PHASE_COLORS[index]}` }}
  >
    <div className="mb-1 text-xs font-bold text-white/80">{phase.range}</div>
    <div className="mb-2 text-sm font-semibold text-white">{phase.label}</div>
    <div className="text-xs leading-relaxed text-white/50">{phase.description}</div>
  </div>
));
PhaseCard.displayName = "PhaseCard";

// Loading Skeleton Component
const LoadingSkeleton = memo(() => (
  <div 
    className="animate-pulse rounded-3xl p-10"
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.1)",
    }}
  >
    <div className="flex items-center justify-center gap-3 py-20">
      <CircleNotch size={32} className="animate-spin text-violet-400" />
      <span className="text-white/50">Loading today&apos;s behavioral analysis...</span>
    </div>
  </div>
));
LoadingSkeleton.displayName = "LoadingSkeleton";

// No Match State Component
const NoMatchState = memo(({ message }: { message: string }) => (
  <div 
    className="rounded-3xl p-10 text-center"
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.1)",
    }}
  >
    <div className="flex flex-col items-center gap-4 py-12">
      <div 
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "rgba(251, 191, 36, 0.1)" }}
      >
        <Info size={32} className="text-amber-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">No Match Available</h3>
        <p className="mt-2 text-sm text-white/50">{message}</p>
      </div>
      <p className="text-xs text-white/30">Check back later for today&apos;s behavioral analysis</p>
    </div>
  </div>
));
NoMatchState.displayName = "NoMatchState";

// ============================================
// MAIN COMPONENT
// ============================================

interface MatchOfTheDayProps {
  initialMatch?: MatchData;
  apiEndpoint?: string;
}

// Default API endpoint from environment
const getDefaultApiEndpoint = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  return `${baseUrl}/api/v1/landing/todays-match`;
};

// Placeholder data for fallback
const PLACEHOLDER_MATCH: MatchData = {
  id: "placeholder",
  league: "Premier League",
  time: "20:00",
  home: { 
    name: "Arsenal", 
    short: "ARS", 
    color: "#EF0107",
    tags: ["High Press", "Wing Play"]
  },
  away: { 
    name: "Chelsea", 
    short: "CHE", 
    color: "#034694",
    tags: ["Possession Based", "Set Piece Threat"]
  },
  behaviorSnapshot: {
    pressureProfile: "High",
    resolutionStyle: "Open Play + Wing Crosses",
    breakRisk: "Medium",
    cbwLevel: "Medium",
    stabilityGate: "GREEN",
  },
  domains: [
    {
      domain: "Goals",
      status: "GREEN",
      summary: "Match profiles for goal-scoring activity within expected parameters.",
      drivers: ["High territorial pressure", "Open defensive transitions"],
      uncertaintyFactors: ["Sensitive to early goal"],
      leagueBaseline: "Medium",
      matchRegime: "High",
    },
    {
      domain: "Corners",
      status: "AMBER",
      summary: "Corner volume depends on wing dominance and block depth.",
      drivers: ["Wing pressure elevated", "High cross volume expected"],
      uncertaintyFactors: ["May concede territory"],
      leagueBaseline: "Medium",
      matchRegime: "High",
    },
    {
      domain: "Cards",
      status: "RED",
      summary: "Card outcomes are referee-dependent and scoreline-sensitive.",
      drivers: ["Competitive fixture history"],
      uncertaintyFactors: ["Referee assignment pending"],
      leagueBaseline: "Medium",
      matchRegime: "Medium",
    },
  ],
  phases: [
    { range: "0'–25'", label: "Establishment", description: "Pressure patterns establish, territorial control contested" },
    { range: "25'–60'", label: "Resolution Window", description: "Primary scoring opportunities, tactical adjustments" },
    { range: "60'–90'", label: "Volatility Phase", description: "Fatigue effects, discipline breaks, late surges" },
  ],
  aiAnalysis: "This is a sample analysis showing how our behavioral engine breaks down match dynamics. Sign up to access real-time analysis for today's matches with full behavioral profiling.",
  quickRead: "This match profiles as a high-pressure contest. Resolution expected through wing play. Sign up to see the full analysis for real matches.",
  dataConfidence: "Sample data - Sign up for live analysis",
};

export default function MatchOfTheDay({ 
  initialMatch, 
  apiEndpoint 
}: MatchOfTheDayProps) {
  const [match, setMatch] = useState<MatchData | null>(initialMatch || null);
  const [isLoading, setIsLoading] = useState(!initialMatch);
  const [error, setError] = useState<string | null>(null);
  const [usePlaceholder, setUsePlaceholder] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showHowToRead, setShowHowToRead] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Resolve API endpoint
  const resolvedEndpoint = apiEndpoint || getDefaultApiEndpoint();

  // Track client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch data from backend - only on client side
  useEffect(() => {
    // SSR protection: only run on client
    if (typeof window === 'undefined') return;
    if (!isMounted) return;
    if (initialMatch) return;

    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout;
    
    const fetchMatch = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Add timeout for slow connections
        timeoutId = setTimeout(() => {
          controller.abort();
        }, 10000); // 10 second timeout
        
        const response = await fetch(resolvedEndpoint, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error("Failed to fetch match data");
        const data = await response.json();
        
        // Check if we got a valid match or a "no match" message
        if (data.message) {
          setError(data.message);
          setMatch(null);
        } else {
          setMatch(data);
          setUsePlaceholder(false);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if ((err as Error).name !== "AbortError") {
          console.error("Error fetching match:", err);
        }
        // On any error, use placeholder instead of showing error
        setUsePlaceholder(true);
        setMatch(PLACEHOLDER_MATCH);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatch();
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [resolvedEndpoint, initialMatch, isMounted]);

  // Intersection Observer
  useEffect(() => {
    const ref = sectionRef.current;
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(ref);
    return () => observer.disconnect();
  }, []);

  const toggleHowToRead = useCallback(() => setShowHowToRead(prev => !prev), []);

  return (
    <section
      id="todays-analysis"
      ref={sectionRef}
      className="relative overflow-hidden py-24"
      style={{
        background: "linear-gradient(180deg, #1e1b4b 0%, #1a0a2e 30%, #0c0a1d 70%, #030712 100%)",
      }}
    >
      {/* Background - static, no animation */}
      <div className="pointer-events-none absolute inset-0">
        <div 
          className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`mb-12 text-center transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          <div 
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-sm font-semibold text-emerald-400">DAILY BEHAVIORAL ANALYSIS</span>
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Today&apos;s <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Behavioral Intelligence</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/50">
            Our engine selects the most behaviorally interesting match daily. 
            This is analysis—not prediction. We explain how matches behave.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingSkeleton />}

        {/* Error/No Match State */}
        {!isLoading && error && <NoMatchState message={error} />}

        {/* Main Card */}
        {!isLoading && match && (
          <div className={`transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            <div 
              className="overflow-hidden rounded-3xl"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* Accent line */}
              <div className="h-1" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)" }} />

              <div className="p-6 sm:p-8 lg:p-10">
                {/* Match Header */}
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(234, 179, 8, 0.1)" }}>
                      <Trophy size={20} className="text-yellow-400" weight="fill" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{match.league}</span>
                        {usePlaceholder && (
                          <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                            SAMPLE
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/40">{match.dataConfidence}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 rounded-full px-3 py-1.5 sm:px-4 sm:py-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <Clock size={14} className="text-white/50" />
                      <span className="text-sm font-medium text-white/70">{match.time}</span>
                    </div>
                    <StabilityBadge gate={match.behaviorSnapshot.stabilityGate} />
                  </div>
                </div>

                {/* Teams */}
                <div className="mb-10 flex items-center justify-between">
                  <TeamDisplay team={match.home} label="Home" />
                  <div className="px-4">
                    <div 
                      className="flex h-14 w-14 items-center justify-center rounded-full"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <span className="text-lg font-bold text-white/30">VS</span>
                    </div>
                  </div>
                  <TeamDisplay team={match.away} label="Away" />
                </div>

                {/* Behavior Snapshot */}
                <div 
                  className="mb-8 rounded-2xl p-6"
                  style={{ 
                    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 100%)",
                    border: "1px solid rgba(139, 92, 246, 0.15)",
                  }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <Gauge size={18} className="text-violet-400" weight="fill" />
                    <span className="text-sm font-semibold uppercase tracking-wider text-violet-400">Behavior Snapshot</span>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <RiskIndicator level={match.behaviorSnapshot.pressureProfile} label="Pressure Profile" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">Resolution Style</span>
                      <span className="text-xs font-medium text-white/80">{match.behaviorSnapshot.resolutionStyle}</span>
                    </div>
                    <RiskIndicator level={match.behaviorSnapshot.breakRisk} label="Break Risk" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">Confidence Band</span>
                      <span className="text-xs font-medium text-white/80">{match.behaviorSnapshot.cbwLevel}</span>
                    </div>
                  </div>
                </div>

                {/* Match Phases */}
                <div className="mb-8">
                  <div className="mb-4 flex items-center gap-2">
                    <Timer size={18} className="text-cyan-400" weight="fill" />
                    <span className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Expected Match Phases</span>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-3">
                    {match.phases.map((phase, i) => (
                      <PhaseCard key={i} phase={phase} index={i} />
                    ))}
                  </div>
                </div>

                {/* AI Analysis */}
                <div 
                  className="mb-8 rounded-2xl p-6"
                  style={{ 
                    background: "linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(234, 179, 8, 0.02) 100%)",
                    border: "1px solid rgba(234, 179, 8, 0.15)",
                  }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Lightning size={18} className="text-yellow-400" weight="fill" />
                    <span className="text-sm font-semibold uppercase tracking-wider text-yellow-400">IntelX Engine Analysis</span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/70">{match.aiAnalysis}</p>
                </div>

                {/* Domain Profiles */}
                <div className="mb-8">
                  <div className="mb-4 flex items-center gap-2">
                    <Target size={18} className="text-blue-400" weight="fill" />
                    <span className="text-sm font-semibold uppercase tracking-wider text-blue-400">Domain Profiles</span>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {match.domains.map((domain, i) => (
                      <DomainCard key={i} domain={domain} />
                    ))}
                  </div>
                </div>

                {/* Quick Read */}
                <div className="mb-8 rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Waves size={18} className="text-emerald-400" weight="fill" />
                    <span className="text-sm font-semibold uppercase tracking-wider text-emerald-400">Quick Read (60 Seconds)</span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/60">{match.quickRead}</p>
                </div>

                {/* How to Read - Collapsible */}
                <div className="mb-8">
                  <button
                    onClick={toggleHowToRead}
                    className="flex w-full items-center justify-between rounded-xl bg-white/5 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-center gap-2">
                      <Info size={18} className="text-white/50" />
                      <span className="text-sm font-medium text-white/70">How to Read This View</span>
                    </div>
                    <CaretDown size={16} className={`text-white/40 transition-transform duration-150 ${showHowToRead ? "rotate-180" : ""}`} />
                  </button>
                  
                  {showHowToRead && (
                    <div className="mt-3 rounded-xl bg-white/5 p-5">
                      <div className="grid gap-6 sm:grid-cols-3">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-400">GREEN</span>
                          </div>
                          <p className="text-xs leading-relaxed text-white/50">
                            Behaviorally stable and explainable within a controlled confidence band. The match profiles as readable.
                          </p>
                        </div>
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-amber-400" />
                            <span className="text-sm font-semibold text-amber-400">AMBER</span>
                          </div>
                          <p className="text-xs leading-relaxed text-white/50">
                            Mixed behavioral signals with elevated uncertainty. Interpret cautiously and avoid overconfidence.
                          </p>
                        </div>
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-400" />
                            <span className="text-sm font-semibold text-red-400">RED</span>
                          </div>
                          <p className="text-xs leading-relaxed text-white/50">
                            Uncertainty is elevated. The match is not behaviorally stable. Treat as a pass signal for strong conclusions.
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-6 rounded-lg bg-white/5 p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">What IntelX Does NOT Do</div>
                        <ul className="space-y-1 text-xs text-white/50">
                          <li>• We do not predict scores or results</li>
                          <li>• We do not recommend bets, markets, or strategies</li>
                          <li>• We do not reference odds, prices, or probabilities</li>
                          <li>• We do not optimize for win rate</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="flex justify-center border-t border-white/5 pt-8">
                  <a 
                    href="/register" 
                    className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform duration-150 hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
                      boxShadow: "0 10px 30px rgba(139, 92, 246, 0.3)",
                    }}
                  >
                    Access Full Behavioral Reports
                    <ArrowRight size={16} weight="bold" className="transition-transform duration-150 group-hover:translate-x-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export type { MatchData, Team, BehaviorSnapshot, DomainProfile, MatchPhase };
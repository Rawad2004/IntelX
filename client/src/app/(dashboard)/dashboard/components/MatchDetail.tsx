"use client";

import { Match, MatchAnalysis } from "../page";
import {
  Loader2,
  Zap,
  Target,
  AlertTriangle,
  BarChart3,
  Clock,
  Activity,
  Flag,
  ShieldAlert,
  Flame,
  CornerDownRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Trophy,
  Calendar,
  Brain,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Gauge,
  FileWarning,
  Info,
  Zap as ZapIcon,
  Wind,
  CornerUpRight,
} from "lucide-react";

interface MatchDetailProps {
  match: Match | null;
  intel: any | null;
  analysis: MatchAnalysis | null;
  isLoading: boolean;
  isAnalysisLoading: boolean;
  onRequestAnalysis: () => void;
}

const FOOTY_IMG_BASE = "https://cdn.footystats.org/img";

function buildImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${FOOTY_IMG_BASE}/${path.replace(/^\//, "")}`;
}

function getCompetitionName(match: Match): string {
  if (match.payload?.competition_name) return match.payload.competition_name;
  if (match.payload?.league_name) return match.payload.league_name;
  const imgPath = match.payload?.home_image || "";
  const countryMatch = imgPath.match(/teams\/([a-z]+)-/i);
  return countryMatch
    ? countryMatch[1].charAt(0).toUpperCase() + countryMatch[1].slice(1)
    : "Unknown League";
}

function calculateConfidence(match: Match): {
  level: "high" | "medium" | "low";
  value: number;
} {
  const payload = match.payload;
  let dataPoints = 0;
  const maxPoints = 7;

  if (payload?.team_a_xg_prematch > 0) dataPoints++;
  if (payload?.team_b_xg_prematch > 0) dataPoints++;
  if (payload?.pre_match_home_ppg > 0) dataPoints++;
  if (payload?.pre_match_away_ppg > 0) dataPoints++;
  if (payload?.btts_potential > 0) dataPoints++;
  if (payload?.corners_potential > 0) dataPoints++;
  if (payload?.cards_potential > 0) dataPoints++;

  const percentage = (dataPoints / maxPoints) * 100;
  const xgDiff = Math.abs(
    (payload?.team_a_xg_prematch || 0) - (payload?.team_b_xg_prematch || 0),
  );
  const ppgDiff = Math.abs(
    (payload?.pre_match_home_ppg || 0) - (payload?.pre_match_away_ppg || 0),
  );
  const hasClarity = xgDiff > 0.5 || ppgDiff > 0.5;

  if (percentage >= 85 && hasClarity) {
    return { level: "high", value: percentage };
  } else if (percentage >= 60) {
    return { level: "medium", value: percentage };
  } else {
    return { level: "low", value: percentage };
  }
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const config = {
    high: {
      bg: "bg-green-500/20",
      border: "border-green-500/30",
      text: "text-green-400",
      label: "HIGH",
    },
    medium: {
      bg: "bg-yellow-500/20",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
      label: "MEDIUM",
    },
    low: {
      bg: "bg-red-500/20",
      border: "border-red-500/30",
      text: "text-red-400",
      label: "LOW",
    },
  };
  const c = config[level];
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${c.bg} ${c.border} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subvalue,
  color = "#1fb3ff",
  trend,
  size = "normal",
}: {
  icon: any;
  label: string;
  value: string | number;
  subvalue?: string;
  color?: string;
  trend?: "up" | "down" | "neutral";
  size?: "normal" | "large";
}) {
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor =
    trend === "up"
      ? "text-green-400"
      : trend === "down"
        ? "text-red-400"
        : "text-white/30";

  return (
    <div
      className={`bg-gradient-to-br from-[#0a1628] to-[#0d1f3c] rounded-xl border border-white/5 ${size === "large" ? "p-5" : "p-4"} relative overflow-hidden group hover:border-white/10 transition-all`}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color}10, transparent 70%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
              {label}
            </span>
          </div>
          {trend && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
        </div>
        <p
          className={`font-bold text-white ${size === "large" ? "text-3xl" : "text-2xl"}`}
        >
          {value}
        </p>
        {subvalue && (
          <p className="text-[11px] text-white/40 mt-1">{subvalue}</p>
        )}
      </div>
    </div>
  );
}

function TeamDisplay({
  name,
  logo,
  ppg,
  xg,
  isHome,
}: {
  name: string;
  logo: string | null;
  ppg?: number | null;
  xg?: number | null;
  isHome?: boolean;
}) {
  return (
    <div
      className={`flex-1 flex flex-col items-center ${isHome ? "items-start md:items-center" : "items-end md:items-center"}`}
    >
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-3 p-3 border border-white/5">
        {logo ? (
          <img
            src={logo}
            alt={name}
            className="w-full h-full object-contain"
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              t.style.display = "none";
              t.parentElement!.innerHTML = `<span class="text-2xl font-bold text-white/20">${name?.charAt(0) || "?"}</span>`;
            }}
          />
        ) : (
          <span className="text-2xl font-bold text-white/20">
            {name?.charAt(0) || "?"}
          </span>
        )}
      </div>
      <h3 className="text-sm md:text-base font-bold text-white mb-1 text-center">
        {name}
      </h3>
      <div className="flex items-center gap-2 text-xs">
        {isHome !== undefined && (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium ${isHome ? "bg-cyan-500/20 text-cyan-400" : "bg-orange-500/20 text-orange-400"}`}
          >
            {isHome ? "HOME" : "AWAY"}
          </span>
        )}
      </div>
      {(ppg != null || xg != null) && (
        <div className="flex items-center gap-3 text-xs text-white/40 mt-2">
          {ppg != null && (
            <span>
              PPG:{" "}
              <strong className="text-white/70">
                {Number(ppg).toFixed(2)}
              </strong>
            </span>
          )}
          {xg != null && (
            <span>
              xG:{" "}
              <strong className="text-cyan-400">{Number(xg).toFixed(2)}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ComparisonBar({
  homeValue,
  awayValue,
  homeName,
  awayName,
  label,
  homeColor = "#22d3ee",
  awayColor = "#f97316",
}: {
  homeValue: number;
  awayValue: number;
  homeName: string;
  awayName: string;
  label: string;
  homeColor?: string;
  awayColor?: string;
}) {
  const total = homeValue + awayValue || 1;
  const homePercent = (homeValue / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70 font-medium">{homeName}</span>
        <span className="text-[10px] text-white/40 uppercase">{label}</span>
        <span className="text-white/70 font-medium">{awayName}</span>
      </div>
      <div className="flex items-center gap-1">
        <span
          className="text-xs font-bold w-10 text-right"
          style={{ color: homeColor }}
        >
          {homeValue.toFixed(2)}
        </span>
        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden flex">
          <div
            className="h-full rounded-l-full transition-all duration-500"
            style={{ width: `${homePercent}%`, backgroundColor: homeColor }}
          />
          <div
            className="h-full rounded-r-full transition-all duration-500"
            style={{
              width: `${100 - homePercent}%`,
              backgroundColor: awayColor,
            }}
          />
        </div>
        <span className="text-xs font-bold w-10" style={{ color: awayColor }}>
          {awayValue.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function PredictionMeter({ btts, totalXg }: { btts: number; totalXg: number }) {
  const over25 = totalXg >= 2.5;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className={`p-4 rounded-xl border ${btts >= 50 ? "bg-green-500/10 border-green-500/20" : "bg-white/5 border-white/5"}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Flame
            className={`w-4 h-4 ${btts >= 50 ? "text-green-400" : "text-white/30"}`}
          />
          <span className="text-[10px] text-white/40 uppercase">BTTS</span>
        </div>
        <div className="flex items-center justify-between">
          <span
            className={`text-2xl font-bold ${btts >= 50 ? "text-green-400" : "text-white/50"}`}
          >
            {btts}%
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded ${btts >= 50 ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}`}
          >
            {btts >= 70 ? "LIKELY" : btts >= 50 ? "POSSIBLE" : "UNLIKELY"}
          </span>
        </div>
      </div>

      <div
        className={`p-4 rounded-xl border ${over25 ? "bg-cyan-500/10 border-cyan-500/20" : "bg-white/5 border-white/5"}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Target
            className={`w-4 h-4 ${over25 ? "text-cyan-400" : "text-white/30"}`}
          />
          <span className="text-[10px] text-white/40 uppercase">Over 2.5</span>
        </div>
        <div className="flex items-center justify-between">
          <span
            className={`text-2xl font-bold ${over25 ? "text-cyan-400" : "text-white/50"}`}
          >
            {totalXg.toFixed(2)}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded ${over25 ? "bg-cyan-500/20 text-cyan-400" : "bg-white/10 text-white/40"}`}
          >
            {totalXg >= 3 ? "LIKELY" : totalXg >= 2.5 ? "POSSIBLE" : "UNLIKELY"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SIGNAL ICON MAPPING
// ============================================
function getSignalIcon(signalId: string) {
  const icons: Record<string, any> = {
    TRS: Gauge,
    CFS: CornerUpRight,
    WDS: Wind,
    GFS: Target,
    DPS: ShieldAlert,
  };
  return icons[signalId] || ZapIcon;
}

function getBandColor(color: string) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    red: {
      bg: "bg-red-500/20",
      border: "border-red-500/30",
      text: "text-red-400",
    },
    green: {
      bg: "bg-green-500/20",
      border: "border-green-500/30",
      text: "text-green-400",
    },
    blue: {
      bg: "bg-blue-500/20",
      border: "border-blue-500/30",
      text: "text-blue-400",
    },
    yellow: {
      bg: "bg-yellow-500/20",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
    },
    orange: {
      bg: "bg-orange-500/20",
      border: "border-orange-500/30",
      text: "text-orange-400",
    },
  };
  return colors[color] || colors.blue;
}

// ============================================
// INTELX AI ANALYSIS BOX - FULL VERSION
// ============================================
// ============================================
// INTELX AI ANALYSIS BOX - FULL VERSION
// ============================================
function IntelXAnalysisBox({
  analysis,
  isLoading,
  onRequestAnalysis,
  matchId,
}: {
  analysis: MatchAnalysis | null;
  isLoading: boolean;
  onRequestAnalysis: () => void;
  matchId: number;
}) {
  // Determine status from the new structure
  const data = analysis?.data;
  const status = data?.status || "missing";

  const isReady = status === "ready";
  const isPending = status === "pending";
  const isMissing = status === "missing" || !analysis || !data;
  const isError = status === "error";

  // CBW Data
  const cbw = data?.cbw;
  const envelope = data?.envelope;
  const dominantSignals = data?.dominantSignals || [];
  const structuralFactors = data?.structuralFactors;
  const contradictions = data?.contradictions;
  const riskFlags = data?.riskFlags;
  const meta = data?.meta;
  const governanceNote = data?.governanceNote;

  const cbwColorMap: Record<
    string,
    { bg: string; border: string; text: string; glow: string }
  > = {
    green: {
      bg: "bg-green-500/20",
      border: "border-green-500/40",
      text: "text-green-400",
      glow: "shadow-green-500/20",
    },
    yellow: {
      bg: "bg-yellow-500/20",
      border: "border-yellow-500/40",
      text: "text-yellow-400",
      glow: "shadow-yellow-500/20",
    },
    red: {
      bg: "bg-red-500/20",
      border: "border-red-500/40",
      text: "text-red-400",
      glow: "shadow-red-500/20",
    },
    orange: {
      bg: "bg-orange-500/20",
      border: "border-orange-500/40",
      text: "text-orange-400",
      glow: "shadow-orange-500/20",
    },
  };

  const cbwColors = cbwColorMap[cbw?.color || "green"] || cbwColorMap.green;

  return (
    <div
      className={`bg-gradient-to-br from-[#071427] to-[#0a1628] rounded-2xl border overflow-hidden transition-all duration-300 ${
        isReady
          ? "border-cyan-500/30"
          : isPending
            ? "border-yellow-500/20"
            : "border-white/5"
      }`}
    >
      {/* Header */}
      <div
        className={`px-5 py-4 border-b border-white/5 flex items-center justify-between ${
          isReady
            ? "bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent"
            : isPending
              ? "bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent"
              : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
              isReady
                ? "from-cyan-500 to-blue-500"
                : isPending
                  ? "from-yellow-500 to-orange-500"
                  : "from-slate-500 to-slate-600"
            } flex items-center justify-center shadow-lg`}
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : isReady ? (
              <Sparkles className="w-5 h-5 text-white" />
            ) : (
              <Brain className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              IntelX AI Analysis
            </h3>
            <p className="text-[11px] text-white/40">
              {isReady
                ? "Behavioral intelligence report"
                : isPending
                  ? "Analyzing match data..."
                  : "Request AI-powered analysis"}
            </p>
          </div>
        </div>
        {isReady && (
          <span className="text-[10px] font-bold px-3 py-1.5 rounded-full border bg-green-500/20 border-green-500/30 text-green-400">
            READY
          </span>
        )}
        {isPending && (
          <span className="text-[10px] font-bold px-3 py-1.5 rounded-full border bg-yellow-500/20 border-yellow-500/30 text-yellow-400 animate-pulse">
            PROCESSING
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* MISSING State - Only show if no analysis available */}
        {isMissing && !isLoading && !isPending && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
              <Brain className="w-8 h-8 text-cyan-500/50" />
            </div>
            <p className="text-white/50 text-sm mb-2">
              Get AI-powered insights for this match
            </p>
            <p className="text-white/30 text-xs mb-6 max-w-sm mx-auto">
              Our advanced AI analyzes team form, head-to-head records, and
              behavioral patterns to provide detailed predictions.
            </p>
            <button
              onClick={onRequestAnalysis}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Requesting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Analysis</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* PENDING State */}
        {isPending && (
          <div className="text-center py-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-yellow-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-500 animate-spin" />
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <p className="text-yellow-400 font-medium mb-1">
              Analyzing match data...
            </p>
            <p className="text-white/40 text-xs">
              This usually takes 15-30 seconds
            </p>

            <div className="mt-6 space-y-2 max-w-xs mx-auto">
              <div className="flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-white/50">Collecting match data</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-white/50">Analyzing team statistics</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                <span className="text-yellow-400">
                  Generating predictions...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* READY State - Full Analysis */}
        {isReady && data && (
          <div className="space-y-5">
            {/* CBW Confidence Banner */}
            {cbw && (
              <div
                className={`p-4 rounded-xl border ${cbwColors.bg} ${cbwColors.border} shadow-lg ${cbwColors.glow}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${cbwColors.bg} flex items-center justify-center`}
                    >
                      <Gauge className={`w-5 h-5 ${cbwColors.text}`} />
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider">
                        Confidence Band Width
                      </p>
                      <p className={`text-lg font-bold ${cbwColors.text}`}>
                        {cbw.label}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-black ${cbwColors.text}`}>
                      {cbw.confidence}%
                    </p>
                    <p className="text-[10px] text-white/40 uppercase">
                      {cbw.state}
                    </p>
                  </div>
                </div>
                {cbw.reasons && cbw.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {cbw.reasons.map((reason: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/60"
                      >
                        ✓ {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main Analysis Text */}
            {envelope && (
              <div className="bg-[#0a1628] rounded-xl p-4 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
                      AI Analysis
                    </p>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {envelope.text}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dominant Signals */}
            {dominantSignals.length > 0 && (
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3 px-1">
                  Dominant Signals
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {dominantSignals.map((signal, idx) => {
                    const SignalIcon = getSignalIcon(signal.id);
                    const bandColors = getBandColor(signal.bandColor);
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border ${bandColors.bg} ${bandColors.border}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <SignalIcon
                            className={`w-4 h-4 ${bandColors.text}`}
                          />
                          <span className="text-[10px] font-bold text-white/70 uppercase">
                            {signal.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bandColors.bg} ${bandColors.text} ml-auto`}
                          >
                            {signal.bandLabel}
                          </span>
                        </div>
                        <p className="text-xs text-white/50">{signal.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Structural Factors */}
            {structuralFactors && (
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3 px-1">
                  Structural Factors
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {structuralFactors.pressure && (
                    <div className="bg-[#0a1628] rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        {structuralFactors.pressure.direction === "home" ? (
                          <TrendingUp className="w-4 h-4 text-cyan-400" />
                        ) : structuralFactors.pressure.direction === "away" ? (
                          <TrendingDown className="w-4 h-4 text-orange-400" />
                        ) : (
                          <Scale className="w-4 h-4 text-white/40" />
                        )}
                        <span className="text-xs font-semibold text-white">
                          {structuralFactors.pressure.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50">
                        {structuralFactors.pressure.description}
                      </p>
                    </div>
                  )}
                  {structuralFactors.resolution && (
                    <div className="bg-[#0a1628] rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold text-white">
                          {structuralFactors.resolution.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50">
                        {structuralFactors.resolution.description}
                      </p>
                    </div>
                  )}
                  {structuralFactors.leagueContext && (
                    <div className="bg-[#0a1628] rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-semibold text-white">
                          {structuralFactors.leagueContext.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50">
                        {structuralFactors.leagueContext.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contradictions & Risk Flags */}
            {((contradictions?.hasContradictions &&
              contradictions.items?.length > 0) ||
              (riskFlags?.items && riskFlags.items.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Contradictions */}
                {contradictions?.hasContradictions &&
                  contradictions.items?.length > 0 && (
                    <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-semibold text-yellow-400">
                          Contradictions
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {contradictions.items.map(
                          (item: string, idx: number) => (
                            <li
                              key={idx}
                              className="text-[11px] text-white/60 flex items-start gap-2"
                            >
                              <span className="text-yellow-400">•</span>
                              {item}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                {/* Risk Flags */}
                {riskFlags?.items && riskFlags.items.length > 0 && (
                  <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <FileWarning className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-semibold text-red-400">
                        Risk Flags ({riskFlags.items.length})
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {riskFlags.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="text-[11px] text-white/60 flex items-start gap-2"
                        >
                          <span className="text-red-400">⚠</span>
                          {item.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Governance Note */}
            {governanceNote && (
              <div className="bg-[#0a1628]/50 rounded-xl p-3 border border-white/5">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    {governanceNote}
                  </p>
                </div>
              </div>
            )}

            {/* Meta Footer */}
            {meta && (
              <div className="flex items-center justify-between text-[10px] text-white/30 px-1 pt-2 border-t border-white/5">
                <div className="flex items-center gap-4">
                  {meta.analyzedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(meta.analyzedAt).toLocaleString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    IntelX AI v1.0
                  </span>
                  {meta.dataQualityLabel && (
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-medium ${
                        meta.dataQuality === "high"
                          ? "bg-green-500/20 text-green-400"
                          : meta.dataQuality === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      Data: {meta.dataQualityLabel}
                    </span>
                  )}
                </div>
                <button
                  onClick={onRequestAnalysis}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            )}
          </div>
        )}

        {/* ERROR State */}
        {isError && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 font-medium mb-1">Analysis Failed</p>
            <p className="text-white/40 text-xs mb-4">
              An unexpected error occurred
            </p>
            <button
              onClick={onRequestAnalysis}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-medium rounded-lg transition-all text-sm disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function MatchDetail({
  match,
  intel,
  analysis,
  isLoading,
  isAnalysisLoading,
  onRequestAnalysis,
}: MatchDetailProps) {
  if (!match) {
    return (
      <div className="bg-gradient-to-br from-[#071427] to-[#0a1628] rounded-2xl border border-white/5 p-12 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mb-6 border border-cyan-500/20">
          <BarChart3 className="w-10 h-10 text-cyan-500/50" />
        </div>
        <p className="text-white/60 text-xl font-semibold mb-2">
          Select a match
        </p>
        <p className="text-white/30 text-sm">
          Click on any match to view detailed analysis
        </p>
      </div>
    );
  }

  const confidence = calculateConfidence(match);
  const homeImg = buildImageUrl(match.payload?.home_image);
  const awayImg = buildImageUrl(match.payload?.away_image);
  const compName = getCompetitionName(match);

  const homeXg = match.payload?.team_a_xg_prematch || 0;
  const awayXg = match.payload?.team_b_xg_prematch || 0;
  const totalXg = match.payload?.total_xg_prematch || 0;
  const homePpg = match.payload?.pre_match_home_ppg || 0;
  const awayPpg = match.payload?.pre_match_away_ppg || 0;
  const btts = match.payload?.btts_potential || 0;
  const corners = match.payload?.corners_potential || 0;
  const cards = match.payload?.cards_potential || 0;
  const offsides = match.payload?.offsides_potential || 0;

  const hasData = totalXg > 0 || btts > 0;
  const isUpcoming = match.state === "scheduled" || match.state === "upcoming";

  const formatTime = (unix: number | null) => {
    if (!unix) return "--:--";
    return new Date(unix * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (unix: number | null) => {
    if (!unix) return "";
    return new Date(unix * 1000).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Match Header Card */}
      <div className="bg-gradient-to-br from-[#071427] to-[#0a1628] rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-cyan-400">
                  {compName}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-white/40">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(match.kickoffUnix)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-sm font-medium text-white">
                {formatTime(match.kickoffUnix)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <TeamDisplay
              name={match.home.name}
              logo={homeImg}
              ppg={homePpg}
              xg={homeXg}
              isHome={true}
            />

            <div className="text-center px-4 md:px-8">
              {match.state === "finished" || match.state === "live" ? (
                <>
                  <div className="text-4xl md:text-5xl font-black text-white tracking-tight">
                    {match.payload?.homeGoalCount ?? 0}
                    <span className="text-white/20 mx-3">:</span>
                    {match.payload?.awayGoalCount ?? 0}
                  </div>
                  {match.state === "live" && (
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/20 rounded-full border border-green-500/30">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-bold text-green-400">
                        LIVE
                      </span>
                    </div>
                  )}
                  {match.state === "finished" && (
                    <div className="mt-3 text-sm font-medium text-white/40">
                      Full Time
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-white/10">VS</div>
                  <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 rounded-full border border-cyan-500/20">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-sm font-medium text-cyan-400">
                      Kickoff
                    </span>
                  </div>
                </>
              )}
            </div>

            <TeamDisplay
              name={match.away.name}
              logo={awayImg}
              ppg={awayPpg}
              xg={awayXg}
              isHome={false}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-[#071427] rounded-2xl border border-white/5 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            <p className="text-white/40 text-sm">Loading intelligence...</p>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!isLoading && !hasData && isUpcoming && (
        <div className="bg-[#071427] rounded-2xl border border-white/5 p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/50 font-medium mb-1">
              Stats Not Available
            </p>
            <p className="text-white/30 text-sm text-center">
              Pre-match statistics for this match are still being processed
            </p>
          </div>
        </div>
      )}

      {/* Main Stats Section */}
      {!isLoading && hasData && (
        <>
          {/* Quick Predictions */}
          <div className="bg-gradient-to-br from-[#071427] to-[#0a1628] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Quick Predictions
                  </h3>
                  <p className="text-[10px] text-white/40">
                    Based on historical data
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <PredictionMeter btts={btts} totalXg={totalXg} />
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="bg-gradient-to-br from-[#071427] to-[#0a1628] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Pre-Match Intelligence
                  </h3>
                  <p className="text-[10px] text-white/40">
                    AI-powered behavioral analysis
                  </p>
                </div>
              </div>
              <ConfidenceBadge level={confidence.level} />
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={Target}
                  label="Total xG"
                  value={totalXg.toFixed(2)}
                  subvalue="Expected goals"
                  color="#22d3ee"
                />
                <StatCard
                  icon={Flame}
                  label="BTTS"
                  value={`${btts}%`}
                  subvalue="Both teams score"
                  color="#22c55e"
                />
                <StatCard
                  icon={CornerDownRight}
                  label="Corners"
                  value={corners.toFixed(1)}
                  subvalue="Expected total"
                  color="#f59e0b"
                />
                <StatCard
                  icon={ShieldAlert}
                  label="Cards"
                  value={cards.toFixed(1)}
                  subvalue="Expected total"
                  color="#ef4444"
                />
              </div>

              <div className="bg-[#0a1628] rounded-xl p-4 border border-white/5 space-y-4">
                <ComparisonBar
                  homeValue={homeXg}
                  awayValue={awayXg}
                  homeName={match.home.name}
                  awayName={match.away.name}
                  label="Expected Goals"
                />
                <ComparisonBar
                  homeValue={homePpg}
                  awayValue={awayPpg}
                  homeName={match.home.name}
                  awayName={match.away.name}
                  label="Points Per Game"
                  homeColor="#8b5cf6"
                  awayColor="#ec4899"
                />
              </div>

              {offsides > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0a1628] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Flag className="w-4 h-4 text-white/30" />
                      <span className="text-[10px] text-white/40 uppercase">
                        Offsides
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {offsides.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-white/30">Expected total</p>
                  </div>
                  <div className="bg-[#0a1628] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-white/30" />
                      <span className="text-[10px] text-white/40 uppercase">
                        Combined PPG
                      </span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {(homePpg + awayPpg).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-white/30">
                      Sum of pre-match PPG
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* IntelX AI Analysis Box */}
      <IntelXAnalysisBox
        analysis={analysis}
        isLoading={isAnalysisLoading}
        onRequestAnalysis={onRequestAnalysis}
        matchId={match.id}
      />
    </div>
  );
}

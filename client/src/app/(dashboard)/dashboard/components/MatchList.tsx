"use client";

import { Match } from "../page";
import { Clock, Loader2, AlertCircle, Trophy, ChevronRight, Target, Flame, CornerDownRight, CreditCard } from "lucide-react";

interface MatchListProps {
  matches: Match[];
  selectedMatch: Match | null;
  onSelectMatch: (match: Match) => void;
  isLoading: boolean;
  error: string | null;
}

const FOOTY_IMG_BASE = "https://cdn.footystats.org/img";

// Mapeo de países a banderas emoji
const COUNTRY_FLAGS: Record<string, string> = {
  // Europa
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  spain: "🇪🇸",
  germany: "🇩🇪",
  france: "🇫🇷",
  italy: "🇮🇹",
  portugal: "🇵🇹",
  netherlands: "🇳🇱",
  belgium: "🇧🇪",
  turkey: "🇹🇷",
  greece: "🇬🇷",
  switzerland: "🇨🇭",
  austria: "🇦🇹",
  poland: "🇵🇱",
  ukraine: "🇺🇦",
  russia: "🇷🇺",
  sweden: "🇸🇪",
  norway: "🇳🇴",
  denmark: "🇩🇰",
  finland: "🇫🇮",
  croatia: "🇭🇷",
  serbia: "🇷🇸",
  czech: "🇨🇿",
  romania: "🇷🇴",
  hungary: "🇭🇺",
  ireland: "🇮🇪",
  cyprus: "🇨🇾",
  bulgaria: "🇧🇬",
  slovakia: "🇸🇰",
  slovenia: "🇸🇮",
  albania: "🇦🇱",
  montenegro: "🇲🇪",
  bosnia: "🇧🇦",
  macedonia: "🇲🇰",
  luxembourg: "🇱🇺",
  malta: "🇲🇹",
  iceland: "🇮🇸",
  monaco: "🇲🇨",
  
  // Sudamérica
  brazil: "🇧🇷",
  argentina: "🇦🇷",
  colombia: "🇨🇴",
  chile: "🇨🇱",
  uruguay: "🇺🇾",
  peru: "🇵🇪",
  ecuador: "🇪🇨",
  venezuela: "🇻🇪",
  bolivia: "🇧🇴",
  paraguay: "🇵🇾",
  
  // Norteamérica y Centroamérica
  usa: "🇺🇸",
  mexico: "🇲🇽",
  canada: "🇨🇦",
  costarica: "🇨🇷",
  panama: "🇵🇦",
  honduras: "🇭🇳",
  guatemala: "🇬🇹",
  elsalvador: "🇸🇻",
  jamaica: "🇯🇲",
  
  // Asia
  japan: "🇯🇵",
  southkorea: "🇰🇷",
  korea: "🇰🇷",
  china: "🇨🇳",
  australia: "🇦🇺",
  saudiarabia: "🇸🇦",
  qatar: "🇶🇦",
  uae: "🇦🇪",
  iran: "🇮🇷",
  india: "🇮🇳",
  thailand: "🇹🇭",
  vietnam: "🇻🇳",
  indonesia: "🇮🇩",
  malaysia: "🇲🇾",
  singapore: "🇸🇬",
  
  // África
  egypt: "🇪🇬",
  morocco: "🇲🇦",
  nigeria: "🇳🇬",
  southafrica: "🇿🇦",
  algeria: "🇩🇿",
  tunisia: "🇹🇳",
  senegal: "🇸🇳",
  cameroon: "🇨🇲",
  ghana: "🇬🇭",
  ivorycoast: "🇨🇮",
  
  // Otros
  newzealand: "🇳🇿",
  israel: "🇮🇱",
};

function getCountryFlag(countryName: string): string | null {
  const normalized = countryName.toLowerCase().replace(/[^a-z]/g, "");
  return COUNTRY_FLAGS[normalized] || null;
}

function buildImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${FOOTY_IMG_BASE}/${path.replace(/^\//, "")}`;
}

function getCompetitionInfo(match: Match): { name: string; country: string } {
  let name = match.payload?.competition_name || match.payload?.league_name || "";
  let country = "";
  
  // Extraer país del path de imagen
  const imgPath = match.payload?.home_image || "";
  const countryMatch = imgPath.match(/teams\/([a-z]+)-/i);
  if (countryMatch) {
    country = countryMatch[1].toLowerCase();
    if (!name) {
      name = country.charAt(0).toUpperCase() + country.slice(1);
    }
  }
  
  return { name, country };
}

function getStateConfig(state: string) {
  switch (state) {
    case "live":
      return { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20", dot: "bg-green-500", label: "LIVE", pulse: true };
    case "finished":
      return { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", dot: "bg-slate-500", label: "FT", pulse: false };
    default:
      return { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", dot: "bg-cyan-500", label: "UPCOMING", pulse: false };
  }
}

function formatKickoff(unix: number | null): string {
  if (!unix) return "--:--";
  return new Date(unix * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function TeamLogo({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
        <span className="text-xs font-bold text-white/40">{name?.charAt(0) || "?"}</span>
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white/10 to-white/5 p-1.5 flex items-center justify-center">
      <img
        src={src}
        alt={name}
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          if (target.parentElement) {
            target.parentElement.innerHTML = `<span class="text-xs font-bold text-white/40">${name?.charAt(0) || "?"}</span>`;
          }
        }}
      />
    </div>
  );
}

function MicroStat({ icon: Icon, value, label, color }: { icon: any; value: string | number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5" title={label}>
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="text-[10px] font-semibold text-white/70">{value}</span>
    </div>
  );
}

function BTTSIndicator({ value }: { value: number }) {
  const getColor = () => {
    if (value >= 70) return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" };
    if (value >= 50) return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" };
    return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" };
  };
  const colors = getColor();
  
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${colors.bg} ${colors.border}`} title="Both Teams To Score">
      <Flame className={`w-3 h-3 ${colors.text}`} />
      <span className={`text-[10px] font-bold ${colors.text}`}>{value}%</span>
    </div>
  );
}

function XGBar({ homeXg, awayXg, homeName, awayName }: { homeXg: number; awayXg: number; homeName: string; awayName: string }) {
  const total = homeXg + awayXg || 1;
  const homePercent = (homeXg / total) * 100;
  
  return (
    <div className="w-full" title={`xG: ${homeName} ${homeXg.toFixed(2)} - ${awayXg.toFixed(2)} ${awayName}`}>
      <div className="flex items-center justify-between text-[9px] text-white/40 mb-1">
        <span>{homeXg.toFixed(1)}</span>
        <span className="text-[8px]">xG</span>
        <span>{awayXg.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
          style={{ width: `${homePercent}%` }}
        />
        <div 
          className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300"
          style={{ width: `${100 - homePercent}%` }}
        />
      </div>
    </div>
  );
}

function MatchCard({ match, isSelected, onClick }: { match: Match; isSelected: boolean; onClick: () => void }) {
  const stateConfig = getStateConfig(match.state);
  const homeImg = buildImageUrl(match.payload?.home_image);
  const awayImg = buildImageUrl(match.payload?.away_image);
  
  const homeXg = match.payload?.team_a_xg_prematch || 0;
  const awayXg = match.payload?.team_b_xg_prematch || 0;
  const totalXg = match.payload?.total_xg_prematch || 0;
  const homePpg = match.payload?.pre_match_home_ppg || 0;
  const awayPpg = match.payload?.pre_match_away_ppg || 0;
  const btts = match.payload?.btts_potential || 0;
  const corners = match.payload?.corners_potential || 0;
  const cards = match.payload?.cards_potential || 0;
  
  const hasData = totalXg > 0 || btts > 0;
  const isUpcoming = match.state === "scheduled" || match.state === "upcoming";

  return (
    <div
      onClick={onClick}
      className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 border
        ${isSelected 
          ? "bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-transparent border-cyan-500/40 shadow-lg shadow-cyan-500/10" 
          : "bg-[#0a1628]/80 border-white/5 hover:bg-[#0c1a30] hover:border-white/10"}`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <Clock className="w-3 h-3" />
          <span>{formatKickoff(match.kickoffUnix)}</span>
        </div>
        <div className="flex items-center gap-2">
          {btts >= 50 && isUpcoming && <BTTSIndicator value={btts} />}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${stateConfig.bg} ${stateConfig.border} border`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stateConfig.dot} ${stateConfig.pulse ? "animate-pulse" : ""}`} />
            <span className={`text-[10px] font-bold ${stateConfig.text}`}>{stateConfig.label}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <TeamLogo src={homeImg} name={match.home.name} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-white truncate block">{match.home.name}</span>
              {hasData && isUpcoming && (
                <span className="text-[10px] text-white/30">PPG: {homePpg.toFixed(2)}</span>
              )}
            </div>
          </div>
          {!isUpcoming && (
            <span className="text-xl font-bold text-white ml-2 tabular-nums">
              {match.payload?.homeGoalCount ?? 0}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <TeamLogo src={awayImg} name={match.away.name} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-white truncate block">{match.away.name}</span>
              {hasData && isUpcoming && (
                <span className="text-[10px] text-white/30">PPG: {awayPpg.toFixed(2)}</span>
              )}
            </div>
          </div>
          {!isUpcoming && (
            <span className="text-xl font-bold text-white ml-2 tabular-nums">
              {match.payload?.awayGoalCount ?? 0}
            </span>
          )}
        </div>
      </div>

      {hasData && isUpcoming && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          <XGBar homeXg={homeXg} awayXg={awayXg} homeName={match.home.name} awayName={match.away.name} />
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <MicroStat icon={Target} value={totalXg.toFixed(1)} label="Total xG" color="#22d3ee" />
            <MicroStat icon={CornerDownRight} value={corners.toFixed(0)} label="Corners" color="#f59e0b" />
            <MicroStat icon={CreditCard} value={cards.toFixed(1)} label="Cards" color="#ef4444" />
            {btts < 50 && <MicroStat icon={Flame} value={`${btts}%`} label="BTTS" color="#94a3b8" />}
          </div>
        </div>
      )}

      {!hasData && isUpcoming && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <span className="text-[10px] text-white/20 italic">Stats pending...</span>
        </div>
      )}

      <ChevronRight className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 transition-all
        ${isSelected ? "text-cyan-400 opacity-100" : "text-white/20 opacity-0 group-hover:opacity-100"}`} />
    </div>
  );
}

export default function MatchList({ matches, selectedMatch, onSelectMatch, isLoading, error }: MatchListProps) {
  if (isLoading) {
    return (
      <div className="bg-[#071427] rounded-2xl border border-white/5 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
          <p className="text-white/40 text-sm">Loading matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#071427] rounded-2xl border border-red-500/20 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
          <p className="text-red-400 font-medium mb-2">Failed to load matches</p>
          <p className="text-white/40 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-[#071427] rounded-2xl border border-white/5 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Trophy className="w-8 h-8 text-white/20 mb-4" />
          <p className="text-white/40">No matches found</p>
        </div>
      </div>
    );
  }

  // Group by competition
  const grouped = matches.reduce((acc, match) => {
    const compId = match.competitionId || 0;
    const { name, country } = getCompetitionInfo(match);
    const key = `${compId}`;
    if (!acc[key]) {
      acc[key] = { 
        id: compId, 
        name, 
        country,
        image: buildImageUrl(match.payload?.competition_image), 
        matches: [] 
      };
    }
    acc[key].matches.push(match);
    return acc;
  }, {} as Record<string, { id: number; name: string; country: string; image: string | null; matches: Match[] }>);

  const competitions = Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="bg-[#071427] rounded-2xl border border-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-cyan-500/5 to-transparent">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-cyan-500" />
          <span className="text-sm font-semibold text-white">{matches.length} Matches</span>
        </div>
        <span className="text-[10px] text-white/30">{competitions.length} leagues</span>
      </div>
      
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {competitions.map((comp) => {
          const flag = getCountryFlag(comp.country);
          
          return (
            <div key={comp.id} className="border-b border-white/5 last:border-0">
              {/* Competition Header */}
              <div className="px-4 py-2 bg-[#0a1628]/80 flex items-center gap-2 sticky top-0 z-10 backdrop-blur-sm">
                {comp.image ? (
                  <img src={comp.image} alt="" className="w-4 h-4 object-contain" 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : flag ? (
                  <span className="text-base leading-none">{flag}</span>
                ) : (
                  <div className="w-4 h-4 rounded bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-cyan-400">{comp.name.charAt(0)}</span>
                  </div>
                )}
                <span className="text-xs font-medium text-cyan-400">{comp.name}</span>
                <span className="text-[10px] text-white/30">({comp.matches.length})</span>
              </div>
              
              {/* Matches */}
              <div className="p-2 space-y-2">
                {comp.matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    isSelected={selectedMatch?.id === match.id}
                    onClick={() => onSelectMatch(match)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
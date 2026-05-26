"use client";

import { Search, RefreshCw, Calendar, Loader2 } from "lucide-react";

interface MatchFiltersProps {
  activeTab: "all" | "live" | "upcoming" | "finished";
  onTabChange: (tab: "all" | "live" | "upcoming" | "finished") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedLeague: number | null;
  onLeagueChange: (leagueId: number | null) => void;
  leagues: { id: number; name: string }[];
  onRefresh: () => void;
  isLoading: boolean;
  totalMatches: number;
  filteredCount: number;
}

const tabs = [
  { id: "all" as const, label: "All", icon: "📋" },
  { id: "live" as const, label: "Live", icon: "🔴" },
  { id: "upcoming" as const, label: "Upcoming", icon: "🟡" },
  { id: "finished" as const, label: "Finished", icon: "✅" },
];

export default function MatchFilters({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  selectedLeague,
  onLeagueChange,
  leagues,
  onRefresh,
  isLoading,
  totalMatches,
  filteredCount,
}: MatchFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Matches</h1>
          <p className="text-sm text-white/40">
            Showing {filteredCount} of {totalMatches} matches
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#071427] p-1 rounded-xl border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
            >
              <span className="text-xs">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search teams, leagues..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#071427] border border-white/5 rounded-xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        {/* League Filter */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <select
            value={selectedLeague || ""}
            onChange={(e) => onLeagueChange(e.target.value ? Number(e.target.value) : null)}
            className="appearance-none pl-10 pr-8 py-2.5 bg-[#071427] border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer min-w-[180px]"
          >
            <option value="">All Leagues ({leagues.length})</option>
            {leagues.map((league) => (
              <option key={league.id} value={league.id}>{league.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl text-cyan-400 text-sm font-medium transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>
  );
}
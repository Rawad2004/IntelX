"use client";

import { useEffect, useRef, useState } from "react";

export default function Features() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative overflow-hidden py-24"
      style={{
        background: `linear-gradient(180deg, 
          #0a0d18 0%,
          #050810 15%,
          #030712 30%,
          #030712 100%
        )`,
      }}
    >
      {/* Background glow - top glow connects with LeagueShowcase */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top glow - connects with LeagueShowcase bottom */}
        <div
          className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: "radial-gradient(ellipse, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        
        {/* Center glow */}
        <div
          className="absolute left-1/2 top-1/3 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: "radial-gradient(ellipse, rgba(59, 130, 246, 0.06) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`mb-16 text-center transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
            }}
          >
            <span className="text-sm font-semibold text-violet-400">⚡ THE SIGNAL SYSTEM</span>
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            How IntelX <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Reads Matches</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/50">
            A 5-layer analysis hierarchy that models match behavior—from pressure persistence to confidence governance.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 - Large - TPI */}
          <div
            className={`group relative overflow-hidden rounded-3xl p-6 md:col-span-2 lg:col-span-2 lg:row-span-2 transition-all duration-500 delay-100 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
            style={{
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(30, 27, 75, 0.4) 100%)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
            }}
          >
            {/* Animated visualization */}
            <div className="absolute right-0 top-0 h-full w-1/2 opacity-30">
              <TPIVisualization />
            </div>
            
            <div className="relative z-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20">
                <span className="text-2xl">🎯</span>
              </div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
                Layer 1 — Persistence
              </div>
              <h3 className="mb-3 text-2xl font-bold text-white lg:text-3xl">
                Threat Persistence Index
              </h3>
              <p className="mb-6 max-w-md text-white/60">
                The foundation of our analysis. TPI measures whether attacking pressure will keep coming or fade away. 
                High TPI signals sustained danger—not just a single chance.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">Pressure Tracking</span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">Wave Detection</span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">Sustained Threat</span>
              </div>
            </div>
          </div>

          {/* Card 2 - Resolution */}
          <div
            className={`group relative overflow-hidden rounded-3xl p-6 transition-all duration-500 delay-150 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 58, 138, 0.3) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
              <span className="text-xl">⚡</span>
            </div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
              Layer 2 — Resolution
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">
              Pressure Resolution
            </h3>
            <p className="text-sm text-white/60">
              LRF, DRF, WRF modules track how pressure converts into chances through different zones.
            </p>
          </div>

          {/* Card 3 - Shot Quality */}
          <div
            className={`group relative overflow-hidden rounded-3xl p-6 transition-all duration-500 delay-200 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.3) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <span className="text-xl">📊</span>
            </div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Layer 3 — Quality
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">
              Shot Quality Analysis
            </h3>
            <p className="text-sm text-white/60">
              Once chances occur, we measure xG distributions and expected scoring rates.
            </p>
          </div>

          {/* Card 4 - Behavioral Signals Grid */}
          <div
            className={`group relative overflow-hidden rounded-3xl p-6 md:col-span-2 transition-all duration-500 delay-250 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
            style={{
              background: "linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(127, 29, 29, 0.2) 100%)",
              border: "1px solid rgba(244, 63, 94, 0.15)",
            }}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20">
              <span className="text-xl">🧠</span>
            </div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-rose-400">
              12 Proprietary Signals
            </div>
            <h3 className="mb-4 text-lg font-bold text-white">
              Behavioral Signal Stack
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { code: "MVI", name: "Match Volatility" },
                { code: "GSS", name: "Game Stability" },
                { code: "TRS", name: "Tempo Regime" },
                { code: "SES", name: "Scoring Env." },
                { code: "CFS", name: "Conversion Fragility" },
                { code: "PAS", name: "Pressure Accum." },
                { code: "WDS", name: "Width Depend." },
                { code: "TIS", name: "Territorial" },
              ].map((signal) => (
                <div
                  key={signal.code}
                  className="rounded-xl bg-white/5 px-3 py-2 text-center transition-all hover:bg-white/10"
                >
                  <div className="text-xs font-bold text-white">{signal.code}</div>
                  <div className="text-[10px] text-white/40">{signal.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5 - Transition */}
          <div
            className={`group relative overflow-hidden rounded-3xl p-6 transition-all duration-500 delay-300 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
            style={{
              background: "linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(120, 53, 15, 0.3) 100%)",
              border: "1px solid rgba(251, 191, 36, 0.2)",
            }}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
              <span className="text-xl">🔄</span>
            </div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
              Layer 4 — Transitions
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">
              Transition Priors
            </h3>
            <p className="text-sm text-white/60">
              TPM models regime breaks: early disruptions, late elasticity, discipline breaks.
            </p>
          </div>

          {/* Card 6 - CBW Governance - Full width */}
          <div
            className={`group relative overflow-hidden rounded-3xl p-6 md:col-span-2 lg:col-span-3 transition-all duration-500 delay-350 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
            style={{
              background: "linear-gradient(90deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.1) 50%, rgba(139, 92, 246, 0.1) 100%)",
              border: "1px solid rgba(6, 182, 212, 0.2)",
            }}
          >
            <div className="flex flex-col items-center text-center md:flex-row md:text-left md:items-start md:justify-between">
              <div className="mb-4 md:mb-0">
                <div className="mb-2 inline-flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
                    <span className="text-xl">🛡️</span>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    Layer 5 — Governance (Supreme)
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-white lg:text-2xl">
                  Confidence Band Width
                </h3>
                <p className="max-w-xl text-sm text-white/60">
                  CBW always has final authority. It knows when to trust reads and when uncertainty is too high.
                  Lower layers cannot override this governance layer.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
                  <div className="text-lg font-bold text-green-400">Narrow</div>
                  <div className="text-[10px] text-white/40">High Confidence</div>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
                  <div className="text-lg font-bold text-yellow-400">Medium</div>
                  <div className="text-[10px] text-white/40">Standard</div>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
                  <div className="text-lg font-bold text-red-400">Wide</div>
                  <div className="text-[10px] text-white/40">Low Confidence</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Animated TPI Visualization component
function TPIVisualization() {
  return (
    <svg viewBox="0 0 200 300" className="h-full w-full">
      {/* Animated pressure waves */}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          cx="150"
          cy="150"
          r={30 + i * 25}
          fill="none"
          stroke="rgba(139, 92, 246, 0.3)"
          strokeWidth="1"
          className="animate-pulse"
          style={{
            animationDelay: `${i * 0.3}s`,
            animationDuration: "2s",
          }}
        />
      ))}
      {/* Center point */}
      <circle cx="150" cy="150" r="8" fill="rgba(139, 92, 246, 0.6)" />
      {/* Animated lines */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line
          key={angle}
          x1="150"
          y1="150"
          x2={150 + Math.cos((angle * Math.PI) / 180) * 100}
          y2={150 + Math.sin((angle * Math.PI) / 180) * 100}
          stroke="rgba(139, 92, 246, 0.2)"
          strokeWidth="1"
          strokeDasharray="4 4"
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </svg>
  );
}
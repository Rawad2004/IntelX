"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface League {
  name: string;
  logo: string;
}

interface Stat {
  value: string;
  label: string;
}

const LEAGUES_ROW1: League[] = [
  { name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png" },
  { name: "La Liga", logo: "https://media.api-sports.io/football/leagues/140.png" },
  { name: "Serie A", logo: "https://media.api-sports.io/football/leagues/135.png" },
  { name: "Bundesliga", logo: "https://media.api-sports.io/football/leagues/78.png" },
  { name: "Ligue 1", logo: "https://media.api-sports.io/football/leagues/61.png" },
  { name: "Eredivisie", logo: "https://media.api-sports.io/football/leagues/88.png" },
  { name: "Primeira Liga", logo: "https://media.api-sports.io/football/leagues/94.png" },
  { name: "MLS", logo: "https://media.api-sports.io/football/leagues/253.png" },
];

const LEAGUES_ROW2: League[] = [
  { name: "Champions League", logo: "https://media.api-sports.io/football/leagues/2.png" },
  { name: "Europa League", logo: "https://media.api-sports.io/football/leagues/3.png" },
  { name: "Liga MX", logo: "https://media.api-sports.io/football/leagues/262.png" },
  { name: "Brasileirão", logo: "https://media.api-sports.io/football/leagues/71.png" },
  { name: "Argentine Liga", logo: "https://media.api-sports.io/football/leagues/128.png" },
  { name: "Scottish Premiership", logo: "https://media.api-sports.io/football/leagues/179.png" },
  { name: "Belgian Pro League", logo: "https://media.api-sports.io/football/leagues/144.png" },
  { name: "Turkish Süper Lig", logo: "https://media.api-sports.io/football/leagues/203.png" },
];

const STATS: Stat[] = [
  { value: "50+", label: "Leagues Covered" },
  { value: "1,200+", label: "Teams Analyzed" },
  { value: "10K+", label: "Matches/Season" },
  { value: "12", label: "Behavioral Signals" },
];

// Duplicate for infinite scroll
const LEAGUES_ROW1_DOUBLE = [...LEAGUES_ROW1, ...LEAGUES_ROW1];
const LEAGUES_ROW2_DOUBLE = [...LEAGUES_ROW2, ...LEAGUES_ROW2];

export default function LeagueShowcase() {
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
      className="relative overflow-hidden py-24"
      style={{
        background: `linear-gradient(180deg, 
          #030712 0%, 
          #030712 70%,
          #050810 85%,
          #0a0d18 100%
        )`,
      }}
    >
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div 
          className="absolute left-1/4 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div 
          className="absolute right-1/4 top-1/2 h-[500px] w-[500px] translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        
        {/* Bottom glow to connect with Features section */}
        <div 
          className="absolute bottom-0 left-1/2 h-[300px] w-[800px] -translate-x-1/2 translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div 
          className={`mb-12 text-center transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div 
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <span className="text-sm font-semibold text-blue-400">🌍 GLOBAL COVERAGE</span>
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Analyzing the World's <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Top Leagues</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl px-4 text-white/50">
            Real-time behavioral intelligence across 50+ leagues worldwide. From Premier League to Liga MX, 
            IntelX processes thousands of matches to deliver accurate predictions.
          </p>
        </div>

        {/* Stats Row */}
        <div 
          className={`mx-auto mb-16 grid max-w-4xl grid-cols-2 gap-4 px-4 sm:grid-cols-4 sm:gap-8 transition-all delay-200 duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          {STATS.map((stat, index) => (
            <div 
              key={index}
              className="rounded-2xl p-4 text-center sm:p-6"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Marquee Row 1 - Left to Right */}
        <div 
          className={`mb-6 transition-all delay-300 duration-1000 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="relative">
            {/* Fade edges */}
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 sm:w-40 bg-gradient-to-r from-[#030712] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 sm:w-40 bg-gradient-to-l from-[#030712] to-transparent" />
            
            <div className="flex animate-marquee-left">
              {LEAGUES_ROW1_DOUBLE.map((league, index) => (
                <LeagueCard key={`row1-${index}`} league={league} />
              ))}
            </div>
          </div>
        </div>

        {/* Marquee Row 2 - Right to Left */}
        <div 
          className={`transition-all delay-500 duration-1000 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="relative">
            {/* Fade edges */}
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 sm:w-40 bg-gradient-to-r from-[#030712] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 sm:w-40 bg-gradient-to-l from-[#030712] to-transparent" />
            
            <div className="flex animate-marquee-right">
              {LEAGUES_ROW2_DOUBLE.map((league, index) => (
                <LeagueCard key={`row2-${index}`} league={league} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom info */}
        <div 
          className={`mt-16 text-center transition-all delay-700 duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <p className="text-sm text-white/30">
            Data updated in real-time • New leagues added monthly • Historical data from 2018+
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes marquee-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-marquee-left {
          animation: marquee-left 20s linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right 20s linear infinite;
        }
        .animate-marquee-left:hover,
        .animate-marquee-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}

function LeagueCard({ league }: { league: League }) {
  return (
    <div 
      className="mx-3 flex flex-shrink-0 items-center gap-4 rounded-2xl px-5 py-4 sm:mx-4 sm:px-6 sm:py-5 transition-all duration-300 hover:scale-105"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* League logo */}
      <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
        <Image
          src={league.logo}
          alt={league.name}
          fill
          className="object-contain"
          unoptimized
        />
      </div>
      
      {/* League name */}
      <span className="text-sm font-medium text-white/80 sm:text-base whitespace-nowrap">{league.name}</span>
    </div>
  );
}
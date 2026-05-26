"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Envelope, LinkedinLogo, CalendarBlank } from "@phosphor-icons/react";

const VISION_POINTS = [
  {
    icon: "🌍",
    title: "Global Expansion",
    description: "Scale IntelX to cover 100+ leagues worldwide with real-time behavioral analysis.",
  },
  {
    icon: "🧠",
    title: "AI Evolution",
    description: "Advance our proprietary signal system with next-gen machine learning models.",
  },
  {
    icon: "📊",
    title: "Platform Growth",
    description: "Build enterprise tools for clubs, analysts, and media organizations.",
  },
  {
    icon: "🤝",
    title: "Strategic Partnerships",
    description: "Collaborate with data providers, broadcasters, and sports tech leaders.",
  },
];

const HIGHLIGHTS = [
  { value: "12", label: "Proprietary Signals" },
  { value: "50+", label: "Leagues Covered" },
  { value: "94%", label: "Pattern Accuracy" },
  { value: "<2s", label: "Analysis Speed" },
];

export default function Investment() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.05 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="investors"
      className="relative overflow-hidden py-32"
    >
      {/* Background with gradient transition from HowItWorks */}
      <div className="absolute inset-0">
        {/* Base gradient - starts with purple tones from HowItWorks, transitions to dark */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, 
              #0d0a1f 0%,
              #0a0a1a 15%,
              #050816 30%,
              #030712 50%,
              #030712 100%
            )`,
          }}
        />
        
        {/* Top glow - connects with HowItWorks bottom */}
        <div
          className="absolute left-1/2 top-0 h-[400px] w-[900px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: "radial-gradient(ellipse, rgba(139, 92, 246, 0.12) 0%, rgba(236, 72, 153, 0.06) 50%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        
        {/* Existing glows */}
        <div
          className="absolute h-[500px] w-[500px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)",
            left: "20%",
            top: "30%",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute h-[400px] w-[400px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)",
            right: "15%",
            top: "50%",
            filter: "blur(60px)",
          }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className={`relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        {/* Header */}
        <div className="mb-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2">
            <div
              className="rounded-full px-5 py-2.5"
              style={{
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)",
                border: "1px solid rgba(139, 92, 246, 0.25)",
              }}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                  Private Round Open
                </span>
              </span>
            </div>
          </div>

          <h2 className="mb-6 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Join the{" "}
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Future of Football
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-white/50 sm:text-xl">
            We're building the behavioral intelligence layer for football analysis. 
            If you're interested in being part of this journey, we'd love to connect.
          </p>
        </div>

        {/* Main content grid */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left: Vision */}
          <div
            className="h-full rounded-3xl p-8 sm:p-10"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-violet-400">
              What We're Building
            </h3>
            <h4 className="mb-8 text-2xl font-bold text-white sm:text-3xl">
              The Intelligence Layer for Football
            </h4>

            <div className="space-y-6">
              {VISION_POINTS.map((point, i) => (
                <div key={i} className="flex gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)",
                      border: "1px solid rgba(139, 92, 246, 0.2)",
                    }}
                  >
                    {point.icon}
                  </div>
                  <div>
                    <h5 className="mb-1 font-semibold text-white">{point.title}</h5>
                    <p className="text-sm leading-relaxed text-white/50">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {HIGHLIGHTS.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-white">{item.value}</div>
                  <div className="text-xs text-white/40">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Contact Card */}
          <div
            className="relative h-full overflow-hidden rounded-3xl p-8 sm:p-10"
            style={{
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.04) 100%)",
              border: "1px solid rgba(139, 92, 246, 0.15)",
            }}
          >
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-pink-400">
              Let's Connect
            </h3>
            <h4 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
              Interested in Investing?
            </h4>
            <p className="mb-8 text-white/50">
              We're currently in private beta and selectively opening our seed round to strategic investors 
              who share our vision for the future of sports analytics.
            </p>

            <div className="space-y-4">
              <a
                href="mailto:invest@intelx.ai"
                className="group flex cursor-pointer items-center gap-4 rounded-2xl bg-white/5 p-4 transition-colors duration-150 hover:bg-white/10"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
                >
                  <Envelope size={24} weight="bold" className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">Email Us</div>
                  <div className="text-sm text-white/50">invest@intelx.ai</div>
                </div>
                <ArrowRight size={20} className="text-white/40 transition-transform duration-150 group-hover:translate-x-1" />
              </a>

              <a
                href="#"
                className="group flex cursor-pointer items-center gap-4 rounded-2xl bg-white/5 p-4 transition-colors duration-150 hover:bg-white/10"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg, #0077b5 0%, #00669c 100%)" }}
                >
                  <LinkedinLogo size={24} weight="bold" className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">Connect on LinkedIn</div>
                  <div className="text-sm text-white/50">IntelX Football</div>
                </div>
                <ArrowRight size={20} className="text-white/40 transition-transform duration-150 group-hover:translate-x-1" />
              </a>

              <a
                href="#"
                className="group flex cursor-pointer items-center gap-4 rounded-2xl bg-white/5 p-4 transition-colors duration-150 hover:bg-white/10"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                >
                  <CalendarBlank size={24} weight="bold" className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">Schedule a Call</div>
                  <div className="text-sm text-white/50">Book a 30-min intro</div>
                </div>
                <ArrowRight size={20} className="text-white/40 transition-transform duration-150 group-hover:translate-x-1" />
              </a>
            </div>

            <p className="mt-8 text-center text-xs text-white/30">
              Investment opportunities are available to accredited investors only.
            </p>
          </div>
        </div>

        {/* Bottom quote */}
        <div className="mt-20 text-center">
          <blockquote className="mx-auto max-w-3xl">
            <p className="text-xl font-medium italic text-white/60 sm:text-2xl">
              "We're not predicting scores. We're modeling how football matches behave."
            </p>
            <footer className="mt-4 text-sm text-white/40">
              — IntelX Philosophy
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
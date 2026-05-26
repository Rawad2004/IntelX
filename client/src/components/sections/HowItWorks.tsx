"use client";

import { useEffect, useRef, useState } from "react";

const PIPELINE_STEPS = [
  {
    id: 1,
    phase: "INPUT",
    title: "Raw Match Data",
    description: "League stats, team form (Last 5/6/10), home/away splits, and referee tendencies flow into the system.",
    icon: "📥",
    color: "#3b82f6",
    metrics: ["League Baselines", "Team Stats", "Form Windows", "Referee Data"],
  },
  {
    id: 2,
    phase: "PROCESS",
    title: "Signal Extraction",
    description: "12 proprietary behavioral signals are computed: MVI, GSS, TRS, TPI, and 8 more core indicators.",
    icon: "⚡",
    color: "#8b5cf6",
    metrics: ["MVI Analysis", "TPI Computation", "GSS Detection", "Pattern Match"],
  },
  {
    id: 3,
    phase: "ANALYZE",
    title: "5-Layer Hierarchy",
    description: "Signals pass through Persistence → Resolution → Quality → Transition → Governance layers.",
    icon: "🧠",
    color: "#ec4899",
    metrics: ["Layer Validation", "Conflict Check", "CBW Calibration", "Risk Flags"],
  },
  {
    id: 4,
    phase: "OUTPUT",
    title: "Behavioral Intelligence",
    description: "Final match profile with confidence bands, risk flags, and behavioral explanations—not predictions.",
    icon: "📊",
    color: "#10b981",
    metrics: ["Match Profile", "Confidence Band", "Risk Assessment", "Insights"],
  },
];

export default function HowItWorks() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-cycle through steps
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % PIPELINE_STEPS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative overflow-hidden py-24"
    >
      {/* Background with gradient transition to Investment */}
      <div className="pointer-events-none absolute inset-0">
        {/* Base gradient - transitions to purple/pink tones at bottom for Investment */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, 
              #030712 0%, 
              #030712 50%,
              #050816 70%, 
              #0a0a1a 85%,
              #0d0a1f 100%
            )`,
          }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        
        {/* Active step glow */}
        <div
          className="absolute left-1/2 top-1/3 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: `radial-gradient(ellipse, ${PIPELINE_STEPS[activeStep].color}12 0%, transparent 60%)`,
            filter: "blur(80px)",
            transition: "background 0.5s ease",
          }}
        />
        
        {/* Bottom glow that connects to Investment - violet/pink tones */}
        <div
          className="absolute bottom-0 left-1/2 h-[500px] w-[900px] -translate-x-1/2 translate-y-1/4"
          style={{
            background: "radial-gradient(ellipse, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.08) 50%, transparent 70%)",
            filter: "blur(80px)",
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
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <span className="text-sm font-semibold text-emerald-400">⚙️ THE PIPELINE</span>
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            From Data to <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Intelligence</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/50">
            Our engine transforms raw match data into behavioral intelligence in under 2 seconds.
          </p>
        </div>

        {/* Pipeline Visualization */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left: Step selector */}
          <div
            className={`space-y-4 transition-all duration-500 delay-100 ${
              isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
            }`}
          >
            {PIPELINE_STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`group w-full cursor-pointer rounded-2xl p-5 text-left transition-all duration-300 ${
                  activeStep === index 
                    ? "scale-[1.02]" 
                    : "hover:bg-white/[0.02]"
                }`}
                style={{
                  background: activeStep === index 
                    ? `linear-gradient(135deg, ${step.color}15 0%, ${step.color}05 100%)`
                    : "transparent",
                  border: `1px solid ${activeStep === index ? `${step.color}40` : "rgba(255,255,255,0.05)"}`,
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Step number with animated ring */}
                  <div className="relative">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all"
                      style={{
                        background: activeStep === index ? `${step.color}20` : "rgba(255,255,255,0.05)",
                      }}
                    >
                      {step.icon}
                    </div>
                    {activeStep === index && (
                      <div
                        className="absolute -inset-1 animate-pulse rounded-xl"
                        style={{
                          background: `${step.color}20`,
                          filter: "blur(8px)",
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div 
                      className="mb-1 text-xs font-bold uppercase tracking-wider"
                      style={{ color: step.color }}
                    >
                      {step.phase}
                    </div>
                    <h3 className="mb-1 text-lg font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className={`text-sm transition-all ${activeStep === index ? "text-white/60" : "text-white/40"}`}>
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow indicator */}
                  <div 
                    className={`mt-1 transition-all ${activeStep === index ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}`}
                    style={{ color: step.color }}
                  >
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Right: Visual display */}
          <div
            className={`relative transition-all duration-500 delay-200 ${
              isVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
            }`}
          >
            <div
              className="sticky top-24 overflow-hidden rounded-3xl p-6 sm:p-8"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                minHeight: "400px",
              }}
            >
              {/* Animated header bar */}
              <div className="mb-6 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 rounded-lg bg-white/5 px-4 py-1.5 text-xs text-white/30">
                  intelx://pipeline/{PIPELINE_STEPS[activeStep].phase.toLowerCase()}
                </div>
              </div>

              {/* Active step visualization */}
              <div className="space-y-6">
                {/* Phase badge */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                    style={{ background: `${PIPELINE_STEPS[activeStep].color}20` }}
                  >
                    {PIPELINE_STEPS[activeStep].icon}
                  </div>
                  <div>
                    <div 
                      className="text-sm font-bold uppercase tracking-wider"
                      style={{ color: PIPELINE_STEPS[activeStep].color }}
                    >
                      Step {activeStep + 1} of 4
                    </div>
                    <div className="text-xl font-bold text-white">
                      {PIPELINE_STEPS[activeStep].title}
                    </div>
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-3">
                  {PIPELINE_STEPS[activeStep].metrics.map((metric, i) => (
                    <div
                      key={metric}
                      className="rounded-xl bg-white/5 p-4 transition-all"
                      style={{
                        animationDelay: `${i * 100}ms`,
                        borderLeft: `3px solid ${PIPELINE_STEPS[activeStep].color}`,
                      }}
                    >
                      <div className="mb-1 text-xs font-medium text-white/40">Processing</div>
                      <div className="text-sm font-semibold text-white">{metric}</div>
                      {/* Animated progress bar */}
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: "100%",
                            background: `linear-gradient(90deg, ${PIPELINE_STEPS[activeStep].color} 0%, ${PIPELINE_STEPS[activeStep].color}60 100%)`,
                            animation: "progress 2s ease-in-out infinite",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Flow indicator */}
                <div className="flex items-center justify-center gap-2 pt-4">
                  {PIPELINE_STEPS.map((step, i) => (
                    <div key={i} className="flex items-center">
                      <div
                        className={`h-2 w-2 rounded-full transition-all ${
                          i <= activeStep ? "" : "opacity-30"
                        }`}
                        style={{ background: step.color }}
                      />
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div 
                          className={`h-0.5 w-8 transition-all ${
                            i < activeStep ? "" : "opacity-30"
                          }`}
                          style={{ background: i < activeStep ? PIPELINE_STEPS[i + 1].color : "rgba(255,255,255,0.2)" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div
          className={`mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 transition-all duration-500 delay-300 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          {[
            { value: "<2s", label: "Processing Time" },
            { value: "5", label: "Analysis Layers" },
            { value: "12", label: "Behavioral Signals" },
            { value: "99.9%", label: "Uptime" },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </section>
  );
}
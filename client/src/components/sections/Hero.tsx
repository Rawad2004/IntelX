"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Lightning } from "@phosphor-icons/react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  fadeDirection: number;
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect user accessibility preference
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // CSS pixel dimensions (logical), separate from the backing-store size
    let cssWidth = window.innerWidth;
    let cssHeight = window.innerHeight;

    const setCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x to avoid overkill on 3x phones
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels from here on
    };

    setCanvasSize();

    const particles: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.2,
        fadeDirection: Math.random() > 0.5 ? 1 : -1,
      });
    }

    // Draw a single static frame (used both as the initial paint and as the
    // sole frame for users that prefer reduced motion)
    const drawFrame = () => {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      const len = particles.length;

      for (let i = 0; i < len; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.fadeDirection * 0.005;

        if (p.opacity >= 0.7) p.fadeDirection = -1;
        if (p.opacity <= 0.1) p.fadeDirection = 1;

        if (p.x < 0) p.x = cssWidth;
        if (p.x > cssWidth) p.x = 0;
        if (p.y < 0) p.y = cssHeight;
        if (p.y > cssHeight) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      }

      ctx.lineWidth = 0.5;
      for (let i = 0; i < len; i++) {
        const a = particles[i];
        const limit = Math.min(i + 10, len);
        for (let j = i + 1; j < limit; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 10000) {
            const dist = Math.sqrt(distSq);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - dist / 100)})`;
            ctx.stroke();
          }
        }
      }
    };

    let rafId = 0;
    let running = false;

    const loop = () => {
      drawFrame();
      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
    };

    // Initial paint (so reduced-motion users still see particles)
    drawFrame();

    // Pause when the Hero is offscreen — saves CPU/battery while user is below the fold
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0 }
    );
    io.observe(section);

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setCanvasSize, 100);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  const scrollToMatch = () => {
    const element = document.getElementById("todays-analysis");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section ref={sectionRef} className="relative min-h-screen overflow-hidden">
      {/* Multi-layer gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            #000000 0%, 
            #030712 40%,
            #0c0a1d 70%,
            #1a0a2e 90%,
            #1e1b4b 100%
          )`,
        }}
      />

      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0"
      />

      {/* Gradient Orbs */}
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      {/* Grid overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "100px 100px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-7xl px-6 py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            
            {/* Badge */}
            <div 
              className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-sm font-medium text-white/80">Free Daily Analysis Available</span>
            </div>

            {/* Title */}
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-white">Behavioral Intelligence</span>
              <br />
              <span className="text-white">for </span>
              <span 
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
                }}
              >
                Football Analysis
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/50">
              IntelX models how matches behave—momentum shifts, pressure patterns, 
              and tactical dynamics that traditional stats miss.
            </p>

            {/* CTAs */}
            <div className="mb-16 flex flex-wrap items-center justify-center gap-4">
              {/* Primary CTA - Low commitment, immediate value */}
              <button 
                onClick={scrollToMatch}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-4 text-base font-semibold text-white transition-transform duration-200 hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  boxShadow: "0 0 40px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Lightning size={18} weight="fill" />
                  See Today's Analysis
                </span>
                <span 
                  className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{
                    background: "radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)",
                  }}
                />
              </button>

              {/* Secondary CTA - Account creation */}
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white transition-transform duration-200 hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                Create Free Account
                <ArrowRight size={18} weight="bold" className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Stats */}
            <div className="mx-auto grid max-w-lg grid-cols-4 gap-8">
              {[
                { value: "12", label: "Signals" },
                { value: "94%", label: "Accuracy" },
                { value: "<2s", label: "Speed" },
                { value: "50+", label: "Leagues" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-white/30">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-white/30">Scroll</span>
          <div 
            className="flex h-12 w-6 items-start justify-center rounded-full border border-white/20 p-1.5"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div className="scroll-dot" />
          </div>
        </div>
      </div>

      <style jsx>{`
        .orb {
          position: absolute;
          border-radius: 50%;
          will-change: transform, opacity;
        }
        
        .orb-1 {
          width: 800px;
          height: 800px;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 40%, transparent 70%);
          filter: blur(60px);
          animation: pulse1 4s ease-in-out infinite;
        }
        
        .orb-2 {
          width: 600px;
          height: 600px;
          top: 20%;
          right: -10%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%);
          filter: blur(80px);
          animation: pulse2 5s ease-in-out infinite;
        }
        
        .orb-3 {
          width: 500px;
          height: 500px;
          bottom: 0%;
          left: 10%;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%);
          filter: blur(80px);
          animation: pulse3 6s ease-in-out infinite;
        }
        
        .orb-4 {
          width: 400px;
          height: 400px;
          top: 50%;
          left: 30%;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%);
          filter: blur(60px);
          animation: pulse4 4.5s ease-in-out infinite;
        }
        
        .scroll-dot {
          width: 6px;
          height: 8px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.6);
          animation: scrollBounce 2s ease-in-out infinite;
          will-change: transform, opacity;
        }

        @keyframes pulse1 {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.6; }
          50% { transform: translateX(-50%) scale(1.1); opacity: 0.8; }
        }
        
        @keyframes pulse2 {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.5; }
          50% { transform: scale(1.15) translate(-20px, 20px); opacity: 0.7; }
        }
        
        @keyframes pulse3 {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.6; }
        }
        
        @keyframes pulse4 {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(0.9); opacity: 0.6; }
        }
        
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(12px); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
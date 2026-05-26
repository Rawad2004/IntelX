"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#investors", label: "Investors" },
  { href: "#faq", label: "FAQ" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const isHidden = currentScrollY > lastScrollY.current && currentScrollY > 100;
        const isScrolled = currentScrollY > 20;

        setHidden((prev) => (prev !== isHidden ? isHidden : prev));
        setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));

        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* SVG Filter for Liquid Glass distortion */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="liquid-glass-distortion" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.01 0.01"
              numOctaves="1"
              seed="5"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="8"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          hidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        {/* Floating container with liquid glass */}
        <div
          className={`mx-auto transition-all duration-500 ${
            scrolled 
              ? "mx-4 mt-3 max-w-5xl rounded-[24px]" 
              : "max-w-full rounded-none"
          }`}
        >
          {/* Liquid Glass layers */}
          <div className={`relative ${scrolled ? "liquid-glass" : ""}`}>
            {/* Frost/blur layer */}
            {scrolled && (
              <>
                {/* Background blur layer */}
                <div 
                  className="pointer-events-none absolute inset-0 rounded-[24px]"
                  style={{
                    backdropFilter: "blur(40px) saturate(180%)",
                    WebkitBackdropFilter: "blur(40px) saturate(180%)",
                  }}
                />
                
                {/* Inner glow/tint layer */}
                <div 
                  className="pointer-events-none absolute inset-0 rounded-[24px]"
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    boxShadow: `
                      inset 0 0 20px -5px rgba(255, 255, 255, 0.5),
                      inset 0 1px 0 rgba(255, 255, 255, 0.2),
                      inset 0 -1px 0 rgba(255, 255, 255, 0.05)
                    `,
                  }}
                />

                {/* Outer shadow */}
                <div 
                  className="pointer-events-none absolute inset-0 rounded-[24px]"
                  style={{
                    boxShadow: `
                      0 8px 32px rgba(0, 0, 0, 0.3),
                      0 0 0 1px rgba(255, 255, 255, 0.1)
                    `,
                  }}
                />

                {/* Distortion overlay (subtle) */}
                <div 
                  className="pointer-events-none absolute inset-0 rounded-[24px] opacity-30"
                  style={{
                    filter: "url(#liquid-glass-distortion)",
                    background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
                  }}
                />

                {/* Specular highlight (top edge) */}
                <div 
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1px] rounded-t-[24px]"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 20%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 80%, transparent 100%)",
                  }}
                />
              </>
            )}

            {/* Content */}
            <div className={`relative z-10 transition-all duration-300 ${scrolled ? "px-6 py-3" : "px-6 py-5"}`}>
              <nav className="flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 transition-transform duration-200 hover:scale-105">
                  <Image
                    src="/logo/intelx-logo.svg"
                    alt="IntelX"
                    width={36}
                    height={36}
                    priority
                    className="h-9 w-9"
                  />
                  <span className="text-lg font-semibold text-white">IntelX</span>
                </Link>

                {/* Nav Links - Desktop (Centered) */}
                <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="group relative px-4 py-2 text-sm font-medium text-white/70 transition-all duration-200 hover:text-white"
                    >
                      <span className="relative z-10">{link.label}</span>
                      <span 
                        className="absolute inset-0 rounded-xl opacity-0 transition-all duration-200 group-hover:opacity-100"
                        style={{
                          background: scrolled 
                            ? "rgba(255, 255, 255, 0.1)" 
                            : "rgba(255, 255, 255, 0.05)",
                          boxShadow: scrolled 
                            ? "inset 0 1px 0 rgba(255,255,255,0.1)" 
                            : "none",
                        }}
                      />
                    </a>
                  ))}
                </div>

                {/* CTA - Right aligned */}
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="hidden px-4 py-2 text-sm font-medium text-white/70 transition-colors duration-200 hover:text-white sm:block"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="cta-button relative overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105"
                  >
                    <span className="relative z-10">Get Early Access</span>
                    {/* Button glow */}
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                        boxShadow: "0 4px 20px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
                      }}
                    />
                    {/* Animated shine */}
                    <span className="shine-effect" />
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <style jsx>{`
        .liquid-glass {
          position: relative;
          isolation: isolate;
        }

        .cta-button .shine-effect {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          transform: translateX(-100%);
          animation: shine 3s ease-in-out infinite;
          border-radius: 9999px;
        }

        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          60%, 100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
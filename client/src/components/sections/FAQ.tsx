"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Minus } from "@phosphor-icons/react";

const FAQ_ITEMS = [
  {
    question: "What makes IntelX different from traditional analytics?",
    answer: "We don't predict outcomes—we model behavior. Our 12 proprietary signals capture match dynamics that traditional stats miss: momentum shifts, pressure patterns, and tactical tendencies. We focus on how matches behave, not just what happens.",
  },
  {
    question: "What data sources do you use?",
    answer: "IntelX uses league statistics, team form data (Last 5/6/10 matches), home/away splits, and referee tendencies. We deliberately exclude odds, in-play data, news, and speculation to maintain analytical purity.",
  },
  {
    question: "Is this a betting platform?",
    answer: "No. IntelX is a behavioral intelligence engine. We don't generate betting picks, predict scores, or optimize for win rates. Our goal is to explain how matches behave and provide calibrated insights—not gambling advice.",
  },
  {
    question: "How do I access the platform?",
    answer: "We're currently in private beta. You can request early access through our website and we'll notify you when spots become available. Beta users get priority access to new features and direct input on product development.",
  },
  {
    question: "What is the Confidence Band Width (CBW)?",
    answer: "CBW is our governance layer that determines how confident we can be in any analysis. It can be Narrow (high confidence), Medium (standard), or Wide (low confidence). CBW has supreme authority—it can expand uncertainty when signals conflict or data is limited.",
  },
  {
    question: "Do you offer an API?",
    answer: "API access is planned for our enterprise tier. It will allow programmatic access to our signal system, match profiles, and behavioral intelligence. Join the waitlist to be notified when it launches.",
  },
];

export default function FAQ() {
  const [isVisible, setIsVisible] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
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

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="relative overflow-hidden py-32"
    >
      {/* Background - continues from Investment */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: "#030712",
          }}
        />

        {/* Animated geometric shapes */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating hexagon grid */}
          <svg 
            className="absolute left-0 top-0 h-full w-full opacity-[0.03]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <polygon 
                  points="25,0 50,14.4 50,38.4 25,52.8 0,38.4 0,14.4" 
                  fill="none" 
                  stroke="rgba(139, 92, 246, 0.5)" 
                  strokeWidth="0.5"
                  transform="translate(0, -4.7)"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexagons)" />
          </svg>

          {/* Animated floating orbs */}
          <div 
            className="absolute h-[300px] w-[300px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
              left: "10%",
              top: "20%",
              filter: "blur(60px)",
              animation: "float1 20s ease-in-out infinite",
            }}
          />
          <div 
            className="absolute h-[400px] w-[400px] rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)",
              right: "5%",
              top: "40%",
              filter: "blur(80px)",
              animation: "float2 25s ease-in-out infinite",
            }}
          />
          <div 
            className="absolute h-[250px] w-[250px] rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)",
              left: "30%",
              bottom: "10%",
              filter: "blur(50px)",
              animation: "float3 18s ease-in-out infinite",
            }}
          />

          {/* Animated lines */}
          <svg className="absolute inset-0 h-full w-full">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(139, 92, 246, 0)" />
                <stop offset="50%" stopColor="rgba(139, 92, 246, 0.3)" />
                <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
              </linearGradient>
            </defs>
            <line 
              x1="0" y1="30%" x2="100%" y2="30%" 
              stroke="url(#lineGradient)" 
              strokeWidth="1"
              className="animate-pulse"
              style={{ animationDuration: "4s" }}
            />
            <line 
              x1="0" y1="70%" x2="100%" y2="70%" 
              stroke="url(#lineGradient)" 
              strokeWidth="1"
              className="animate-pulse"
              style={{ animationDuration: "5s", animationDelay: "1s" }}
            />
          </svg>
        </div>

        {/* Noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`mb-16 text-center transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <span className="text-sm font-semibold text-blue-400">💬 FAQ</span>
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/50">
            Everything you need to know about IntelX and how we model football behavior.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div
          className={`space-y-4 transition-all duration-700 delay-100 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className="group"
              style={{
                transitionDelay: `${150 + index * 50}ms`,
              }}
            >
              <div
                className="overflow-hidden rounded-2xl transition-all duration-300"
                style={{
                  background: openIndex === index 
                    ? "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)"
                    : "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                  border: `1px solid ${openIndex === index ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {/* Question */}
                <button
                  onClick={() => toggleQuestion(index)}
                  className="flex w-full cursor-pointer items-center justify-between p-6 text-left transition-all"
                >
                  <span className="pr-4 text-lg font-semibold text-white">
                    {item.question}
                  </span>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all"
                    style={{
                      background: openIndex === index 
                        ? "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
                        : "rgba(255,255,255,0.1)",
                    }}
                  >
                    {openIndex === index ? (
                      <Minus size={18} weight="bold" className="text-white" />
                    ) : (
                      <Plus size={18} weight="bold" className="text-white/60" />
                    )}
                  </div>
                </button>

                {/* Answer */}
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: openIndex === index ? "500px" : "0",
                    opacity: openIndex === index ? 1 : 0,
                  }}
                >
                  <div className="px-6 pb-6">
                    <div 
                      className="h-px w-full mb-4"
                      style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.3) 50%, transparent 100%)",
                      }}
                    />
                    <p className="text-white/60 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          className={`mt-16 text-center transition-all duration-700 delay-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div
            className="mx-auto inline-flex flex-col items-center rounded-3xl p-8 sm:p-10"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="mb-4 text-4xl">🤔</div>
            <h3 className="mb-2 text-xl font-semibold text-white">Still have questions?</h3>
            <p className="mb-6 text-white/50">We'd love to hear from you.</p>
            <a
              href="mailto:hello@intelx.ai"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                boxShadow: "0 8px 32px rgba(139, 92, 246, 0.3)",
              }}
            >
              Contact Us
              <span>→</span>
            </a>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float1 {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(30px, -30px) rotate(5deg);
          }
          50% {
            transform: translate(60px, 0) rotate(0deg);
          }
          75% {
            transform: translate(30px, 30px) rotate(-5deg);
          }
        }
        
        @keyframes float2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-40px, 20px) scale(1.1);
          }
          66% {
            transform: translate(20px, -20px) scale(0.9);
          }
        }
        
        @keyframes float3 {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-50px, -30px);
          }
        }
      `}</style>
    </section>
  );
}
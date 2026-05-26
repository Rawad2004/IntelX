"use client";

import { useState, useEffect } from "react";
import { Cookie, X } from "@phosphor-icons/react";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const cookieChoice = localStorage.getItem("intelx-cookies");
    if (!cookieChoice) {
      setTimeout(() => setShow(true), 2000);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("intelx-cookies", "accepted");
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem("intelx-cookies", "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-6 sm:right-auto sm:max-w-md animate-slide-up">
      <div 
        className="rounded-2xl p-5 shadow-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex gap-4">
          {/* Icon */}
          <div 
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <Cookie size={22} className="text-blue-400" weight="duotone" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h4 className="mb-1 text-sm font-semibold text-white">Cookie Notice</h4>
            <p className="mb-4 text-sm leading-relaxed text-white/60">
              We use cookies to enhance your experience and analyze site traffic.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={accept} 
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
                }}
              >
                Accept
              </button>
              <button 
                onClick={decline} 
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white/50 transition-all hover:bg-white/5 hover:text-white"
              >
                Decline
              </button>
            </div>
          </div>

          {/* Close button */}
          <button 
            onClick={decline}
            className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-all hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
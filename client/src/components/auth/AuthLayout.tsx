"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useT } from "@/lib/i18n/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const t = useT();
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#030712]">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Gradient base */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.05) 0%, transparent 50%)
            `,
          }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating orbs */}
        <div 
          className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-6 lg:p-8">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <Image
              src="/logo/intelx-logo.svg"
              alt="IntelX"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="text-xl font-bold text-white">IntelX</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/"
              className="text-sm font-medium text-white/50 transition-colors hover:text-white"
            >
              {t("auth.layout.backHome")}
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Card */}
            <div 
              className="rounded-3xl p-8 sm:p-10"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              }}
            >
              {/* Header */}
              <div className="mb-8 text-center">
                <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
                <p className="text-sm text-white/50">{subtitle}</p>
              </div>

              {/* Form Content */}
              {children}
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-white/30">
              {t("auth.layout.legalPrefix")}{" "}
              <Link href="/terms" className="text-white/50 underline hover:text-white">
                {t("auth.layout.terms")}
              </Link>{" "}
              {t("auth.layout.and")}{" "}
              <Link href="/privacy" className="text-white/50 underline hover:text-white">
                {t("auth.layout.privacy")}
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BarChart2, Settings, LogOut } from "lucide-react";
import { clearTokens } from "@/lib/auth";

export default function DashboardHeader() {
  const router = useRouter();

  const handleLogout = () => {
    clearTokens();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-[#030817]/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo/intelx-logo.svg"
              alt="IntelX"
              width={32}
              height={32}
              priority
            />
            <span className="text-xl font-bold text-white">
              Intel<span className="text-cyan-400">X</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-medium"
            >
              <BarChart2 className="w-4 h-4" />
              <span>Matches</span>
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <BarChart2 className="w-4 h-4" />
              <span>Analytics</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
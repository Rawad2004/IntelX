"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

export default function WaitlistConfirmPage() {
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);

  const [state, setState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    title: string;
    message: string;
  }>({ status: "idle", title: "", message: "" });

  useEffect(() => {
    const t = token.trim();

    if (!t) {
      setState({
        status: "error",
        title: "Missing token",
        message: "This confirmation link is incomplete.",
      });
      return;
    }

    (async () => {
      setState({
        status: "loading",
        title: "Confirming...",
        message: "Please wait while we confirm your email.",
      });

      try {
        const res = await fetch(
          `${API_BASE}/waitlist/confirm?token=${encodeURIComponent(t)}`,
          { method: "GET" }
        );

        const data = await res.json();

        if (!res.ok) {
          setState({
            status: "error",
            title: "Confirmation failed",
            message:
              data?.message ||
              "Your token may be invalid or expired. Please request a new one.",
          });
          return;
        }

        const status = data?.status;

        if (status === "ALREADY_CONFIRMED") {
          setState({
            status: "success",
            title: "Already confirmed",
            message: data?.message || "You are already confirmed.",
          });
          return;
        }

        setState({
          status: "success",
          title: "Confirmed!",
          message: data?.message || "Your email has been confirmed successfully.",
        });
      } catch (e: any) {
        setState({
          status: "error",
          title: "Network error",
          message: e?.message || "Could not reach the server.",
        });
      }
    })();
  }, [token]);

  const boxClass =
    state.status === "success"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
      : state.status === "error"
      ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
      : "border-sky-400/40 bg-sky-500/10 text-sky-100";

  return (
    <main className="min-h-screen bg-[var(--intelx-bg)] font-body">
      <div className="relative min-h-screen overflow-hidden">
        {/* Premium gradient backdrop (MISMO del /waitlist) */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(31,179,255,0.22),transparent_55%),radial-gradient(circle_at_80%_22%,rgba(0,73,184,0.18),transparent_55%),radial-gradient(circle_at_55%_85%,rgba(82,209,255,0.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.55),rgba(3,8,23,0.92))]" />
          <div className="absolute -top-24 left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6 py-14">
          <div
            className="
              relative w-full overflow-hidden rounded-[28px]
              border border-slate-700/40
              bg-slate-950/25
              shadow-[0_40px_140px_rgba(3,8,23,0.95)]
              backdrop-blur-2xl
            "
          >
            {/* soft glow inside */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(31,179,255,0.12),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(0,73,184,0.10),transparent_55%)]" />

            <div className="relative p-8">
              {/* Brand */}
              <Link
                href="/"
                className="inline-flex cursor-pointer items-center gap-3 opacity-95 hover:opacity-100 transition"
                aria-label="Go to landing"
              >
                <Image
                  src="/logo/intelx-logo.svg"
                  alt="IntelX"
                  width={40}
                  height={40}
                  className="h-9 w-9 object-contain"
                  priority
                />
                <div className="leading-tight">
                  <div className="text-xs font-semibold tracking-[0.22em] text-slate-200">
                    INTELX
                  </div>
                  <div className="text-[0.7rem] text-[var(--intelx-muted)]">
                    Secure confirmation
                  </div>
                </div>
              </Link>

              <div className="mt-6">
                <div className="text-xs font-semibold tracking-[0.22em] text-slate-400">
                  EMAIL CONFIRMATION
                </div>
                <h1 className="mt-2 font-heading text-3xl text-white">
                  {state.status === "success"
                    ? "You're all set."
                    : state.status === "error"
                    ? "We couldn't confirm it."
                    : "Confirming your email..."}
                </h1>
                <p className="mt-2 text-sm text-[var(--intelx-muted)]">
                  We’ll verify your token and finalize your early access.
                </p>
              </div>

              <div className={`mt-6 rounded-2xl border px-4 py-4 text-sm ${boxClass}`}>
                <div className="font-semibold">
                  {state.title || (state.status === "idle" ? "Ready" : "Working...")}
                </div>
                <div className="mt-1 opacity-90">
                  {state.message ||
                    "Open your email confirmation link to continue."}
                </div>
              </div>

              {/* Single CTA */}
              <div className="mt-6">
                <Link
                  href="https://app.intelxofficial.xyz"
                  className="
                    hero-cta-primary w-full cursor-pointer
                    shadow-[0_18px_55px_rgba(31,179,255,0.40)]
                    hover:shadow-[0_26px_75px_rgba(31,179,255,0.60)]
                  "
                >
                  Go to landing
                </Link>
              </div>

              <div className="mt-7 text-center text-xs text-slate-500">
                © IntelX
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

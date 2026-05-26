"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type JoinResponse =
  | { ok: true; status: string; message: string; position?: number | null }
  | { ok: false; status: string; message: string };

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  const canSubmit = useMemo(() => {
    const v = email.trim().toLowerCase();
    return v.length > 5 && v.includes("@") && v.includes(".");
  }, [email]);

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = (await res.json()) as JoinResponse;

      if (!res.ok || (data as any).ok === false) {
        setResult({
          type: "error",
          title: "Something went wrong",
          message:
            (data as any)?.message ||
            "We couldn’t add you to the waitlist. Try again.",
        });
        return;
      }

      const status = (data as any).status;

      if (status === "ALREADY_CONFIRMED") {
        setResult({
          type: "info",
          title: "You’re already confirmed",
          message: (data as any).message || "This email is already confirmed.",
        });
        return;
      }

      setResult({
        type: "success",
        title: "Check your email",
        message:
          (data as any).message ||
          "We sent you a confirmation link. Please confirm to secure your spot.",
      });
      setEmail("");
    } catch (err: any) {
      setResult({
        type: "error",
        title: "Network error",
        message:
          err?.message ||
          "Couldn’t reach the server. Check NEXT_PUBLIC_API_BASE_URL.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--intelx-bg)] font-body">
      <div className="relative min-h-screen overflow-hidden">
        {/* Premium gradient backdrop */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(31,179,255,0.22),transparent_55%),radial-gradient(circle_at_80%_22%,rgba(0,73,184,0.18),transparent_55%),radial-gradient(circle_at_55%_85%,rgba(82,209,255,0.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.55),rgba(3,8,23,0.92))]" />
          <div className="absolute -top-24 left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
          <div
            className="
              w-full overflow-hidden rounded-[28px]
              border border-slate-700/40
              bg-slate-950/25
              shadow-[0_40px_140px_rgba(3,8,23,0.95)]
              backdrop-blur-2xl
            "
          >
            {/* subtle inner glow */}
            <div className="pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(circle_at_50%_0%,black,transparent_65%)]" />

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* LEFT */}
              <section className="relative hidden min-h-[560px] md:block">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(31,179,255,0.26),transparent_55%),radial-gradient(circle_at_75%_55%,rgba(0,73,184,0.25),transparent_55%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,20,39,0.35),rgba(3,8,23,0.95))]" />

                <div className="relative z-10 flex h-full flex-col justify-between p-10">
                  <div className="flex items-center justify-between">
                    <Link
                      href="https://app.intelxofficial.xyz"
                      className="inline-flex items-center gap-3 opacity-95 hover:opacity-100 transition"
                      aria-label="Back to website"
                    >
                      <Image
                        src="/logo/intelx-logo.svg"
                        alt="IntelX"
                        width={46}
                        height={46}
                        className="h-11 w-11 object-contain"
                        priority
                      />
                      <div className="leading-tight">
                        <div className="text-xs font-semibold tracking-[0.22em] text-slate-200">
                          INTELX
                        </div>
                        <div className="text-[0.7rem] text-[var(--intelx-muted)]">
                          Early-access waitlist
                        </div>
                      </div>
                    </Link>

                    <a href="https://app.intelxofficial.xyz" className="hero-ghost-pill">
                      Back to website →
                    </a>
                  </div>

                  <div className="max-w-sm">
                    <h2 className="font-heading text-3xl leading-tight text-white">
                      Secure your early access.
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--intelx-muted)]">
                      Join the IntelX waitlist to receive beta access, rewards,
                      and launch updates.
                    </p>

                    <div className="mt-6 space-y-2 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                        Confirmation email in seconds
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                        No spam, only product updates
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                        Early access & rewards eligibility
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400/90">
                    © {new Date().getFullYear()} IntelX. All rights reserved.
                  </div>
                </div>
              </section>

              {/* RIGHT */}
              <section className="p-7 md:p-10">
                {/* Mobile header */}
                <div className="flex items-center justify-between md:hidden">
                  <Link href="/" className="inline-flex items-center gap-2">
                    <Image
                      src="/logo/intelx-logo.svg"
                      alt="IntelX"
                      width={38}
                      height={38}
                      className="h-9 w-9 object-contain"
                      priority
                    />
                    <span className="text-xs font-semibold tracking-[0.22em] text-slate-200">
                      INTELX
                    </span>
                  </Link>

                  <Link href="/" className="hero-ghost-pill">
                    Back →
                  </Link>
                </div>

                <div className="mt-6 md:mt-0">
                  <div className="text-xs font-semibold tracking-[0.22em] text-slate-400">
                    EARLY ACCESS
                  </div>
                  <h1 className="mt-2 font-heading text-3xl md:text-4xl text-white">
                    Join the waitlist
                  </h1>
                  <p className="mt-2 text-sm text-[var(--intelx-muted)]">
                    Enter your email and confirm it to lock in your spot.
                  </p>
                </div>

                <form onSubmit={onJoin} className="mt-7 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-300">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="you@email.com"
                      className="
                        w-full rounded-2xl border border-slate-700/60 bg-slate-950/55
                        px-4 py-3 text-sm text-slate-100 outline-none
                        placeholder:text-slate-500
                        focus:border-[var(--intelx-primary-soft)]
                        focus:ring-4 focus:ring-cyan-400/15
                        transition
                      "
                      autoComplete="email"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit || loading}
                    className={`
                      hero-cta-primary w-full
                      shadow-[0_18px_55px_rgba(31,179,255,0.40)]
                      hover:shadow-[0_26px_75px_rgba(31,179,255,0.60)]
                      ${(!canSubmit || loading) ? "opacity-60 cursor-not-allowed hover:transform-none" : ""}
                    `}
                  >
                    {loading ? "Sending..." : "Join waitlist"}
                  </button>

                  {result && (
                    <div
                      className={`
                        rounded-2xl border px-4 py-3 text-sm
                        ${
                          result.type === "success"
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : result.type === "info"
                            ? "border-sky-400/40 bg-sky-500/10 text-sky-100"
                            : "border-rose-400/40 bg-rose-500/10 text-rose-100"
                        }
                      `}
                    >
                      <div className="font-semibold">{result.title}</div>
                      <div className="mt-1 opacity-90">{result.message}</div>
                    </div>
                  )}

                  <div className="pt-2 text-xs text-slate-500">
                    By joining, you agree to receive IntelX emails related to the
                    waitlist and product updates.
                  </div>
                </form>

                <div className="mt-8 flex items-center justify-between border-t border-slate-800/70 pt-5 text-xs text-slate-500">
                  <span>Secure confirmation link</span>
                  <Link
                    href="/"
                    className="text-[var(--intelx-primary-soft)] hover:text-[var(--intelx-primary)] transition"
                  >
                    app.intelxofficial.xyz
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

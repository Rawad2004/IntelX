export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--intelx-bg)] font-body">
      <div className="relative min-h-screen overflow-hidden">
        {/* Same premium gradient backdrop */}
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
              p-8
            "
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(31,179,255,0.12),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(0,73,184,0.10),transparent_55%)]" />

            <div className="relative">
              <div className="text-xs font-semibold tracking-[0.22em] text-slate-400">
                EMAIL CONFIRMATION
              </div>
              <div className="mt-2 font-heading text-3xl text-white">
                Confirming...
              </div>
              <p className="mt-2 text-sm text-[var(--intelx-muted)]">
                Please wait while we finalize your access.
              </p>

              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-950/35 px-4 py-4 text-sm text-slate-200">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-cyan-300" />
                Loading
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

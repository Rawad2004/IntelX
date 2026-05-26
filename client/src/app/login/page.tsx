"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeSlash,
  Envelope,
  Lock,
  SpinnerGap,
} from "@phosphor-icons/react";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleButton from "@/components/auth/GoogleButton";
import { login, googleAuthCallback, validateEmail } from "@/lib/auth";
import { useT } from "@/lib/i18n/LanguageProvider";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError(t("auth.login.errorInvalidEmail"));
      return;
    }

    if (password.length < 6) {
      setError(t("auth.login.errorShortPassword"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({ email, password });

      if (response.success) {
        if (response.requiresVerification) {
          router.push(`/verify?email=${encodeURIComponent(email)}`);
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(response.message || t("auth.login.errorFailed"));
      }
    } catch {
      setError(t("auth.login.errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    try {
      const response = await googleAuthCallback(credential);

      if (response.success) {
        router.push("/dashboard");
      } else {
        setError(response.message || t("auth.login.errorFailed"));
      }
    } catch {
      setError(t("auth.login.errorGoogle"));
    }
  };

  return (
    <AuthLayout
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        {error && (
          <div
            className="rounded-xl p-4 text-sm text-red-400"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            {error}
          </div>
        )}

        {/* Email Input */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-white/70"
          >
            {t("auth.login.emailLabel")}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Envelope size={18} className="text-white/30" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.login.emailPlaceholder")}
              autoComplete="email"
              disabled={isLoading}
              className="
                w-full rounded-xl py-3.5 pl-11 pr-4
                text-sm text-white placeholder-white/30
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-violet-500/30
                disabled:cursor-not-allowed disabled:opacity-50
              "
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-white/70"
            >
              {t("auth.login.passwordLabel")}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-violet-400 hover:text-violet-300"
            >
              {t("auth.login.forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Lock size={18} className="text-white/30" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.login.passwordPlaceholder")}
              autoComplete="current-password"
              disabled={isLoading}
              className="
                w-full rounded-xl py-3.5 pl-11 pr-12
                text-sm text-white placeholder-white/30
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-violet-500/30
                disabled:cursor-not-allowed disabled:opacity-50
              "
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/30 hover:text-white/50"
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="
            w-full rounded-xl py-3.5
            text-sm font-semibold text-white
            transition-all duration-150
            hover:opacity-90
            disabled:cursor-not-allowed disabled:opacity-50
          "
          style={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
            boxShadow: "0 10px 30px rgba(139, 92, 246, 0.3)",
          }}
        >
          {isLoading ? (
            <SpinnerGap size={20} className="mx-auto animate-spin" />
          ) : (
            t("auth.login.submit")
          )}
        </button>

        <div className="relative flex items-center gap-4 py-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/30">{t("auth.login.orContinueWith")}</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <GoogleButton
          onSuccess={handleGoogleSuccess}
          onError={() => setError(t("auth.login.errorGoogle"))}
          text="signin"
        />

        <p className="text-center text-sm text-white/50">
          {t("auth.login.noAccount")}{" "}
          <Link
            href="/register"
            className="font-semibold text-violet-400 hover:text-violet-300"
          >
            {t("auth.login.signupCta")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

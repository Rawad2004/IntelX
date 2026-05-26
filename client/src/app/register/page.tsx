"use client";

import { useState, FormEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeSlash,
  Envelope,
  Lock,
  User,
  SpinnerGap,
  Check,
  X,
} from "@phosphor-icons/react";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleButton from "@/components/auth/GoogleButton";
import {
  register,
  googleAuthCallback,
  validateEmail,
  validatePassword,
  getPasswordStrength,
} from "@/lib/auth";
import { useT } from "@/lib/i18n/LanguageProvider";

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Password validation
  const passwordValidation = useMemo(
    () => validatePassword(password),
    [password],
  );
  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password],
  );

  const strengthColors = {
    weak: "bg-red-500",
    medium: "bg-amber-500",
    strong: "bg-emerald-500",
  };

  const strengthWidths = {
    weak: "w-1/3",
    medium: "w-2/3",
    strong: "w-full",
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("auth.register.errorName"));
      return;
    }

    if (!validateEmail(email)) {
      setError(t("auth.register.errorEmail"));
      return;
    }

    if (!passwordValidation.valid) {
      setError(t("auth.register.errorPassword"));
      return;
    }

    if (!acceptTerms) {
      setError(t("auth.register.errorTerms"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await register({ name, email, password });

      if (response.success) {
        router.push(`/verify?email=${encodeURIComponent(email)}&type=register`);
      } else {
        setError(response.message || t("auth.register.errorFailed"));
      }
    } catch {
      setError(t("auth.register.errorGeneric"));
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
        setError(response.message || t("auth.register.errorFailed"));
      }
    } catch {
      setError(t("auth.register.errorGoogle"));
    }
  };

  return (
    <AuthLayout
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
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

        {/* Name Input */}
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-white/70"
          >
            {t("auth.register.nameLabel")}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <User size={18} className="text-white/30" />
            </div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.register.namePlaceholder")}
              autoComplete="name"
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

        {/* Email Input */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-white/70"
          >
            {t("auth.register.emailLabel")}
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
              placeholder={t("auth.register.emailPlaceholder")}
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
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-white/70"
          >
            {t("auth.register.passwordLabel")}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Lock size={18} className="text-white/30" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.register.passwordPlaceholder")}
              autoComplete="new-password"
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

          {/* Password Strength */}
          {password && (
            <div className="mt-3 space-y-3">
              {/* Strength Bar */}
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strengthColors[passwordStrength]} ${strengthWidths[passwordStrength]}`}
                  />
                </div>
                <span
                  className={`text-xs font-medium capitalize ${
                    passwordStrength === "weak"
                      ? "text-red-400"
                      : passwordStrength === "medium"
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }`}
                >
                  {t(`auth.register.strength${passwordStrength[0].toUpperCase()}${passwordStrength.slice(1)}`)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t("auth.register.reqEightChars"), met: password.length >= 8 },
                  { label: t("auth.register.reqUpper"), met: /[A-Z]/.test(password) },
                  { label: t("auth.register.reqLower"), met: /[a-z]/.test(password) },
                  { label: t("auth.register.reqNumber"), met: /[0-9]/.test(password) },
                ].map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {req.met ? (
                      <Check
                        size={14}
                        weight="bold"
                        className="text-emerald-400"
                      />
                    ) : (
                      <X size={14} weight="bold" className="text-white/30" />
                    )}
                    <span
                      className={`text-xs ${req.met ? "text-emerald-400" : "text-white/30"}`}
                    >
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setAcceptTerms(!acceptTerms)}
            className={`
              mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md
              transition-all duration-150
              ${
                acceptTerms
                  ? "bg-violet-500 text-white"
                  : "border border-white/20 bg-white/5"
              }
            `}
          >
            {acceptTerms && <Check size={14} weight="bold" />}
          </button>
          <span className="text-sm text-white/50">
            {t("auth.register.acceptTermsPrefix")}{" "}
            <Link
              href="/terms"
              className="text-violet-400 hover:text-violet-300"
            >
              {t("auth.register.termsOfService")}
            </Link>{" "}
            {t("auth.register.and")}{" "}
            <Link
              href="/privacy"
              className="text-violet-400 hover:text-violet-300"
            >
              {t("auth.register.privacyPolicy")}
            </Link>
          </span>
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
            t("auth.register.submit")
          )}
        </button>

        <div className="relative flex items-center gap-4 py-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/30">{t("auth.register.orContinueWith")}</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <GoogleButton
          onSuccess={handleGoogleSuccess}
          onError={() => setError(t("auth.register.errorGoogle"))}
          text="signup"
        />

        <p className="text-center text-sm text-white/50">
          {t("auth.register.haveAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-violet-400 hover:text-violet-300"
          >
            {t("auth.register.loginCta")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

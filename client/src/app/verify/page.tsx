"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Envelope, SpinnerGap, ArrowLeft, CheckCircle } from "@phosphor-icons/react";
import AuthLayout from "@/components/auth/AuthLayout";
import OTPInput from "@/components/auth/OTPInput";
import { verifyOTP, resendOTP } from "@/lib/auth";
import { useT } from "@/lib/i18n/LanguageProvider";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  
  const email = searchParams.get("email") || "";
  const type = searchParams.get("type") || "login"; // "login" or "register"
  
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.push("/login");
    }
  }, [email, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleComplete = useCallback(async (code: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await verifyOTP({ email, code });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setError(response.message || t("auth.verify.errorInvalid"));
      }
    } catch {
      setError(t("auth.verify.errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  }, [email, router, t]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setError(null);
    setIsResending(true);

    try {
      const response = await resendOTP(email);

      if (response.success) {
        setResendCooldown(60);
      } else {
        setError(response.message || t("auth.verify.errorResend"));
      }
    } catch {
      setError(t("auth.verify.errorResend"));
    } finally {
      setIsResending(false);
    }
  };

  // Mask email for display
  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "";

  if (!email) {
    return null;
  }

  return (
    <AuthLayout
      title={success ? t("auth.verify.titleSuccess") : t("auth.verify.title")}
      subtitle={success
        ? t("auth.verify.subtitleSuccess")
        : t("auth.verify.subtitle", { email: maskedEmail })
      }
    >
      {success ? (
        <div className="py-8 text-center">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <CheckCircle size={40} weight="fill" className="text-emerald-400" />
          </div>
          <p className="text-sm text-white/50">
            {t("auth.verify.successMessage")}
          </p>
        </div>
      ) : (
        // OTP Input State
        <div className="space-y-6">
          {/* Email Icon */}
          <div className="flex justify-center">
            <div 
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.05) 100%)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
              }}
            >
              <Envelope size={28} className="text-violet-400" />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div 
              className="rounded-xl p-4 text-center text-sm text-red-400"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {error}
            </div>
          )}

          {/* OTP Input */}
          <div className="py-4">
            <OTPInput 
              length={6}
              onComplete={handleComplete}
              disabled={isLoading}
              error={!!error}
            />
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-center">
              <SpinnerGap size={24} className="animate-spin text-violet-400" />
            </div>
          )}

          {/* Resend Code */}
          <div className="text-center">
            <p className="mb-2 text-sm text-white/50">
              {t("auth.verify.didntReceive")}
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="text-sm font-semibold text-violet-400 transition-colors hover:text-violet-300 disabled:cursor-not-allowed disabled:text-white/30"
            >
              {isResending ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerGap size={16} className="animate-spin" />
                  {t("auth.verify.resending")}
                </span>
              ) : resendCooldown > 0 ? (
                t("auth.verify.resendIn", { seconds: resendCooldown })
              ) : (
                t("auth.verify.resend")
              )}
            </button>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => router.push(type === "register" ? "/register" : "/login")}
              className="flex w-full items-center justify-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              <span>{type === "register" ? t("auth.verify.backToRegister") : t("auth.verify.backToLogin")}</span>
            </button>
          </div>

          {/* Help text */}
          <p className="text-center text-xs text-white/30">
            {t("auth.verify.expiresNote")}
          </p>
        </div>
      )}
    </AuthLayout>
  );
}

function VerifyFallback() {
  const t = useT();
  return (
    <AuthLayout title={t("common.loading")} subtitle="">
      <div className="flex justify-center py-8">
        <SpinnerGap size={32} className="animate-spin text-violet-400" />
      </div>
    </AuthLayout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <VerifyContent />
    </Suspense>
  );
}
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Envelope, SpinnerGap, ArrowLeft, CheckCircle } from "@phosphor-icons/react";
import AuthLayout from "@/components/auth/AuthLayout";
import OTPInput from "@/components/auth/OTPInput";
import { verifyOTP, resendOTP } from "@/lib/auth";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
        // Wait a moment to show success state
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setError(response.message || "Invalid verification code");
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [email, router]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setError(null);
    setIsResending(true);

    try {
      const response = await resendOTP(email);

      if (response.success) {
        setResendCooldown(60); // 60 second cooldown
      } else {
        setError(response.message || "Failed to resend code");
      }
    } catch (err) {
      setError("Failed to resend code. Please try again.");
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
      title={success ? "Email verified!" : "Verify your email"}
      subtitle={success 
        ? "Redirecting you to your dashboard..." 
        : `We sent a 6-digit code to ${maskedEmail}`
      }
    >
      {success ? (
        // Success State
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
            Your account has been verified successfully.
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
              Didn't receive the code?
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
                  Sending...
                </span>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                "Resend code"
              )}
            </button>
          </div>

          {/* Back to Login/Register */}
          <div className="pt-4">
            <button
              type="button"
              onClick={() => router.push(type === "register" ? "/register" : "/login")}
              className="flex w-full items-center justify-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              <span>Back to {type === "register" ? "registration" : "sign in"}</span>
            </button>
          </div>

          {/* Help text */}
          <p className="text-center text-xs text-white/30">
            The code expires in 10 minutes. Check your spam folder if you don't see it.
          </p>
        </div>
      )}
    </AuthLayout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <AuthLayout title="Loading..." subtitle="Please wait">
        <div className="flex justify-center py-8">
          <SpinnerGap size={32} className="animate-spin text-violet-400" />
        </div>
      </AuthLayout>
    }>
      <VerifyContent />
    </Suspense>
  );
}
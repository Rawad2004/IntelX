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

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({ email, password });

      if (response.success) {
        if (response.requiresVerification) {
          // Redirect to OTP verification
          router.push(`/verify?email=${encodeURIComponent(email)}`);
        } else {
          // Redirect to dashboard
          router.push("/dashboard");
        }
      } else {
        setError(response.message || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
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
        setError(response.message || "Google sign-in failed");
      }
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your behavioral intelligence dashboard"
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
            Email address
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
              placeholder="you@example.com"
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
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-violet-400 hover:text-violet-300"
            >
              Forgot password?
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
              placeholder="••••••••"
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
            "Sign in"
          )}
        </button>

        {/* Divider */}
        <div className="relative flex items-center gap-4 py-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/30">or continue with</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Google Button */}
        <GoogleButton
          onSuccess={handleGoogleSuccess}
          onError={() => setError("Google sign-in failed")}
          text="signin"
        />

        {/* Sign Up Link */}
        <p className="text-center text-sm text-white/50">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-violet-400 hover:text-violet-300"
          >
            Sign up for free
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

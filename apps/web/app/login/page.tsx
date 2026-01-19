"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Mail, CheckCircle2, Lock, ArrowLeft } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");

  // Modes:
  // 'magic-link': Email input for Magic Link
  // 'otp-verify': OTP input after link sent
  // 'pin-login': Email + PIN input
  const [mode, setMode] = useState<"magic-link" | "otp-verify" | "pin-login">(
    "magic-link",
  );

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 1. Request Magic Link (and OTP)
  const handleRequestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnTo }),
      });

      if (!res.ok) throw new Error("Failed to send magic link");

      setMode("otp-verify");
    } catch (_err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.ok) throw new Error("Invalid code");

      // Success - Redirect
      router.push(returnTo || "/dashboard");
    } catch (_err) {
      setError("Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Login with PIN
  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/pin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin }),
      });

      if (!res.ok) {
        if (res.status === 401)
          throw new Error("Invalid PIN or account not found");
        throw new Error("Failed to login");
      }

      router.push(returnTo || "/dashboard");
    } catch (err) {
      setError((err as Error).message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500 text-sm">
            {mode === "pin-login"
              ? "Enter your PIN to access your account"
              : "Sign in to manage your Pinga bot"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* VIEW 1: Request Magic Link */}
          {mode === "magic-link" && (
            <motion.form
              key="magic-link-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleRequestMagicLink}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Send Magic Link"
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode("pin-login")}
                  className="text-sm text-gray-500 hover:text-black transition-colors"
                >
                  Login with PIN instead
                </button>
              </div>
            </motion.form>
          )}

          {/* VIEW 2: OTP / Check Email */}
          {mode === "otp-verify" && (
            <motion.div
              key="otp-verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-medium text-gray-900">Check your email</h3>
                <p className="text-gray-500 text-sm mt-1">
                  We sent a code to{" "}
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="otp"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Enter 6-digit Code
                  </label>
                  <input
                    id="otp"
                    type="text" // numeric
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} // numbers only
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-center text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    placeholder="123456"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Verify Code"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("magic-link");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-black mt-2"
                >
                  Use a different email
                </button>
              </form>
            </motion.div>
          )}

          {/* VIEW 3: PIN Login */}
          {mode === "pin-login" && (
            <motion.form
              key="pin-login-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePinLogin}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="pin-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="pin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="pin"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  4-digit PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="pin"
                    type="password"
                    maxLength={4}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    placeholder="****"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Login with PIN"
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode("magic-link")}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-black transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Magic Link
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Secure authentication powered by Pinga
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 p-4">
      <Suspense
        fallback={
          <div className="p-8 bg-white rounded-2xl shadow-xl">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

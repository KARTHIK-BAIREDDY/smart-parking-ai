"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

// ─── Error message mapping for NextAuth error codes ──────────────────────────
function getErrorMessage(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "OAuthSignin":
      return "Could not start the Google sign-in flow. Please try again.";
    case "OAuthCallback":
      return "Authentication failed during Google callback. Check your Google OAuth Client ID and Secret in .env.local.";
    case "OAuthCreateAccount":
      return "Could not create your account. Please try again.";
    case "Callback":
      return "Callback error. Make sure your redirect URI is correctly configured in Google Cloud Console.";
    case "OAuthAccountNotLinked":
      return "This email is already linked to another sign-in method.";
    case "AccessDenied":
      return "Access was denied. You may have cancelled the Google sign-in.";
    case "Configuration":
      return "Server configuration error. Check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.";
    default:
      return `Authentication error: ${code}`;
  }
}

// ─── Inner form component (uses useSearchParams which requires Suspense) ─────
function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const errorMessage = getErrorMessage(errorCode);

  // Automatically redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/admin");
    }
  }, [status, router]);

  const handleGoogleLogin = () => {
    setLoading(true);
    signIn("google", { callbackUrl: "/admin" });
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--color-neon-blue)] mb-4" />
        <p className="text-sm font-mono animate-pulse text-[var(--color-neon-cyan)]">Verifying session...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="w-20 h-20 rounded-2xl bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)] flex items-center justify-center mb-5 border border-[var(--color-neon-blue)]/50 shadow-[0_0_30px_rgba(0,81,255,0.3)]"
        >
          <ShieldCheck className="w-10 h-10" />
        </motion.div>

        <h1 className="text-3xl font-bold text-white text-center">
          Admin Login
        </h1>
        <p className="text-gray-400 mt-2 text-sm text-center max-w-xs">
          Sign in with your Google account to access the Smart Parking admin dashboard
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/15 border border-red-500/40 rounded-xl flex items-start gap-3 text-red-300"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{errorMessage}</p>
        </motion.div>
      )}

      {/* Google Sign-In Button */}
      <div className="space-y-6">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 bg-white text-gray-800 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] touch-manipulation cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting to Google…
            </span>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Signup link */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-[var(--color-neon-cyan)] hover:underline"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-8 pt-6 border-t border-gray-800">
        <p className="text-gray-600 text-xs text-center leading-relaxed">
          By continuing, you agree to use your Google account for
          authentication. No passwords are stored by this application.
        </p>
      </div>
    </>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-neon-blue)]/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-10 rounded-3xl w-full max-w-md relative z-10 border border-[var(--color-neon-blue)]/30 shadow-[0_0_50px_rgba(0,81,255,0.15)] bg-slate-950/40 backdrop-blur-xl"
      >
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-10 h-10 animate-spin text-[var(--color-neon-blue)] mb-4" />
              <p className="text-sm font-mono animate-pulse">Loading auth panel...</p>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </motion.div>
    </main>
  );
}
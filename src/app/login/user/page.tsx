"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { getRoleRedirect, isAdminRole, isUserRole } from "@/lib/auth-helpers";

function getErrorMessage(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "CredentialsSignin":
      return "Invalid or expired OTP.";
    case "AccessDenied":
      return "Access denied.";
    default:
      return `Authentication error: ${code}`;
  }
}

function LoginForm() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const errorMessage = getErrorMessage(errorCode);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [isDevOtpEnabled, setIsDevOtpEnabled] = useState(false);
  const [receivedDevOtp, setReceivedDevOtp] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      router.push(getRoleRedirect(session.user.role));
    }
  }, [status, session, router]);

  useEffect(() => {
    fetch("/api/auth/otp/dev-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.enabled) {
          setIsDevOtpEnabled(true);
        }
      })
      .catch((err) => console.error("Error checking dev-status:", err));
  }, []);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    setReceivedDevOtp(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      if (data.devOtp) {
        setReceivedDevOtp(data.devOtp);
        setOtp(data.devOtp); // Auto-fill for convenience
      }
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const result = await signIn("user-otp", {
      mobile,
      otp,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setErrorMsg(result.error);
      return;
    }

    const res = await fetch("/api/auth/session");
    const data = await res.json();
    const role = data?.user?.role;

    if (isAdminRole(role)) {
      router.push("/admin/dashboard");
      return;
    }

    if (!isUserRole(role)) {
      await signOut({ redirect: false });
      setErrorMsg("Unable to sign in. Please contact support.");
    }
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--color-neon-blue)] mb-4" />
        <p className="text-sm font-mono animate-pulse text-[var(--color-neon-cyan)]">
          Verifying session...
        </p>
      </div>
    );
  }

  return (
    <>
      {isDevOtpEnabled && (
        <div className="mb-6 flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
          Development Mode - OTP shown locally
        </div>
      )}

      {(errorMessage || errorMsg) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/15 border border-red-500/40 rounded-xl flex items-start gap-3 text-red-300"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{errorMessage || errorMsg}</p>
        </motion.div>
      )}

      {step === 1 ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <input
            type="tel"
            placeholder="Mobile Number (10 digits)"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            required
            pattern="\d{10}"
            className="w-full p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none tracking-widest text-lg"
          />
          <button
            type="submit"
            disabled={loading || mobile.length !== 10}
            className="w-full py-4 bg-[var(--color-neon-blue)] hover:bg-blue-600 text-white font-bold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,81,255,0.2)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <p className="text-sm text-gray-400 mb-2">OTP sent to {mobile} <button type="button" onClick={() => setStep(1)} className="text-cyan-400 hover:underline">Change</button></p>
          
          {receivedDevOtp && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-sm text-amber-300 font-mono flex flex-col gap-1 items-center justify-center">
              <span className="text-xs text-amber-400/80">Dev OTP (auto-filled):</span>
              <span className="font-bold text-xl text-amber-200 tracking-wider select-all">{receivedDevOtp}</span>
            </div>
          )}

          <input
            type="text"
            placeholder="6-Digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            pattern="\d{6}"
            className="w-full p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none text-center tracking-[0.5em] text-2xl"
          />
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
          </button>
        </form>
      )}

      <p className="text-gray-400 text-sm text-center mt-6">
        New user?{" "}
        <Link href="/signup" className="text-[var(--color-neon-cyan)] hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-neon-blue)]/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-10 rounded-3xl w-full max-w-md relative z-10 border border-[var(--color-neon-blue)]/30 shadow-[0_0_50px_rgba(0,81,255,0.15)] bg-slate-950/40 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="w-20 h-20 rounded-2xl bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)] flex items-center justify-center mb-5 border border-[var(--color-neon-blue)]/50 shadow-[0_0_30px_rgba(0,81,255,0.3)]"
          >
            <ShieldCheck className="w-10 h-10" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white text-center">Login via Mobile</h1>
          <p className="text-gray-400 mt-2 text-sm text-center">Fast, passwordless access</p>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </motion.div>
    </main>
  );
}


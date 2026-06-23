/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [isDevOtpEnabled, setIsDevOtpEnabled] = useState(false);
  const [receivedDevOtp, setReceivedDevOtp] = useState<string | null>(null);

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

    const result = await signIn("credentials", {
      mobile,
      otp,
      name,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setErrorMsg(result.error);
      return;
    }

    // Since this is signup, they are immediately logged in
    router.push("/parking");
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-panel p-8 rounded-3xl w-full max-w-md relative z-10 border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.15)] bg-slate-950/40 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center mb-4 border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white text-center">Register Mobile</h1>
          <p className="text-gray-400 mt-2 text-sm text-center">Fast, secure passwordless signup</p>
        </div>

        {isDevOtpEnabled && (
          <div className="mb-6 flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
            Development Mode - OTP shown locally
          </div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/15 border border-red-500/40 rounded-xl flex items-start gap-3 text-red-300 text-sm"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
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
              className="w-full p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-green-400 outline-none tracking-widest text-lg"
            />
            <button
              type="submit"
              disabled={loading || mobile.length !== 10}
              className="w-full py-4 rounded-xl bg-green-500 text-white font-bold hover:bg-green-400 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <p className="text-sm text-gray-400 mb-2">
              OTP sent to {mobile}{" "}
              <button type="button" onClick={() => setStep(1)} className="text-green-400 hover:underline">
                Change
              </button>
            </p>

            {receivedDevOtp && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-sm text-amber-300 font-mono flex flex-col gap-1 items-center justify-center mb-2">
                <span className="text-xs text-amber-400/80">Dev OTP (auto-filled):</span>
                <span className="font-bold text-xl text-amber-200 tracking-wider select-all">{receivedDevOtp}</span>
              </div>
            )}
            
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-green-400 outline-none"
            />
            
            <input
              type="text"
              placeholder="6-Digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              pattern="\d{6}"
              className="w-full p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-green-400 outline-none text-center tracking-[0.5em] text-2xl mt-2"
            />
            
            <button
              type="submit"
              disabled={loading || otp.length !== 6 || name.length < 2}
              className="w-full py-4 rounded-xl bg-green-500 text-white font-bold hover:bg-green-400 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account & Login"}
            </button>
          </form>
        )}

        <p className="text-gray-400 text-sm text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-green-400 hover:underline">
            Login here
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

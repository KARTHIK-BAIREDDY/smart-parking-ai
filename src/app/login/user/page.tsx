"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, AlertTriangle, Loader2, UserPlus, LogIn, KeyRound } from "lucide-react";
import { signIn } from "next-auth/react";

type AuthFlow = "login" | "register" | "forgotPassword";

export default function UserLoginPage() {
  const router = useRouter();

  const [flow, setFlow] = useState<AuthFlow>("login");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Clear messages when switching flows
  useEffect(() => {
    setErrorMsg("");
    setSuccessMsg("");
    setName("");
    setMobile("");
    setPassword("");
    setConfirmPassword("");
  }, [flow]);

  const validateMobile = (mobile: string) => {
    return /^[6-9]\d{9}$/.test(mobile);
  };

  const validatePassword = (pwd: string) => {
    return /^\d{6}$/.test(pwd);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!validateMobile(mobile)) {
      setErrorMsg("Invalid mobile number. Must be 10 digits starting with 6, 7, 8, or 9.");
      return;
    }
    if (!validatePassword(password)) {
      setErrorMsg("Password must be exactly 6 numeric digits.");
      return;
    }

    setLoading(true);

    const result = await signIn("user-password", {
      mobile,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error.includes("needs a password")) {
        setErrorMsg(result.error);
        // We could automatically switch to forgot password here if desired, 
        // but user requested to just show the message and redirect (or user can click).
        setTimeout(() => setFlow("forgotPassword"), 2500);
      } else {
        setErrorMsg(result.error);
      }
      setLoading(false);
      return;
    }

    // On success, NextAuth middleware handles checking if they should be redirected
    router.push("/parking");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name || name.trim().length < 2) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!validateMobile(mobile)) {
      setErrorMsg("Invalid mobile number. Must be 10 digits starting with 6, 7, 8, or 9.");
      return;
    }
    if (!validatePassword(password)) {
      setErrorMsg("Password must be exactly 6 numeric digits.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile, password }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Registration failed");

      setSuccessMsg("Account created successfully. Please login.");
      setTimeout(() => setFlow("login"), 2000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!validateMobile(mobile)) {
      setErrorMsg("Invalid mobile number. Must be 10 digits starting with 6, 7, 8, or 9.");
      return;
    }
    if (!validatePassword(password)) {
      setErrorMsg("Password must be exactly 6 numeric digits.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, newPassword: password }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setSuccessMsg("Password updated successfully. Please login.");
      setTimeout(() => setFlow("login"), 2000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] max-w-full h-[800px] max-h-[100vh] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <ShieldCheck className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">User Portal</h1>
          <p className="text-gray-400">Mobile Number + Password Access</p>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/20 bg-slate-900/50 shadow-2xl backdrop-blur-xl">
          
          {/* Flow Tabs */}
          <div className="flex bg-slate-800/50 rounded-xl p-1 mb-6 border border-slate-700/50">
            <button
              onClick={() => setFlow("login")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                flow === "login" ? "bg-cyan-600 text-white shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setFlow("register")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                flow === "register" ? "bg-cyan-600 text-white shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={flow}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {errorMsg && (
                <div className="mb-6 p-4 bg-red-500/15 border border-red-500/40 rounded-xl flex items-start gap-3 text-red-300">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{errorMsg}</p>
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 bg-green-500/15 border border-green-500/40 rounded-xl flex items-start gap-3 text-green-300">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{successMsg}</p>
                </div>
              )}

              {/* LOGIN FLOW */}
              {flow === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <input
                    type="tel"
                    placeholder="Mobile Number (10 digits)"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                  <input
                    type="password"
                    placeholder="6-Digit Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono tracking-[0.2em]"
                  />
                  <button
                    type="submit"
                    disabled={loading || mobile.length !== 10 || password.length !== 6}
                    className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login"}
                    {!loading && <LogIn className="w-5 h-5" />}
                  </button>
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => setFlow("forgotPassword")}
                      className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </form>
              )}

              {/* REGISTER FLOW */}
              {flow === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile Number (10 digits)"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                  <input
                    type="password"
                    placeholder="Create 6-Digit Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono tracking-[0.2em]"
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono tracking-[0.2em]"
                  />
                  <button
                    type="submit"
                    disabled={loading || !name || mobile.length !== 10 || password.length !== 6 || confirmPassword.length !== 6}
                    className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                    {!loading && <UserPlus className="w-5 h-5" />}
                  </button>
                </form>
              )}

              {/* FORGOT PASSWORD FLOW */}
              {flow === "forgotPassword" && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm text-gray-400 mb-4 text-center">
                    Enter your registered mobile number to reset your password.
                  </p>
                  <input
                    type="tel"
                    placeholder="Registered Mobile Number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                  <input
                    type="password"
                    placeholder="New 6-Digit Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono tracking-[0.2em]"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono tracking-[0.2em]"
                  />
                  <button
                    type="submit"
                    disabled={loading || mobile.length !== 10 || password.length !== 6 || confirmPassword.length !== 6}
                    className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
                    {!loading && <KeyRound className="w-5 h-5" />}
                  </button>
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => setFlow("login")}
                      className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              )}

            </motion.div>
          </AnimatePresence>

        </div>
      </motion.div>
    </main>
  );
}

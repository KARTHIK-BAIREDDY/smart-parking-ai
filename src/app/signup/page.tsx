"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Automatically redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/admin");
    }
  }, [status, router]);

  const handleGoogleSignup = () => {
    setLoading(true);
    signIn("google", { callbackUrl: "/admin" });
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="glass-panel p-10 rounded-3xl w-full max-w-md relative z-10 border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.15)] bg-slate-950/40 backdrop-blur-xl flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-green-400 mb-4" />
          <p className="text-sm font-mono animate-pulse text-green-400">Verifying session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/10 blur-[150px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-10 rounded-3xl w-full max-w-md relative z-10 border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.15)] bg-slate-950/40 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center mb-4 border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white text-center">Create Admin Account</h1>
          <p className="text-gray-400 mt-2 text-sm text-center">Join the Smart Parking ecosystem</p>
        </div>

        <div className="space-y-6">
          <button 
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full py-4 bg-white text-gray-800 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors shadow-lg disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                Authenticating with Google...
              </span>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
              </>
            )}
          </button>

          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--color-neon-cyan)] hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

"use client";

import { Suspense, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldAlert, Loader2, AlertTriangle } from "lucide-react";
import { isSuperAdminRole } from "@/lib/auth-helpers";

function SuperAdminLoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (isSuperAdminRole((session.user as any).role)) {
        router.push("/admin/dashboard");
      }
    }
  }, [status, session, router]);

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/admin/dashboard" });
  };

  if (status === "loading" || (status === "authenticated" && isSuperAdminRole((session?.user as any)?.role))) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-red-400 mb-4" />
        <p className="text-sm font-mono animate-pulse">Verifying super admin access...</p>
      </div>
    );
  }

  // If authenticated but not super_admin
  if (status === "authenticated" && !isSuperAdminRole((session?.user as any)?.role)) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-xl flex items-start gap-3 text-red-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            Unauthorized Google Account. You must log in using the exact system owner email address.
          </p>
        </div>
        <button
          onClick={handleGoogleSignIn}
          className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
        >
          Try a different Google account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={handleGoogleSignIn}
        className="w-full py-4 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-xl transition flex items-center justify-center gap-3 border border-gray-200"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <p className="text-gray-500 text-xs text-center leading-relaxed">
        This portal is strictly for the system owner.
      </p>
    </div>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-10 rounded-3xl w-full max-w-md relative z-10 border border-red-500/30 bg-slate-950/60 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-5 border border-red-500/40">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white text-center">Super Admin</h1>
          <p className="text-gray-400 mt-2 text-sm text-center">System Owner Access</p>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-red-400" />
            </div>
          }
        >
          <SuperAdminLoginForm />
        </Suspense>
      </motion.div>
    </main>
  );
}

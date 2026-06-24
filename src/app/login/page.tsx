"use client";

import Link from "next/link";
import { User, Shield, ShieldAlert } from "lucide-react";

export default function LoginSelectionPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] max-w-full h-[800px] max-h-full bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto glass-panel p-8 md:p-12 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl relative z-10">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Welcome</h1>
        <p className="text-gray-400 text-sm text-center mb-10">Select your portal to continue</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/login/user"
            className="flex flex-col items-center justify-center text-center gap-4 p-8 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 transition group"
          >
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">User Login</h2>
              <p className="text-sm text-gray-400">Mobile + OTP access</p>
            </div>
          </Link>

          <Link
            href="/login/admin"
            className="flex flex-col items-center justify-center text-center gap-4 p-8 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 transition group"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Admin Login</h2>
              <p className="text-sm text-gray-400">Username & Password</p>
            </div>
          </Link>

          <Link
            href="/login/super-admin"
            className="flex flex-col items-center justify-center text-center gap-4 p-8 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-500/50 transition group"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-110 transition">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Super Admin Login</h2>
              <p className="text-sm text-gray-400">System owner access</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center glass-panel p-10 rounded-3xl border border-red-500/30">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
          <ShieldOff className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">403 — Unauthorized</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          You don&apos;t have permission to access this area. Administrator features are
          restricted to authorized operator accounts.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl border border-slate-700 text-gray-300 hover:bg-slate-800 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

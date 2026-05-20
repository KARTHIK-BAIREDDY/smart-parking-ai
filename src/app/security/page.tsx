"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useParking } from "@/lib/context/ParkingContext";
import { ShieldCheck, ArrowLeft, ShieldAlert, Activity, Server, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SecurityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { securityLogs } = useParking();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-[var(--color-neon-cyan)] animate-pulse text-xl">Verifying session...</div>
    </div>
  );
  if (status === "unauthenticated") return null;

  const severityColor = (severity: string) => {
    switch (severity) {
      case "low": return "text-green-400 bg-green-500/10 border-green-500/30";
      case "medium": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "high": return "text-red-400 bg-red-500/10 border-red-500/30";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <Link href="/admin" className="text-[var(--color-neon-blue)] flex items-center gap-2 mb-8 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-10 h-10 text-[var(--color-neon-blue)]" />
            Security <span className="text-[var(--color-neon-blue)] neon-text">Module</span>
          </h1>
          <p className="text-gray-400 mt-2">Live threat monitoring and system access logs.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-green-500/20 text-green-400 border border-green-500 px-4 py-2 rounded-full font-medium">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-ping" /> System Secure
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-green-500">
          <ShieldCheck className="w-6 h-6 text-green-400 mb-2" />
          <p className="text-sm text-gray-400">Firewall Status</p>
          <p className="text-xl font-bold text-white mt-1">Active</p>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-[var(--color-neon-blue)]">
          <Server className="w-6 h-6 text-[var(--color-neon-blue)] mb-2" />
          <p className="text-sm text-gray-400">Active Sessions</p>
          <p className="text-xl font-bold text-white mt-1">1 (Admin)</p>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-[var(--color-neon-cyan)]">
          <Activity className="w-6 h-6 text-[var(--color-neon-cyan)] mb-2" />
          <p className="text-sm text-gray-400">API Gateway</p>
          <p className="text-xl font-bold text-white mt-1">99.9% Uptime</p>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-yellow-500">
          <AlertTriangle className="w-6 h-6 text-yellow-400 mb-2" />
          <p className="text-sm text-gray-400">Threat Level</p>
          <p className="text-xl font-bold text-white mt-1">Low</p>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-[var(--color-glass-border)]">
        <h2 className="text-2xl font-bold text-white mb-6">Live Security Logs</h2>
        
        {securityLogs.length > 0 ? (
          <div className="space-y-4">
            {securityLogs.map((log, index) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${severityColor(log.severity)}`}
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono text-sm opacity-70">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="font-medium">
                    {log.event}
                  </div>
                </div>
                <div className="text-xs uppercase tracking-widest font-bold px-3 py-1 rounded bg-black/30 border border-current">
                  {log.severity}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-10">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recent security events logged.</p>
          </div>
        )}
      </div>
    </main>
  );
}

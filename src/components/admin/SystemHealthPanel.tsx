"use client";

import { useEffect, useState } from "react";
import { Server, Activity, Database, AlertTriangle } from "lucide-react";

export function SystemHealthPanel() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const [metricsRes, queueRes] = await Promise.all([
          fetch("/api/admin/dashboard/metrics").then(res => res.json()),
          fetch("/api/admin/ocr-queue").then(res => res.json()).catch(() => ({ events: [] }))
        ]);
        
        const formatTime = (isoString?: string) => {
          if (!isoString) return "Never";
          const diffMs = Date.now() - new Date(isoString).getTime();
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins === 0) return "Just now";
          if (diffMins < 60) return `${diffMins}m ago`;
          const diffHrs = Math.floor(diffMins / 60);
          if (diffHrs < 24) return `${diffHrs}h ago`;
          return `${Math.floor(diffHrs / 24)}d ago`;
        };

        const metrics = metricsRes.data || {};
        const latestCamEvent = metrics.activity?.recentEvents?.[0]?.timestamp;

        setHealth({
          mongoStatus: "Online",
          activeSessions: metrics.sessions?.activeSessions || 0,
          ocrQueueSize: queueRes.events?.length || 0,
          lastCameraEvent: formatTime(latestCamEvent),
          lastAuditEvent: formatTime(metrics.lastAuditEvent)
        });
      } catch (err) {
        console.error(err);
      }
    }
    fetchHealth();
  }, []);

  if (!health) return <div className="p-4 bg-slate-900 rounded-2xl animate-pulse h-32" />;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Server className="w-5 h-5 text-cyan-400" />
        System Health
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <p className="text-gray-400 text-xs uppercase">MongoDB</p>
          <p className="text-green-400 font-bold">{health.mongoStatus}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase">Active Sessions</p>
          <p className="text-white font-bold">{health.activeSessions}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase">OCR Queue</p>
          <p className="text-amber-400 font-bold flex items-center gap-1">
            {health.ocrQueueSize > 0 && <AlertTriangle className="w-3 h-3" />}
            {health.ocrQueueSize}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase">Last Cam Event</p>
          <p className="text-white font-bold">{health.lastCameraEvent}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase">Last Audit</p>
          <p className="text-white font-bold">{health.lastAuditEvent}</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Activity, Zap, CheckCircle2, Target, Clock, CarFront, LogOut } from "lucide-react";

interface TelemetryData {
  ocrReadsToday: number;
  ocrSuccessRate: number;
  averageConfidence: number;
  lastDetectionTime: string | null;
  lastAssignedVehicle: string | null;
  lastExitVehicle: string | null;
}

export function TelemetryPanel() {
  const [data, setData] = useState<TelemetryData | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard/telemetry")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .catch((err) => console.error(err));
  }, []);

  if (!data) return <div className="p-4 bg-slate-900 rounded-2xl animate-pulse h-32 mt-4 border border-slate-800" />;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 p-32 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-bold text-white">System Telemetry</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10">
        
        {/* OCR Reads Today */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium">OCR Reads Today</span>
          </div>
          <div className="text-2xl font-bold text-white">{data.ocrReadsToday.toLocaleString()}</div>
        </div>

        {/* Success Rate */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium">OCR Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">{data.ocrSuccessRate.toFixed(1)}%</div>
        </div>

        {/* Avg Confidence */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium">Avg Confidence</span>
          </div>
          <div className="text-2xl font-bold text-white">{data.averageConfidence.toFixed(1)}%</div>
        </div>

        {/* Last Detection Time */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium">Last Detection</span>
          </div>
          <div className="text-lg font-bold text-white truncate" title={data.lastDetectionTime || "Never"}>
            {data.lastDetectionTime ? new Date(data.lastDetectionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Never"}
          </div>
        </div>

        {/* Last Assigned */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <CarFront className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium">Last Entry</span>
          </div>
          <div className="text-lg font-bold text-white truncate">{data.lastAssignedVehicle || "-"}</div>
        </div>

        {/* Last Exit */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-medium">Last Exit</span>
          </div>
          <div className="text-lg font-bold text-white truncate">{data.lastExitVehicle || "-"}</div>
        </div>

      </div>
    </div>
  );
}

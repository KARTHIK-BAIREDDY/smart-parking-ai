"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, Users, Camera, CameraOff, Car, CheckCircle, Clock } from "lucide-react";

export function MetricsOverview() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard/metrics")
      .then(res => res.json())
      .then(data => {
        if (data.success) setMetrics(data.data);
      });
  }, []);

  if (!metrics) return <div className="p-4 bg-slate-900 rounded-2xl animate-pulse h-32" />;

  const onlineCams = metrics.cameras.filter((c: any) => c.status === "online").length;
  const offlineCams = metrics.cameras.length - onlineCams;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <p className="text-gray-400 text-sm mb-2 flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-cyan-400"/> Parking Overview</p>
        <p className="text-3xl font-bold text-white">{metrics.parking.totalSlots}</p>
        <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-2">
          <span className="text-green-400">{metrics.parking.availableSlots} avail</span> 
          <span className="text-red-400">{metrics.parking.occupiedSlots} occ</span>
          <span className="text-amber-400">{metrics.parking.reservedSlots} res</span>
        </div>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <p className="text-gray-400 text-sm mb-2 flex items-center gap-2"><Car className="w-4 h-4 text-purple-400"/> Session Overview</p>
        <p className="text-3xl font-bold text-white">{metrics.sessions.activeSessions}</p>
        <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-2">
          <span className="text-cyan-400">{metrics.sessions.todaysEntries} in</span>
          <span className="text-rose-400">{metrics.sessions.todaysExits} out</span>
          <span className="text-blue-400">{metrics.sessions.completedSessions} total</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <p className="text-gray-400 text-sm mb-2 flex items-center gap-2"><Camera className="w-4 h-4 text-green-400"/> Camera Health</p>
        <p className="text-3xl font-bold text-white">{metrics.cameras.length}</p>
        <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <span className="text-green-400">{onlineCams} online</span>
          {offlineCams > 0 && <span className="text-red-400">• {offlineCams} offline</span>}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center">
         <p className="text-gray-400 text-sm mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-400"/> Recent Activity</p>
         <div className="text-sm">
            <p className="text-white">Latest In: <span className="text-cyan-400 font-mono">{metrics.activity.latestEntry?.vehicleNumber || 'N/A'}</span></p>
            <p className="text-white mt-1">Latest Out: <span className="text-rose-400 font-mono">{metrics.activity.latestExit?.vehicleNumber || 'N/A'}</span></p>
         </div>
      </div>
    </div>
  );
}

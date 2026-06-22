/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { BarChart2, Clock, CalendarDays, Activity } from "lucide-react";

export function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard/analytics")
      .then(res => res.json())
      .then(data => {
        if (data.success) setAnalytics(data.data);
      });
  }, []);

  if (!analytics) return <div className="p-4 bg-slate-900 rounded-2xl animate-pulse h-32" />;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-indigo-400" />
        Operational Analytics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-gray-400 text-sm">Occupancy</p>
          <p className="text-2xl font-bold text-white">{analytics.occupancyPercentage}%</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Peak Hours</p>
          <p className="text-2xl font-bold text-white">{analytics.peakHours}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Avg Duration</p>
          <p className="text-2xl font-bold text-white">{analytics.averageParkingDurationMinutes} min</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Daily / Weekly Usage</p>
          <p className="text-2xl font-bold text-white">{analytics.dailyUsage} / {analytics.weeklyUsage}</p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-800">
        <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-400" /> OCR Pipeline (24h)
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-xl">
            <p className="text-xs text-gray-400">Processed (≥90%)</p>
            <p className="text-xl font-bold text-green-400">{analytics.cameraStats.autoProcessed}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl">
            <p className="text-xs text-gray-400">Queued (70-89%)</p>
            <p className="text-xl font-bold text-amber-400">{analytics.cameraStats.queued}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl">
            <p className="text-xs text-gray-400">Rejected (&lt;70%)</p>
            <p className="text-xl font-bold text-red-400">{analytics.cameraStats.rejected}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useParking } from "@/lib/context/ParkingContext";
import { Activity, MapPin, Car, CheckCircle, Users } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function AdminReportsPage() {
  const { locations, loading } = useParking();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setUserCount(d.length))
      .catch(() => {});

    fetch("/api/assignments")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setAssignmentCount(d.length))
      .catch(() => {});
  }, []);

  const totalLocations = locations.length;
  const totalSlots = locations.reduce((s, l) => s + l.totalSlots, 0);
  const occupiedSlots = locations.reduce((s, l) => s + l.occupiedSlots, 0);
  const availableSlots = locations.reduce((s, l) => s + l.availableSlots, 0);
  const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  const stats = [
    { label: "Total Locations", value: loading ? "..." : totalLocations, icon: MapPin, color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/30" },
    { label: "Total Slots", value: loading ? "..." : totalSlots, icon: Activity, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
    { label: "Available Slots", value: loading ? "..." : availableSlots, icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10 border-green-400/30" },
    { label: "Occupied Slots", value: loading ? "..." : occupiedSlots, icon: Car, color: "text-red-400", bg: "bg-red-400/10 border-red-400/30" },
    { label: "Registered Users", value: userCount ?? "...", icon: Users, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
    { label: "Total Assignments", value: assignmentCount ?? "...", icon: Activity, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  ];

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-400" /> Reports & Analytics
        </h1>
        <Link href="/admin/dashboard" className="text-gray-400 hover:text-white">← Dashboard</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-slate-900 border ${stat.bg} p-6 rounded-2xl flex items-center gap-4`}>
            <div className={`p-3 rounded-xl bg-black/30 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Occupancy Rate</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <span className="text-white font-bold text-lg w-16 text-right">{occupancyRate}%</span>
        </div>
        <p className="text-gray-400 text-sm mt-2">{occupiedSlots} of {totalSlots} slots occupied across {totalLocations} locations</p>
      </div>
    </main>
  );
}

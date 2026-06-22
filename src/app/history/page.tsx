"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParking } from "@/lib/context/ParkingContext";
import { motion } from "framer-motion";
import { History, ArrowLeft, Loader2, Calendar, Clock, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Assignment {
  id: string;
  parkingPlaceId: string;
  slotId: string;
  vehicleNumber: string;
  vehicleType: string;
  entryTime: string;
  exitTime: string | null;
  status: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const { locations } = useParking();
  const [sessions, setSessions] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/assignments");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchHistory();
    }
  }, [status]);

  const getPlaceName = (id: string) => {
    const loc = locations.find((l) => l.id === id);
    return loc ? loc.name : "Smart Parking Spot";
  };

  const calculateDuration = (entry: string, exit: string | null) => {
    if (!exit) return "Active Session";
    const start = new Date(entry).getTime();
    const end = new Date(exit).getTime();
    const diff = end - start;

    if (diff < 0) return "0 mins";

    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? "s" : ""}`;

    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours} hr${hours !== 1 ? "s" : ""} ${remainingMins} min${remainingMins !== 1 ? "s" : ""}`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Parking History</h1>
          <p className="text-gray-400 mt-1">Review all your past parking sessions</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {sessions.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-4 opacity-30 text-gray-400" />
            <p className="text-lg">No parking history available.</p>
            <p className="text-sm mt-1">Your sessions will appear here once you park in our spots.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((s, index) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-black/30 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700/80 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-lg">{getPlaceName(s.parkingPlaceId)}</span>
                    <span className="text-xs font-mono px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-gray-300 rounded-md">
                      Slot {s.slotId}
                    </span>
                    {s.status === "active" ? (
                      <span className="text-xs px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-full font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full font-medium">
                        Completed
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      {new Date(s.entryTime).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {new Date(s.entryTime).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {s.exitTime && ` - ${new Date(s.exitTime).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-0 border-slate-850 pt-3 sm:pt-0">
                  <span className="text-xs text-gray-500 block">Duration</span>
                  <span className="font-semibold text-white">
                    {calculateDuration(s.entryTime, s.exitTime)}
                  </span>
                  {s.vehicleNumber && (
                    <span className="block text-xs font-mono text-cyan-400 mt-1 uppercase">
                      Plate: {s.vehicleNumber}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

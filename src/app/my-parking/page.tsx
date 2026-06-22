"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParking } from "@/lib/context/ParkingContext";
import { motion } from "framer-motion";
import { Clock, MapPin, Car, ArrowLeft, Loader2, LogOut, CheckCircle } from "lucide-react";
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

export default function MyParkingPage() {
  const { data: session, status } = useSession();
  const { locations, updateSlotStatus, refreshLocations } = useParking();
  const [activeSession, setActiveSession] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");

  const fetchActiveSession = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/assignments");
      if (res.ok) {
        const data: Assignment[] = await res.json();
        // find active assignment
        const active = data.find((a) => a.status === "active");
        setActiveSession(active || null);
      }
    } catch (err) {
      console.error("Failed to load active session", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchActiveSession();
    }
  }, [status]);

  // Live Timer Effect
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      const entry = new Date(activeSession.entryTime).getTime();
      const now = new Date().getTime();
      const diff = now - entry;

      if (diff < 0) {
        setElapsedTime("00:00:00");
        return;
      }

      const sec = Math.floor((diff / 1000) % 60);
      const min = Math.floor((diff / (1000 * 60)) % 60);
      const hrs = Math.floor(diff / (1000 * 60 * 60));

      const pad = (n: number) => String(n).padStart(2, "0");
      setElapsedTime(`${pad(hrs)}:${pad(min)}:${pad(sec)}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleCheckOut = async () => {
    if (!activeSession) return;
    try {
      setCheckingOut(true);

      // 1. Mark assignment as completed
      const assignRes = await fetch("/api/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: activeSession.id,
          exitTime: new Date().toISOString(),
          status: "completed",
        }),
      });

      if (!assignRes.ok) {
        throw new Error("Failed to update assignment");
      }

      // 2. Set slot status back to available
      await updateSlotStatus(
        activeSession.parkingPlaceId,
        activeSession.slotId,
        "available"
      );

      setActiveSession(null);
      await refreshLocations();
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Failed to checkout. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  const getPlaceName = (id: string) => {
    const loc = locations.find((l) => l.id === id);
    return loc ? loc.name : "Smart Parking Spot";
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Current Session</h1>
          <p className="text-gray-400 mt-1">Manage your active slot occupancy</p>
        </div>
      </div>

      {!activeSession ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto mt-12">
          <CheckCircle className="w-16 h-16 text-cyan-400 mx-auto mb-4 opacity-75" />
          <h2 className="text-2xl font-bold text-white">You're not parked</h2>
          <p className="text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Your vehicle is currently not logged in any parking slot. Scan or assign a slot to start.
          </p>
          <Link
            href="/parking"
            className="inline-flex items-center gap-2 mt-6 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-3 px-6 rounded-xl transition"
          >
            Find Parking Places
          </Link>
        </div>
      ) : (
        <div className="bg-slate-900 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.05)]">
          {/* Header */}
          <div className="bg-cyan-950/20 border-b border-slate-800/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs font-semibold rounded-full uppercase tracking-wider">
                Active Session
              </span>
              <h2 className="text-2xl font-bold text-white mt-2">
                {getPlaceName(activeSession.parkingPlaceId)}
              </h2>
            </div>
            <div className="flex items-center gap-3 bg-black/40 border border-slate-800 rounded-xl px-4 py-2 text-white">
              <Clock className="w-5 h-5 text-cyan-400" />
              <span className="font-mono text-xl font-bold tracking-wider">{elapsedTime}</span>
            </div>
          </div>

          {/* Details */}
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black/30 border border-slate-800 p-5 rounded-xl">
                <span className="text-xs text-gray-500 block">Assigned Slot</span>
                <span className="text-2xl font-bold text-white font-mono mt-1 block">
                  {activeSession.slotId}
                </span>
              </div>

              <div className="bg-black/30 border border-slate-800 p-5 rounded-xl">
                <span className="text-xs text-gray-500 block">Vehicle Number</span>
                <span className="text-2xl font-bold text-white font-mono mt-1 block tracking-wider uppercase">
                  {activeSession.vehicleNumber || "N/A"}
                </span>
              </div>

              <div className="bg-black/30 border border-slate-800 p-5 rounded-xl">
                <span className="text-xs text-gray-500 block">Entry Time</span>
                <span className="text-base text-gray-300 font-semibold mt-2 block">
                  {new Date(activeSession.entryTime).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm text-gray-400">Ready to exit?</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Confirming exit frees up the slot immediately in real-time.
                </p>
              </div>

              <button
                onClick={handleCheckOut}
                disabled={checkingOut}
                className="w-full md:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Leaving...
                  </>
                ) : (
                  <>
                    <LogOut className="w-5 h-5" /> Release Slot & Exit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

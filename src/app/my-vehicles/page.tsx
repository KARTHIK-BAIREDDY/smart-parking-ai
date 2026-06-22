/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Plus, Trash2, ArrowLeft, Loader2, Info, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

const VEHICLE_TYPES = [
  "Car", "Motorcycle", "Scooter", "Bicycle", 
  "Auto Rickshaw", "Van", "Bus", "Truck", "SUV"
];

export default function MyVehiclesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleType: "Car",
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vehicles");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error("Failed to load vehicles", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchVehicles();
    }
  }, [sessionStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAdding(true);

    if (!formData.vehicleNumber) {
      setError("Vehicle plate number is required.");
      setAdding(false);
      return;
    }

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Vehicle submitted for approval!");
        setFormData({ vehicleNumber: "", vehicleType: "Car" });
        fetchVehicles();
      } else {
        setError(data.error || "Failed to add vehicle.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setAdding(false);
    }
  };

  if (sessionStatus === "loading") {
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
          <h1 className="text-3xl font-bold text-white">My Vehicles</h1>
          <p className="text-gray-400 mt-1">Manage vehicles registered to your account</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Side: Add Vehicle Form */}
        <div className="md:col-span-1">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl sticky top-24">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              Add Vehicle
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Plate Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH01AB1234"
                  value={formData.vehicleNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleNumber: e.target.value })
                  }
                  className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Vehicle Type
                </label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleType: e.target.value })
                  }
                  className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  {VEHICLE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={adding}
                className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
              >
                {adding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Adding...
                  </>
                ) : (
                  "Add Vehicle"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: List of Registered Vehicles */}
        <div className="md:col-span-2">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Registered Vehicles</h2>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-30 text-gray-400" />
                <p className="text-lg">No vehicles registered yet.</p>
                <p className="text-sm mt-1">Use the form on the left to register your first vehicle.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {vehicles.map((v, index) => (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-black/30 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl flex items-center justify-center">
                          <Car className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xl font-mono font-bold tracking-wider text-white">
                            {v.vehicleNumber}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-gray-400 capitalize">
                              {v.vehicleType}
                            </p>
                            <span className="text-gray-600 text-xs">•</span>
                            {v.status === "Approved" ? (
                              <span className="text-xs font-medium text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                              </span>
                            ) : v.status === "Rejected" ? (
                              <span className="text-xs font-medium text-red-400">
                                Rejected
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Registered on</span>
                        <span className="text-sm text-gray-300">
                          {new Date(v.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-slate-950/50 border border-slate-800 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Registered vehicles must be <b>Approved</b> before they are automatically matched at the entry camera barrier. 
                Please ensure the plate number matches your vehicle exactly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

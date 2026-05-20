"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Car, MapPin, Clock, ArrowRight } from "lucide-react";
import { useParking, ParkingPlace, Slot } from "@/lib/context/ParkingContext";
import Link from "next/link";

export default function FindVehiclePage() {
  const { findVehicle } = useParking();
  const [vehicleNo, setVehicleNo] = useState("");
  const [result, setResult] = useState<{ location: ParkingPlace; slot: Slot } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNo.trim()) return;
    
    setHasSearched(true);
    const found = findVehicle(vehicleNo.trim());
    setResult(found);
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col items-center">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center w-full"
      >
        <h1 className="text-4xl font-bold text-white mb-4">
          Locate Your <span className="text-[var(--color-neon-cyan)] neon-text">Vehicle</span>
        </h1>
        <p className="text-gray-400">Enter your license plate number to find exactly where you parked.</p>
      </motion.div>

      <form onSubmit={handleSearch} className="w-full max-w-2xl relative mb-12 group">
        <div className="absolute inset-0 bg-[var(--color-neon-cyan)]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex glass-panel rounded-full p-2 border border-[var(--color-neon-cyan)]/30 focus-within:border-[var(--color-neon-cyan)] shadow-[0_0_20px_rgba(0,243,255,0.1)]">
          <div className="pl-6 flex items-center justify-center">
            <Car className="w-6 h-6 text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="e.g., KA-01-AB-1234" 
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-white px-6 py-4 text-xl font-mono uppercase placeholder-gray-600"
          />
          <button 
            type="submit"
            className="bg-[var(--color-neon-cyan)] text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2"
          >
            <Search className="w-5 h-5" /> Find
          </button>
        </div>
      </form>

      {hasSearched && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          {result ? (
            <div className="glass-panel p-8 rounded-3xl border border-[var(--color-glass-border)] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-800">
                <div className="w-16 h-16 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <Car className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-widest">Vehicle Found</p>
                  <p className="text-3xl font-mono font-bold text-white uppercase">{result.slot.vehicleNo}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Location
                  </p>
                  <p className="text-xl text-white font-medium">{result.location.name}</p>
                  <p className="text-sm text-gray-500 mt-1">{result.location.area}, {result.location.district}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Entry Time
                  </p>
                  <p className="text-xl text-white font-medium">
                    {result.slot.entryTime ? new Date(result.slot.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Today</p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Assigned Slot</p>
                  <p className="text-4xl font-extrabold text-[var(--color-neon-cyan)] neon-text">{result.slot.id}</p>
                </div>
                
                <Link href={`/navigation?dest=${result.slot.id}`}>
                  <button className="px-6 py-4 bg-[var(--color-neon-blue)] rounded-xl text-white font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-[0_0_20px_rgba(0,81,255,0.3)]">
                    Navigate <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl text-center border border-red-500/30 bg-red-950/10">
              <Search className="w-16 h-16 text-red-500/50 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Vehicle Not Found</h3>
              <p className="text-gray-400">We couldn't locate a vehicle with license plate <span className="text-white font-mono uppercase">{vehicleNo}</span>. Please check the number and try again.</p>
            </div>
          )}
        </motion.div>
      )}
    </main>
  );
}

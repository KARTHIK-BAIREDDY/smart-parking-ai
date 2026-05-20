"use client";

import HeroSection from "@/components/HeroSection";
import AnalyticsCards from "@/components/AnalyticsCards";
import { useParking } from "@/lib/context/ParkingContext";
import { motion } from "framer-motion";
import { Car, Clock, MapPin, Navigation } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { lastParkedVehicle } = useParking();

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[500px] bg-[var(--color-neon-cyan)]/20 blur-[150px] pointer-events-none" />
      
      <div className="relative z-10 pb-20">
        <HeroSection />
        
        {lastParkedVehicle && (
          <section className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto -mt-10 mb-10 relative z-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 sm:p-8 rounded-3xl border border-[var(--color-neon-cyan)]/50 shadow-[0_0_30px_rgba(0,243,255,0.2)] bg-slate-900/90"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/50">
                    <Car className="w-5 h-5" />
                  </div>
                  Last Parked Vehicle
                </h2>
                <div className="mt-2 sm:mt-0 px-3 py-1 bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] rounded-full text-sm font-mono border border-[var(--color-neon-cyan)]">
                  {lastParkedVehicle.vehicleNo.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-gray-400 text-sm mb-1 flex items-center gap-1"><MapPin className="w-4 h-4" /> Location</p>
                  <p className="text-white font-medium text-lg">{lastParkedVehicle.placeName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1 flex items-center gap-1"><Car className="w-4 h-4" /> Assigned Slot</p>
                  <p className="text-[var(--color-neon-cyan)] font-bold text-xl">{lastParkedVehicle.slotId}</p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className="text-gray-400 text-sm mb-1 flex items-center gap-1"><Clock className="w-4 h-4" /> Entry Time</p>
                  <p className="text-white font-medium">
                    {new Date(lastParkedVehicle.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <Link href={`/navigation?dest=${lastParkedVehicle.slotId}`}>
                <button className="w-full py-3 bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-cyan)] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                  Navigate to Vehicle <Navigation className="w-5 h-5" />
                </button>
              </Link>
            </motion.div>
          </section>
        )}

        <AnalyticsCards />
      </div>
    </main>
  );
}
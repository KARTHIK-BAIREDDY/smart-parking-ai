/* eslint-disable */
"use client";

import HeroSection from "@/components/HeroSection";
import { useParking } from "@/lib/context/ParkingContext";
import { motion } from "framer-motion";
import { Car, CheckCircle, MapPin, Activity } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { locations, loading } = useParking();

  const totalLocations = locations.length;
  const totalSlots = locations.reduce((sum, loc) => sum + loc.totalSlots, 0);
  const occupiedSlots = locations.reduce((sum, loc) => sum + loc.occupiedSlots, 0);
  const availableSlots = locations.reduce((sum, loc) => sum + loc.availableSlots, 0);

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[500px] bg-[var(--color-neon-cyan)]/20 blur-[150px] pointer-events-none" />
      
      <div className="relative z-10 pb-20">
        <HeroSection />
        
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto -mt-10 relative z-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl flex items-start gap-4 shadow-lg shadow-green-500/20">
              <div className="p-3 rounded-lg bg-black/50 text-green-400"><MapPin className="w-6 h-6" /></div>
              <div>
                <p className="text-sm text-gray-400 font-medium">Total Locations</p>
                <p className="text-2xl font-bold text-white mt-1">{loading ? "..." : totalLocations}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl flex items-start gap-4 shadow-lg shadow-[var(--color-neon-cyan)]/20">
              <div className="p-3 rounded-lg bg-black/50 text-[var(--color-neon-cyan)]"><Activity className="w-6 h-6" /></div>
              <div>
                <p className="text-sm text-gray-400 font-medium">Total Slots</p>
                <p className="text-2xl font-bold text-white mt-1">{loading ? "..." : totalSlots}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-2xl flex items-start gap-4 shadow-lg shadow-red-500/20">
              <div className="p-3 rounded-lg bg-black/50 text-red-400"><Car className="w-6 h-6" /></div>
              <div>
                <p className="text-sm text-gray-400 font-medium">Occupied Slots</p>
                <p className="text-2xl font-bold text-white mt-1">{loading ? "..." : occupiedSlots}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-2xl flex items-start gap-4 shadow-lg shadow-[var(--color-neon-blue)]/20">
              <div className="p-3 rounded-lg bg-black/50 text-[var(--color-neon-blue)]"><CheckCircle className="w-6 h-6" /></div>
              <div>
                <p className="text-sm text-gray-400 font-medium">Available Slots</p>
                <p className="text-2xl font-bold text-white mt-1">{loading ? "..." : availableSlots}</p>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </main>
  );
}
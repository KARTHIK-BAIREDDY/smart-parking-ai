"use client";

import { motion } from "framer-motion";
import { SubRow, Slot } from "@/lib/context/ParkingContext";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

interface SlotVisualizerProps {
  subRow: SubRow;
  onSlotClick?: (slot: Slot) => void;
}

export default function SlotVisualizer({ subRow, onSlotClick }: SlotVisualizerProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]";
      case "occupied":
        return "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]";
      case "reserved":
        return "bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]";
      case "inactive":
        return "bg-gray-600/20 border-gray-600 text-gray-400 opacity-50";
      case "ai-recommended":
        return "bg-blue-500/30 border-blue-400 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse";
      default:
        return "bg-gray-500 border-gray-400";
    }
  };

  return (
    <div className="mb-10">
      <h3 className="text-xl font-semibold mb-4 text-[var(--color-neon-cyan)] flex items-center gap-2">
        Sub-Row {subRow.id}
        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-neon-cyan)]/50 to-transparent" />
      </h3>
      
      {/* 3D perspective wrapper with horizontal scroll for mobile */}
      <div className="perspective-1000 overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[600px] md:min-w-0 grid grid-cols-5 md:grid-cols-10 gap-3 md:gap-4 rotate-x-12">
          {subRow.slots.map((slot) => (
            <motion.button
              key={slot.id}
              onClick={() => onSlotClick?.(slot)}
              whileHover={{ 
                scale: 1.1,
                z: 20,
                rotateX: 0,
                boxShadow: "0px 10px 20px rgba(0,255,255,0.4)" 
              }}
              whileTap={{ scale: 0.95 }}
              className={twMerge(
                clsx(
                  "relative h-16 md:h-20 rounded-xl border-2 flex items-center justify-center font-bold text-base md:text-lg transition-colors backdrop-blur-sm",
                  getStatusColor(slot.status)
                )
              )}
            >
              {slot.id.split("-")[1]}
              
              {/* Optional vehicle number display */}
              {slot.vehicleNo && (
                <span className="absolute bottom-1 text-[0.5rem] md:text-[0.6rem] font-mono tracking-widest text-white/70">
                  {slot.vehicleNo}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

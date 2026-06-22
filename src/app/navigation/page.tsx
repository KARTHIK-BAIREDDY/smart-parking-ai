/* eslint-disable */
"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { Navigation, Map, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

function NavigationContent() {
  const searchParams = useSearchParams();
  const dest = searchParams.get("dest") || "A1-1";

  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: "Entrance", desc: "Scan and enter", icon: Map },
    { title: "Corridor", desc: "Follow blue line", icon: ArrowRight },
    { title: "Floor 1", desc: "Take ramp up", icon: Navigation },
    { title: "Row A", desc: "Turn left", icon: ArrowRight },
    { title: `Slot ${dest}`, desc: "Arrived", icon: CheckCircle2 },
  ];

  useEffect(() => {
    if (currentStep < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, steps.length]);

  return (
    <div className="flex flex-col lg:flex-row gap-12 mt-10 relative z-10">
      {/* 3D Map Visualization Simulation */}
      <div className="flex-1 glass-panel rounded-3xl p-8 border border-[var(--color-neon-cyan)]/30 shadow-[0_0_30px_rgba(0,243,255,0.15)] relative overflow-hidden flex items-center justify-center min-h-[500px]">
        
        {/* Background Grid */}
        <div className="absolute inset-0 perspective-1000">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 rotate-x-60 scale-150" />
        </div>

        {/* Animated Path */}
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
          <motion.path
            d="M 10 90 L 30 60 L 50 60 L 70 30 L 90 20"
            fill="none"
            stroke="var(--color-neon-cyan)"
            strokeWidth="2"
            strokeDasharray="5,5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: currentStep / (steps.length - 1) }}
            transition={{ duration: 0.5 }}
            className="shadow-[0_0_10px_rgba(0,243,255,0.5)]"
          />
        </svg>

        {/* Points on the map */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
          <div className={`absolute left-[10%] bottom-[10%] w-4 h-4 rounded-full bg-white shadow-[0_0_15px_white] transition-all ${currentStep >= 0 ? 'scale-100' : 'scale-0'}`} />
          <div className={`absolute left-[30%] bottom-[40%] w-4 h-4 rounded-full bg-white shadow-[0_0_15px_white] transition-all ${currentStep >= 1 ? 'scale-100' : 'scale-0'}`} />
          <div className={`absolute left-[50%] bottom-[40%] w-4 h-4 rounded-full bg-white shadow-[0_0_15px_white] transition-all ${currentStep >= 2 ? 'scale-100' : 'scale-0'}`} />
          <div className={`absolute left-[70%] bottom-[70%] w-4 h-4 rounded-full bg-white shadow-[0_0_15px_white] transition-all ${currentStep >= 3 ? 'scale-100' : 'scale-0'}`} />
          
          {/* Destination */}
          <div className={`absolute left-[90%] bottom-[80%] -translate-x-1/2 translate-y-1/2 transition-all ${currentStep >= 4 ? 'scale-100' : 'scale-0'}`}>
            <div className="w-8 h-8 bg-green-500 rounded-full animate-ping absolute opacity-50" />
            <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white relative z-10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 rounded text-green-400 font-bold whitespace-nowrap">
              {dest}
            </div>
          </div>
        </div>
      </div>

      {/* Step by step directions */}
      <div className="w-full lg:w-96">
        <h3 className="text-2xl font-bold text-white mb-8 border-b border-gray-800 pb-4">Live Route</h3>
        
        <div className="space-y-6 relative">
          {/* Connecting line */}
          <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-gray-800 z-0" />
          
          {steps.map((step, idx) => {
            const isActive = idx === currentStep;
            const isPast = idx < currentStep;
            
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.2 }}
                className={`relative z-10 flex gap-4 ${isPast ? 'opacity-50' : isActive ? 'opacity-100 scale-105' : 'opacity-30'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
                  isActive ? 'bg-[var(--color-neon-cyan)] border-white text-black shadow-[0_0_15px_rgba(0,243,255,0.6)]' :
                  isPast ? 'bg-green-500 border-green-400 text-white' :
                  'bg-slate-900 border-gray-700 text-gray-500'
                }`}>
                  <step.icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <h4 className={`text-lg font-bold ${isActive ? 'text-[var(--color-neon-cyan)]' : 'text-white'}`}>{step.title}</h4>
                  <p className="text-gray-400 text-sm">{step.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

export default function NavigationPage() {
  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-neon-blue)]/10 blur-[100px] pointer-events-none" />
      
      <div className="mb-8 relative z-10">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Navigation className="w-10 h-10 text-[var(--color-neon-cyan)]" /> 
          Smart <span className="text-[var(--color-neon-cyan)] neon-text">Navigation</span>
        </h1>
        <p className="text-gray-400">Follow the augmented reality path to your vehicle.</p>
      </div>

      <Suspense fallback={<div className="text-white text-center py-20 animate-pulse">Loading Route...</div>}>
        <NavigationContent />
      </Suspense>
    </main>
  );
}

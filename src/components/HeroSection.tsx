'use client';

import { motion } from 'framer-motion';
import { Search, Map, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HeroSection() {
  const router = useRouter();
  
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[var(--color-neon-cyan)]/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          <span className="block text-white">Next-Gen</span>
          <span className="block neon-text text-[var(--color-neon-cyan)]">Smart Parking</span>
        </h1>
        
        <p className="mt-4 max-w-2xl text-xl text-gray-400 mx-auto mb-10">
          AI-driven automated vehicle detection, real-time slot allocation, and seamless indoor navigation for smart cities.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <motion.button 
            onClick={() => router.push('/parking')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-[var(--color-neon-cyan)] text-black font-bold rounded-lg flex items-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] transition-all"
          >
            <Search className="w-5 h-5" /> Find Parking
          </motion.button>
          
          <motion.button 
            onClick={() => router.push('/find-vehicle')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 glass-panel text-white font-bold rounded-lg flex items-center gap-2 hover:bg-white/10 transition-all"
          >
            <Map className="w-5 h-5" /> Locate Vehicle
          </motion.button>
          
          <motion.button 
            onClick={() => router.push('/login/user')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 border border-[var(--color-neon-blue)] text-[var(--color-neon-blue)] font-bold rounded-lg flex items-center gap-2 hover:bg-[var(--color-neon-blue)] hover:text-white transition-all shadow-[0_0_15px_rgba(0,81,255,0.2)]"
          >
            <Video className="w-5 h-5" /> Get Started
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}

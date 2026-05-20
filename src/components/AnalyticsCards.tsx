'use client';

import { motion } from 'framer-motion';
import { Activity, CarFront, Zap, ShieldCheck } from 'lucide-react';

const stats = [
  { id: 1, name: 'Live Occupancy', value: '84%', icon: Activity, color: 'text-green-400', shadow: 'shadow-green-500/20' },
  { id: 2, name: 'Vehicles Detected', value: '1,249', icon: CarFront, color: 'text-[var(--color-neon-cyan)]', shadow: 'shadow-[var(--color-neon-cyan)]/20' },
  { id: 3, name: 'AI Allocations', value: '43/min', icon: Zap, color: 'text-yellow-400', shadow: 'shadow-yellow-500/20' },
  { id: 4, name: 'System Status', value: 'Secure', icon: ShieldCheck, color: 'text-[var(--color-neon-blue)]', shadow: 'shadow-[var(--color-neon-blue)]/20' },
];

export default function AnalyticsCards() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`glass-panel p-6 rounded-2xl flex items-start gap-4 hover:-translate-y-1 transition-transform cursor-pointer shadow-lg ${stat.shadow}`}
          >
            <div className={`p-3 rounded-lg bg-black/50 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">{stat.name}</p>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

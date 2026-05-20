"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Camera, MapPin, ShieldAlert, User, PlusCircle, Menu, X, LogOut } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-[var(--color-glass-border)] bg-[var(--color-card-bg)]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
            <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}>
              <Car className="w-8 h-8 text-[var(--color-neon-cyan)]" />
            </motion.div>
            <span className="text-xl font-bold text-white neon-text">AutoPark AI</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
            <Link href="/parking" className="hover:text-[var(--color-neon-cyan)] transition-colors flex items-center gap-1">
              <MapPin className="w-4 h-4" /> Places
            </Link>
            <Link href="/add-parking" className="hover:text-[var(--color-neon-cyan)] transition-colors flex items-center gap-1">
              <PlusCircle className="w-4 h-4" /> Add Parking
            </Link>
            <Link href="/camera" className="hover:text-[var(--color-neon-cyan)] transition-colors flex items-center gap-1">
              <Camera className="w-4 h-4" /> Camera
            </Link>
            <Link href="/admin" className="hover:text-[var(--color-neon-cyan)] transition-colors flex items-center gap-1">
              <ShieldAlert className="w-4 h-4" /> Admin
            </Link>
            
            {session ? (
              <button onClick={() => signOut({ callbackUrl: "/" })} className="ml-4 px-4 py-2 rounded-full border border-red-500/50 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            ) : (
              <Link href="/login" className="ml-4 px-4 py-2 rounded-full border border-[var(--color-neon-cyan)] text-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)] hover:text-black transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,243,255,0.2)] hover:shadow-[0_0_20px_rgba(0,243,255,0.6)]">
                <User className="w-4 h-4" /> Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-300 hover:text-white p-2">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-[var(--color-glass-border)] bg-slate-900/95 overflow-hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-4 text-lg font-medium text-gray-300">
              <Link href="/" onClick={closeMenu} className="hover:text-[var(--color-neon-cyan)] flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <Car className="w-5 h-5" /> Home
              </Link>
              <Link href="/parking" onClick={closeMenu} className="hover:text-[var(--color-neon-cyan)] flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <MapPin className="w-5 h-5" /> Places
              </Link>
              <Link href="/add-parking" onClick={closeMenu} className="hover:text-[var(--color-neon-cyan)] flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <PlusCircle className="w-5 h-5" /> Add Parking
              </Link>
              <Link href="/camera" onClick={closeMenu} className="hover:text-[var(--color-neon-cyan)] flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <Camera className="w-5 h-5" /> Camera
              </Link>
              <Link href="/find-vehicle" onClick={closeMenu} className="hover:text-[var(--color-neon-cyan)] flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <MapPin className="w-5 h-5" /> Find Vehicle
              </Link>
              <Link href="/admin" onClick={closeMenu} className="hover:text-[var(--color-neon-cyan)] flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <ShieldAlert className="w-5 h-5" /> Admin Dashboard
              </Link>
              <Link href="/security" onClick={closeMenu} className="hover:text-[var(--color-neon-cyan)] flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <ShieldAlert className="w-5 h-5" /> Security
              </Link>
              
              <div className="border-t border-gray-800 pt-4 mt-2">
                {session ? (
                  <button onClick={() => { signOut({ callbackUrl: "/" }); closeMenu(); }} className="w-full px-4 py-3 rounded-xl border border-red-500/50 text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors">
                    <LogOut className="w-5 h-5" /> Logout
                  </button>
                ) : (
                  <Link href="/login" onClick={closeMenu} className="w-full px-4 py-3 rounded-xl border border-[var(--color-neon-cyan)] text-[var(--color-neon-cyan)] flex items-center justify-center gap-2 hover:bg-[var(--color-neon-cyan)] hover:text-black transition-colors">
                    <User className="w-5 h-5" /> Login / Sign Up
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

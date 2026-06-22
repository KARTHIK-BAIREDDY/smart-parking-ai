/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, MapPin, Bell, User, Menu, X, LogOut, Clock } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useNotifications } from "@/lib/context/NotificationContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const { unreadCount } = useNotifications();
  const closeMenu = () => setIsOpen(false);

  const authLinks = session
    ? [
        { href: "/dashboard", label: "Dashboard", icon: Car },
        { href: "/my-parking", label: "My Parking", icon: Clock },
        { href: "/notifications", label: "Notifications", icon: Bell, count: unreadCount },
        { href: "/profile", label: "Profile", icon: User },
      ]
    : [];

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

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
            <Link href="/" className="hover:text-[var(--color-neon-cyan)] transition-colors">
              Home
            </Link>
            <Link
              href="/parking"
              className="hover:text-[var(--color-neon-cyan)] transition-colors flex items-center gap-1"
            >
              <MapPin className="w-4 h-4" /> Parking Locations
            </Link>
            {authLinks.map(({ href, label, icon: Icon, count }) => (
              <Link
                key={href}
                href={href}
                className="hover:text-[var(--color-neon-cyan)] transition-colors flex items-center gap-1.5 relative"
              >
                <div className="relative flex items-center">
                  <Icon className="w-4 h-4" />
                  {typeof count === "number" && count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                  )}
                </div>
                <span>{label}</span>
                {typeof count === "number" && count > 0 && (
                  <span className="text-[10px] font-bold bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 px-1.5 py-0.2 rounded-full min-w-[15px] text-center">
                    {count}
                  </span>
                )}
              </Link>
            ))}

            {session ? (
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  signOut({ callbackUrl: "/login" });
                }}
                className="ml-4 px-4 py-2 rounded-full border border-red-500/50 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="ml-4 px-4 py-2 rounded-full border border-[var(--color-neon-cyan)] text-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)] hover:text-black transition-all flex items-center gap-2"
              >
                <User className="w-4 h-4" /> Login
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-[var(--color-glass-border)] bg-slate-900/95 overflow-hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-4 text-lg font-medium text-gray-300">
              <Link
                href="/"
                onClick={closeMenu}
                className="hover:text-[var(--color-neon-cyan)] flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
              >
                <Car className="w-5 h-5" /> Home
              </Link>
              <Link
                href="/parking"
                onClick={closeMenu}
                className="hover:text-[var(--color-neon-cyan)] flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
              >
                <MapPin className="w-5 h-5" /> Parking Locations
              </Link>
              {authLinks.map(({ href, label, icon: Icon, count }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className="hover:text-[var(--color-neon-cyan)] flex items-center justify-between p-2 rounded-lg hover:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </div>
                  {typeof count === "number" && count > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-full">
                      {count}
                    </span>
                  )}
                </Link>
              ))}

              <div className="border-t border-gray-800 pt-4 mt-2">
                {session ? (
                  <button
                    onClick={() => {
                      localStorage.clear();
                      sessionStorage.clear();
                      signOut({ callbackUrl: "/login" });
                      closeMenu();
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-red-500/50 text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                  >
                    <LogOut className="w-5 h-5" /> Logout
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-neon-cyan)] text-[var(--color-neon-cyan)] flex items-center justify-center gap-2 hover:bg-[var(--color-neon-cyan)] hover:text-black transition-colors"
                  >
                    <User className="w-5 h-5" /> Login
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

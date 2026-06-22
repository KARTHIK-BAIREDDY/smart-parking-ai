/* eslint-disable */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  Car,
  MapPin,
  Clock,
  History,
  Bell,
  User,
  LayoutGrid,
  Camera,
  Users,
  Settings2,
  LogOut,
  BarChart2,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/lib/context/NotificationContext";

const USER_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/parking", label: "Find Parking", icon: MapPin },
  { href: "/my-parking", label: "My Parking", icon: Clock },
  { href: "/history", label: "Parking History", icon: History },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/parking", label: "Parking Places", icon: MapPin },
  { href: "/admin/slots", label: "Slot Management", icon: Car },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/cameras/entry", label: "Entry Camera", icon: Camera },
  { href: "/admin/cameras/exit", label: "Exit Camera", icon: Camera },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];

const SUPER_ADMIN_ITEMS = [
  { href: "/admin/users", label: "Admin Management", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  if (status === "loading") {
    return (
      <>
        <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-sidebar)] px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6 text-[var(--color-accent)]" />
            <span className="text-lg font-bold tracking-tight text-white">AutoPark AI</span>
          </div>
        </div>
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] md:flex"></aside>
      </>
    );
  }

  console.log("SESSION USER =", session?.user);
  console.log("ROLE =", session?.user?.role);
  console.log("isSuperAdmin =", session?.user?.role === "super_admin");

  const isAdminRoute = pathname?.startsWith("/admin");
  const isSuperAdmin = session?.user?.role === "super_admin";
  
  let navItems = isAdminRoute ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS.map((item) =>
    item.href === "/notifications" ? { ...item, count: unreadCount } : item
  );

  console.log("=== SIDEBAR RENDER ===");
  console.log("session.user.role:", session?.user?.role);
  console.log("isSuperAdmin:", isSuperAdmin);
  console.log("SUPER_ADMIN_ITEMS length:", SUPER_ADMIN_ITEMS.length);


  if (isAdminRoute && isSuperAdmin) {
    navItems = [
      ...ADMIN_NAV_ITEMS.slice(0, 3), // Insert after Slot Management
      ...SUPER_ADMIN_ITEMS,
      ...ADMIN_NAV_ITEMS.slice(3),
    ];
  }

  console.log("NAV ITEMS =", navItems);

  const isActive = (href: string) => {
    if (href === "/admin/dashboard" || href === "/dashboard") return pathname === href;
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2 px-4 py-6">
        <Car className="h-6 w-6 text-[var(--color-accent)]" />
        <span className="text-xl font-bold tracking-tight text-white">AutoPark AI</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ href, label, icon: Icon, count }: any) => (
          <Link
            key={href}
            href={href}
            onClick={() => setIsOpen(false)}
            className={cn(
              "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]"
                : "text-[var(--color-secondary)] hover:bg-[var(--color-card)]/50 hover:text-[var(--color-primary)]"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive(href) ? "text-[var(--color-accent)]" : "text-[var(--color-secondary)] group-hover:text-[var(--color-primary)]"
                )}
              />
              <span>{label}</span>
            </div>
            {typeof count === "number" && count > 0 && (
              <span className="text-xs font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border)] p-4">
        {session?.user && (
          <div className="mb-4 flex items-center gap-3 px-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback>{session.user.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-[var(--color-primary)]">
                {session.user.name}
              </span>
              <span className="truncate text-xs text-[var(--color-secondary)]">
                {session.user.email}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            signOut({ callbackUrl: "/login" });
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header & Hamburger */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-sidebar)] px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6 text-[var(--color-accent)]" />
          <span className="text-lg font-bold tracking-tight text-white">AutoPark AI</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-[var(--color-sidebar)] md:hidden"
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
            >
              <X className="h-6 w-6" />
            </button>
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] md:flex">
        <SidebarContent />
      </aside>
    </>
  );
}

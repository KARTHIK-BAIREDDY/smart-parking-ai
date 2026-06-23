"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ArrowLeft, Calendar, Info, ShieldAlert, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/lib/context/NotificationContext";

export default function NotificationsPage() {
  const { status } = useSession();
  const { notifications, loading, unreadCount, markAllAsRead, markSingleAsRead } = useNotifications();
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await markAllAsRead();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await markSingleAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case "security":
        return <ShieldAlert className="w-5 h-5 text-cyan-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-500/10 border-green-500/20";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/20";
      case "security":
        return "bg-cyan-500/10 border-cyan-500/20";
      default:
        return "bg-blue-500/10 border-blue-500/20";
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  };



  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/parking"
          className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 mt-1">Stay updated with system and parking alerts</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">All Alerts</h2>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50 hover:underline transition"
              >
                {markingAll ? "Marking..." : "Mark all as read"}
              </button>
            )}
            <span className="text-xs bg-slate-850 border border-slate-800 px-3 py-1 rounded-full text-gray-400">
              {unreadCount} Unread
            </span>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 text-gray-500 flex items-center justify-center mb-4 border border-slate-700 shadow-lg">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No notifications available</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-xs leading-relaxed">
              When system events like slot assignments or vehicle entries occur, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {notifications.map((n, index) => (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => !n.isRead && handleMarkSingleRead(n._id)}
                  className={`p-5 rounded-2xl border flex gap-4 transition relative overflow-hidden cursor-pointer ${
                    !n.isRead ? "bg-slate-850/50 border-cyan-500/35 hover:bg-slate-800" : "bg-black/20 border-slate-850 hover:bg-black/30"
                  }`}
                >
                  {!n.isRead && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-cyan-400 rounded-bl-lg" />
                  )}

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getBgColor(n.type)}`}>
                    {getIcon(n.type)}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`font-bold ${!n.isRead ? "text-white" : "text-gray-300"}`}>
                        {n.title}
                      </h3>
                      {!n.isRead && (
                        <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded-full font-semibold">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatTime(n.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}

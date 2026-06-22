/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "security";
  createdAt: string;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markSingleAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    try {
      console.log("[NotificationProvider] Fetching /api/notifications");
      const res = await fetch("/api/notifications");
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setNotifications(data.notifications || []);
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      } else {
        // Fallback calculation
        const calcUnread = (data.notifications || []).filter((n: NotificationItem) => !n.isRead).length;
        setUnreadCount(calcUnread);
      }
    } catch (err) {
      console.error("[NotificationProvider] Request failed: /api/notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchNotifications();
    } else if (status === "unauthenticated") {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [status]);

  const refreshNotifications = async () => {
    if (status !== "authenticated") return;
    await fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (status !== "authenticated") return;
    try {
      const url = "/api/notifications";
      console.log(`[NotificationProvider] PUT ${url} (markAll)`);
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("[NotificationProvider] Request failed: /api/notifications (markAll)", err);
    }
  };

  const markSingleAsRead = async (id: string) => {
    if (status !== "authenticated") return;
    try {
      const url = "/api/notifications";
      console.log(`[NotificationProvider] PUT ${url} (markSingle: ${id})`);
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("[NotificationProvider] Request failed: /api/notifications (markSingle)", err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        markAllAsRead,
        markSingleAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

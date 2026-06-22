"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParking } from "@/lib/context/ParkingContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Car, MapPin, Clock, Bell, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/context/NotificationContext";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { locations, loading } = useParking();

  // For a real app, these would come from an active session API
  const activeSlot = null; // e.g., "A12"
  const activeVehicle = null; // e.g., "ABC-1234"
  const parkingDuration = null; // e.g., "2h 15m"
  const { unreadCount: unreadNotifications } = useNotifications();

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--color-primary)]">
          Welcome back, {session?.user?.name?.split(" ")[0] ?? "User"}
        </h1>
        <p className="text-[var(--color-secondary)]">
          Here is your parking overview for today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-secondary)]">
              Current Parking Slot
            </CardTitle>
            <MapPin className="h-4 w-4 text-[var(--color-accent)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {activeSlot || "None"}
            </div>
            <p className="text-xs text-[var(--color-secondary)] mt-1">
              {activeSlot ? "Active session" : "No active parking session"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-secondary)]">
              Vehicle Number
            </CardTitle>
            <Car className="h-4 w-4 text-[var(--color-slot-reserved)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {activeVehicle || "N/A"}
            </div>
            <p className="text-xs text-[var(--color-secondary)] mt-1">
              {activeVehicle ? "Currently parked" : "Register a vehicle to start"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-secondary)]">
              Parking Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-[var(--color-slot-maintenance)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {parkingDuration || "--:--"}
            </div>
            <p className="text-xs text-[var(--color-secondary)] mt-1">
              {parkingDuration ? "Time elapsed" : "Awaiting entry"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-secondary)]">
              Notifications
            </CardTitle>
            <Bell className="h-4 w-4 text-[var(--color-slot-available)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {unreadNotifications}
            </div>
            <p className="text-xs text-[var(--color-secondary)] mt-1">
              Unread messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions / System Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Commonly used features</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild className="w-full justify-between" variant="secondary">
              <Link href="/parking">
                Find Parking <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild className="w-full justify-between" variant="secondary">
              <Link href="/my-vehicles">
                Manage Vehicles <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild className="w-full justify-between" variant="secondary">
              <Link href="/history">
                View History <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Current parking lot statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-sm text-[var(--color-secondary)]">Loading locations...</div>
              ) : locations.length === 0 ? (
                <div className="text-sm text-[var(--color-secondary)]">No locations found.</div>
              ) : (
                locations.slice(0, 3).map((loc) => {
                  const occupancyRate = loc.totalSlots > 0 ? ((loc.totalSlots - loc.availableSlots) / loc.totalSlots) * 100 : 0;
                  return (
                    <div key={loc.id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none text-[var(--color-primary)]">{loc.name}</p>
                        <p className="text-sm text-[var(--color-secondary)]">
                          {loc.availableSlots} / {loc.totalSlots} slots available
                        </p>
                      </div>
                      <div className="font-medium text-sm text-[var(--color-secondary)]">
                        {Math.round(occupancyRate)}% full
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

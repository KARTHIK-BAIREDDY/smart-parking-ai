/* eslint-disable */
"use client";

import { useParking } from "@/lib/context/ParkingContext";
import { useState, useEffect } from "react";
import { MapPin, Search, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Read-only parking locations view for customers */
export default function ParkingLocationsPage() {
  const { locations, loading, slots, slotsLoading, refreshSlots } = useParking();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");

  useEffect(() => {
    if (locations.length > 0 && !selectedPlaceId) {
      setSelectedPlaceId(locations[0].id);
    }
  }, [locations, selectedPlaceId]);

  useEffect(() => {
    if (selectedPlaceId) refreshSlots(selectedPlaceId);
  }, [selectedPlaceId, refreshSlots]);

  const filtered = locations.filter((loc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      loc.name?.toLowerCase().includes(q) ||
      loc.code?.toLowerCase().includes(q) ||
      loc.area?.toLowerCase().includes(q) ||
      loc.district?.toLowerCase().includes(q) ||
      loc.state?.toLowerCase().includes(q)
    );
  });

  const activePlace = locations.find((l) => l.id === selectedPlaceId);
  const availableCount = slots.filter((s) => s.status === "available").length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-primary)]">
          Find Parking
        </h1>
        <p className="text-[var(--color-secondary)] mt-2">
          Browse available parking locations and live slot availability.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-secondary)]" />
        <input
          type="text"
          placeholder="Search by name, code, area..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] py-3 pl-12 pr-4 text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-[var(--color-secondary)]">Loading locations...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-secondary)]">No parking locations found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((loc) => {
            const occupancyRate = loc.totalSlots > 0 ? ((loc.totalSlots - loc.availableSlots) / loc.totalSlots) * 100 : 0;
            const isFull = occupancyRate >= 100;
            const isSelected = selectedPlaceId === loc.id;

            return (
              <Card
                key={loc.id}
                className={cn(
                  "transition-all cursor-pointer hover:border-[var(--color-accent)]/50",
                  isSelected ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]" : ""
                )}
                onClick={() => setSelectedPlaceId(loc.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{loc.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {loc.area}, {loc.district}
                      </CardDescription>
                    </div>
                    <Badge variant={isFull ? "destructive" : "success"}>
                      {isFull ? "Full" : "Available"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-[var(--color-secondary)] mb-2">
                    <span>Occupancy</span>
                    <span>{Math.round(occupancyRate)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", isFull ? "bg-[var(--color-slot-occupied)]" : "bg-[var(--color-slot-available)]")}
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm mt-4">
                    <span className="font-medium text-[var(--color-slot-available)]">{loc.availableSlots} free</span>
                    <span className="text-[var(--color-secondary)]">{loc.totalSlots} total</span>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant={isSelected ? "default" : "secondary"}
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlaceId(loc.id);
                    }}
                  >
                    View Slots
                  </Button>
                  <Button variant="outline" size="icon" onClick={(e) => e.stopPropagation()} title="Navigate">
                    <Navigation className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Live Slot Grid Section */}
      {activePlace && (
        <Card className="mt-4 border-[var(--color-border)] shadow-lg">
          <CardHeader>
            <CardTitle>{activePlace.name} — Live Slots</CardTitle>
            <CardDescription>
              {availableCount} of {slots.length} slots available
              {slotsLoading && " (updating...)"}
            </CardDescription>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-available)]"></div><span className="text-sm text-[var(--color-secondary)]">Available</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-occupied)]"></div><span className="text-sm text-[var(--color-secondary)]">Occupied</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-reserved)]"></div><span className="text-sm text-[var(--color-secondary)]">Reserved</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-maintenance)]"></div><span className="text-sm text-[var(--color-secondary)]">Maintenance</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-ev)]"></div><span className="text-sm text-[var(--color-secondary)]">EV Charging</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-accessible)]"></div><span className="text-sm text-[var(--color-secondary)]">Accessible</span></div>
            </div>
          </CardHeader>
          <CardContent>
            {slots.length === 0 && !slotsLoading ? (
              <div className="text-center py-10 text-[var(--color-secondary)]">No slots configured for this location.</div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 p-4 bg-[#121212] rounded-xl border border-[var(--color-border)]">
                {slots.map((slot) => {
                  let bgColor = "bg-[var(--color-border)]"; // fallback
                  let textColor = "text-white";
                  let border = "border-transparent";

                  // Simplified mapping for the requested colors
                  if (slot.status === "available") { bgColor = "bg-[var(--color-slot-available)]"; }
                  else if (slot.status === "occupied") { bgColor = "bg-[var(--color-slot-occupied)]"; }
                  else if (slot.status === "reserved") { bgColor = "bg-[var(--color-slot-reserved)]"; }
                  else if (slot.status === "maintenance") { bgColor = "bg-[var(--color-slot-maintenance)]"; }
                  
                  // For EV and Accessible, we might need a custom attribute. Since we cannot modify DB, we might not have these statuses natively, 
                  // but we define the classes for future extension if the API ever supports it.

                  return (
                    <div
                      key={slot.slotId}
                      title={slot.status}
                      className={cn(
                        "relative flex items-center justify-center h-16 rounded-md font-bold text-sm transition-all cursor-pointer hover:scale-105 hover:ring-2 hover:ring-white",
                        bgColor,
                        textColor,
                        border
                      )}
                    >
                      {slot.slotId}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

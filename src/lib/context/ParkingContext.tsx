/* eslint-disable */
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type SlotStatus = "available" | "occupied" | "reserved" | "maintenance";
export type SlotType = "regular" | "visitor" | "reserved" | "disabled";

export interface APISlot {
  _id?: string;
  parkingPlaceId: string;
  slotId: string;
  status: SlotStatus;
  slotType?: SlotType;
  vehicleId?: string | null;
  entryTime?: string | Date | null;
}

export interface Slot {
  id: string;
  status: SlotStatus;
  slotType?: SlotType;
  vehicleId?: string | null;
  entryTime?: string | Date | null;
}

export interface SubRow {
  id: string;
  slots: Slot[];
}

export interface Row {
  id: string;
  subRows: SubRow[];
}

export interface ParkingPlace {
  _id?: string;
  id: string;
  name: string;
  code: string;
  country: string;
  state: string;
  district: string;
  area: string;
  institutionName: string;
  rows: number;
  subrows: number;
  slotsPerSubrow: number;
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
}

export interface AssignmentResult {
  vehicleId: string;
  slotId: string;
  placeId: string;
  placeName: string;
  vehicleType: string;
  entryTime: string;
  isVisitor?: boolean;
}

interface ParkingContextType {
  locations: ParkingPlace[];
  loading: boolean;
  slots: APISlot[];
  slotsLoading: boolean;
  lastAssignment: AssignmentResult | null;
  refreshLocations: () => Promise<void>;
  refreshSlots: (placeId: string) => Promise<void>;
  updateSlotStatus: (
    placeId: string,
    slotId: string,
    status: SlotStatus,
    vehicleId?: string,
    vehicleType?: string
  ) => Promise<void>;
}

const ParkingContext = createContext<ParkingContextType | undefined>(undefined);

export function ParkingProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<ParkingPlace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [slots, setSlots] = useState<APISlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [lastAssignment, setLastAssignment] = useState<AssignmentResult | null>(null);

  const refreshLocations = useCallback(async () => {
    try {
      setLoading(true);
      const url = "/api/parking";
      console.log("refreshLocations endpoint:", url);
      const res = await fetch(url);
      console.log(
        "refreshLocations response:",
        res.status,
        res.url
      );
      if (!res.ok) throw new Error(`API Error: ${res.status}`);

      const placesData = await res.json();
      let placesArray: any[] = [];

      if (Array.isArray(placesData)) {
        placesArray = placesData;
      } else if (placesData && Array.isArray(placesData.data)) {
        placesArray = placesData.data;
      }

      const enrichedPlaces = await Promise.all(
        placesArray.map(async (place: any) => {
          const totalSlots =
            (place.rows || 1) * (place.subrows || 1) * (place.slotsPerSubrow || 1);
          let occupiedSlots = 0;
          try {
            const slotUrl = `/api/slots?placeId=${place.id || place._id}`;
            console.log("refreshLocations inner fetch endpoint:", slotUrl);
            const slotsRes = await fetch(slotUrl);
            console.log("refreshLocations inner fetch response:", slotsRes.status, slotsRes.url);
            if (slotsRes.ok) {
              const data = await slotsRes.json();
              const dbSlots = Array.isArray(data) ? data : data.slots || [];
              occupiedSlots = dbSlots.filter((s: any) => s.status === "occupied").length;
            }
          } catch (e) {
            console.error("Error fetching slots for place:", e);
          }
          return {
            ...place,
            id: place.id || place._id,
            totalSlots,
            occupiedSlots,
            availableSlots: totalSlots - occupiedSlots,
          };
        })
      );

      setLocations(enrichedPlaces);
    } catch (error) {
      console.error(error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSlots = useCallback(async (placeId: string) => {
    if (!placeId) return;
    try {
      setSlotsLoading(true);
      const res = await fetch(`/api/slots?placeId=${placeId}`);
      if (!res.ok) throw new Error("Failed to fetch slots");
      const data = await res.json();
      const dbSlots = Array.isArray(data) ? data : data.slots || [];
      setSlots(dbSlots);
    } catch (e) {
      console.error(e);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  const updateSlotStatus = async (
    placeId: string,
    slotId: string,
    status: SlotStatus,
    vehicleId?: string,
    vehicleType?: string
  ) => {
    if (!placeId) {
      throw new Error("placeId is required to update a slot");
    }

    const res = await fetch("/api/slots", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, slotId, status, vehicleId: vehicleId || null, vehicleType: vehicleType || null }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update slot status");
    }

    const data = await res.json();
    if (data.success && data.slot) {
      setSlots((prev) => prev.map((s) => (s.slotId === slotId ? data.slot : s)));
      // eslint-disable-next-line
    refreshLocations();
    }
  };


  useEffect(() => {
    // eslint-disable-next-line
    refreshLocations();
  }, []);

  return (
    <ParkingContext.Provider
      value={{
        locations,
        loading,
        slots,
        slotsLoading,
        lastAssignment,
        refreshLocations,
        refreshSlots,
        updateSlotStatus,
      }}
    >
      {children}
    </ParkingContext.Provider>
  );
}

export function useParking(): ParkingContextType {
  const context = useContext(ParkingContext);
  if (context === undefined) {
    throw new Error("useParking must be used within a ParkingProvider");
  }
  return context;
}
"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export type SlotStatus = "available" | "occupied" | "reserved" | "inactive" | "ai-recommended";

export interface Slot {
  id: string;
  status: SlotStatus;
  vehicleNo?: string;
  entryTime?: string;
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
  id: string;
  name: string;
  code: string;
  country: string;
  state: string;
  district: string;
  area: string;
  institutionName?: string;
  rows: Row[];
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  severity: "low" | "medium" | "high";
}

export interface LastParked {
  vehicleNo: string;
  placeName: string;
  slotId: string;
  entryTime: string;
}

interface ParkingContextType {
  locations: ParkingPlace[];
  addLocation: (location: ParkingPlace) => void;
  updateSlotStatus: (locationId: string, slotId: string, status: SlotStatus, vehicleNo?: string) => void;
  assignAiSlot: (locationId: string, mockVehicleNo?: string) => Slot | null;
  findVehicle: (vehicleNo: string) => { location: ParkingPlace; slot: Slot } | null;
  
  addRow: (locationId: string, rowId: string) => void;
  addSubRow: (locationId: string, rowId: string, subRowId: string) => void;
  addSlots: (locationId: string, rowId: string, subRowId: string, count: number) => void;

  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  securityLogs: SecurityLog[];
  addSecurityLog: (event: string, severity: "low" | "medium" | "high") => void;

  lastParkedVehicle: LastParked | null;
}

const ParkingContext = createContext<ParkingContextType | undefined>(undefined);

export const ParkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  
  const [locations, setLocations] = useState<ParkingPlace[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [lastParkedVehicle, setLastParkedVehicle] = useState<LastParked | null>(null);

  const isAuthenticated = status === "authenticated";

  // Use a ref to prevent sync loops
  const isSyncing = useRef(false);

  // Fetch initial state and poll every 2 seconds
  useEffect(() => {
    const fetchState = async () => {
      if (isSyncing.current) return;
      try {
        const res = await fetch("/api/sync");
        const data = await res.json();
        setLocations(data.locations || []);
        setLastParkedVehicle(data.lastParkedVehicle || null);
        setSecurityLogs(data.securityLogs || []);
      } catch (err) {
        console.error("Failed to sync state from server");
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  // Helper to push state to server
  const pushState = async (newState: any) => {
    isSyncing.current = true;
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newState),
      });
    } catch (err) {
      console.error("Failed to push state");
    } finally {
      isSyncing.current = false;
    }
  };

  const syncAll = (newLocations: ParkingPlace[], newLogs: SecurityLog[], newLastParked: LastParked | null) => {
    setLocations(newLocations);
    setSecurityLogs(newLogs);
    setLastParkedVehicle(newLastParked);
    pushState({ locations: newLocations, securityLogs: newLogs, lastParkedVehicle: newLastParked });
  };

  const addLocation = (location: ParkingPlace) => {
    const newLocs = [...locations, location];
    const newLog = { id: Date.now().toString(), timestamp: new Date().toISOString(), event: `Added new parking location: ${location.name}`, severity: "medium" as const };
    const newLogs = [newLog, ...securityLogs].slice(0, 100);
    syncAll(newLocs, newLogs, lastParkedVehicle);
  };

  const updateSlotStatus = (locationId: string, slotId: string, status: SlotStatus, vehicleNo?: string) => {
    const entryTime = new Date().toISOString();
    let updatedLastParked = lastParkedVehicle;

    const newLocs = locations.map((loc) => {
      if (loc.id !== locationId) return loc;
      return {
        ...loc,
        rows: loc.rows.map((row) => ({
          ...row,
          subRows: row.subRows.map((sub) => ({
            ...sub,
            slots: sub.slots.map((s) => {
              if (s.id === slotId) {
                return { ...s, status, vehicleNo, entryTime };
              }
              return s;
            }),
          })),
        })),
      };
    });

    if (status === "occupied" && vehicleNo) {
      const loc = locations.find(l => l.id === locationId);
      if (loc) {
        updatedLastParked = { vehicleNo, placeName: loc.name, slotId, entryTime };
      }
    }

    syncAll(newLocs, securityLogs, updatedLastParked);
  };

  const assignAiSlot = (locationId: string, mockVehicleNo?: string): Slot | null => {
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return null;

    let bestSlot: Slot | null = null;
    for (const row of loc.rows) {
      for (const subRow of row.subRows) {
        for (const slot of subRow.slots) {
          if (slot.status === "available") {
            bestSlot = slot;
            break;
          }
        }
        if (bestSlot) break;
      }
      if (bestSlot) break;
    }

    if (bestSlot) {
      const vNo = mockVehicleNo || `AI-${Math.floor(Math.random() * 9000) + 1000}`;
      
      const entryTime = new Date().toISOString();
      const updatedLastParked = { vehicleNo: vNo, placeName: loc.name, slotId: bestSlot.id, entryTime };
      
      const newLocs = locations.map((l) => {
        if (l.id !== locationId) return l;
        return {
          ...l,
          rows: l.rows.map((row) => ({
            ...row,
            subRows: row.subRows.map((sub) => ({
              ...sub,
              slots: sub.slots.map((s) => {
                if (s.id === bestSlot!.id) return { ...s, status: "occupied" as SlotStatus, vehicleNo: vNo, entryTime };
                return s;
              }),
            })),
          })),
        };
      });

      const newLog = { id: Date.now().toString(), timestamp: new Date().toISOString(), event: `AI assigned vehicle ${vNo} to slot ${bestSlot.id}`, severity: "low" as const };
      const newLogs = [newLog, ...securityLogs].slice(0, 100);
      
      syncAll(newLocs, newLogs, updatedLastParked);
      
      return { ...bestSlot, status: "occupied", vehicleNo: vNo, entryTime };
    }
    return null;
  };

  const findVehicle = (vehicleNo: string) => {
    for (const loc of locations) {
      for (const row of loc.rows) {
        for (const subRow of row.subRows) {
          for (const slot of subRow.slots) {
            if (slot.vehicleNo?.toUpperCase() === vehicleNo.toUpperCase()) {
              return { location: loc, slot };
            }
          }
        }
      }
    }
    return null;
  };

  const addRow = (locationId: string, rowId: string) => {
    const newLocs = locations.map(loc => {
      if (loc.id !== locationId) return loc;
      if (loc.rows.some(r => r.id === rowId)) return loc;
      return { ...loc, rows: [...loc.rows, { id: rowId, subRows: [] }] };
    });
    
    const newLog = { id: Date.now().toString(), timestamp: new Date().toISOString(), event: `Added Row ${rowId}`, severity: "low" as const };
    syncAll(newLocs, [newLog, ...securityLogs].slice(0, 100), lastParkedVehicle);
  };

  const addSubRow = (locationId: string, rowId: string, subRowId: string) => {
    const newLocs = locations.map(loc => {
      if (loc.id !== locationId) return loc;
      return {
        ...loc,
        rows: loc.rows.map(row => {
          if (row.id !== rowId) return row;
          if (row.subRows.some(s => s.id === subRowId)) return row;
          return { ...row, subRows: [...row.subRows, { id: subRowId, slots: [] }] };
        })
      };
    });
    const newLog = { id: Date.now().toString(), timestamp: new Date().toISOString(), event: `Added SubRow ${subRowId}`, severity: "low" as const };
    syncAll(newLocs, [newLog, ...securityLogs].slice(0, 100), lastParkedVehicle);
  };

  const addSlots = (locationId: string, rowId: string, subRowId: string, count: number) => {
    const newLocs = locations.map(loc => {
      if (loc.id !== locationId) return loc;
      return {
        ...loc,
        rows: loc.rows.map(row => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            subRows: row.subRows.map(sub => {
              if (sub.id !== subRowId) return sub;
              const newSlots = Array.from({ length: count }, (_, i) => ({
                id: `${subRowId}-${sub.slots.length + i + 1}`,
                status: "available" as SlotStatus
              }));
              return { ...sub, slots: [...sub.slots, ...newSlots] };
            })
          };
        })
      };
    });
    const newLog = { id: Date.now().toString(), timestamp: new Date().toISOString(), event: `Added ${count} slots to SubRow ${subRowId}`, severity: "low" as const };
    syncAll(newLocs, [newLog, ...securityLogs].slice(0, 100), lastParkedVehicle);
  };

  const login = () => {
    signIn("google", { callbackUrl: "/admin" });
  };
  
  const logout = () => {
    signOut({ callbackUrl: "/" });
  };

  const addSecurityLog = (event: string, severity: "low" | "medium" | "high") => {
    const newLog = { id: Date.now().toString(), timestamp: new Date().toISOString(), event, severity };
    syncAll(locations, [newLog, ...securityLogs].slice(0, 100), lastParkedVehicle);
  };

  return (
    <ParkingContext.Provider
      value={{
        locations,
        addLocation,
        updateSlotStatus,
        assignAiSlot,
        findVehicle,
        addRow,
        addSubRow,
        addSlots,
        isAuthenticated,
        login,
        logout,
        securityLogs,
        addSecurityLog,
        lastParkedVehicle,
      }}
    >
      {children}
    </ParkingContext.Provider>
  );
};

export const useParking = () => {
  const context = useContext(ParkingContext);
  if (context === undefined) {
    throw new Error("useParking must be used within a ParkingProvider");
  }
  return context;
};

// ─── DEPRECATED ─────────────────────────────────────────────────────────────
// This file is no longer used. All parking data is persisted in MongoDB via
// src/lib/mongo-db.ts and served by the /api/parking and /api/slots routes.
// Do NOT add in-memory or demo data here.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParkingSlot {
  id: string;
  row: string;
  subrow: string;
  number: number;
  status: 'available' | 'occupied' | 'reserved' | 'inactive' | 'ai-recommended';
  vehicleId?: string;
  entryTime?: string;
}

export interface ParkingPlace {
  id: string;
  name: string;
  code: string;
  country: string;
  state: string;
  district: string;
  area: string;
  rows: number;
  subrows: number;
  slotsPerSubrow: number;
  slots: ParkingSlot[];
}

export interface Vehicle {
  vehicleId: string;
  parkingPlaceId: string;
  slotId: string;
  entryTime: string;
}

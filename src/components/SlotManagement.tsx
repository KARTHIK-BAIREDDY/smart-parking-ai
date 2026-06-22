/* eslint-disable */
"use client";

import { useParking, SlotStatus } from "@/lib/context/ParkingContext";
import { useState, useEffect } from "react";
import {
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wrench,
  Edit3,
  Save,
  Search,
} from "lucide-react";

export default function SlotManagement() {
  const {
    locations,
    loading,
    slots,
    slotsLoading,
    refreshSlots,
    updateSlotStatus,
  } = useParking();

  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("");
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editVehicleId, setEditVehicleId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (locations.length > 0 && !selectedPlaceId) {
      setSelectedPlaceId(locations[0].id);
    }
  }, [locations, selectedPlaceId]);

  useEffect(() => {
    if (selectedPlaceId) {
      refreshSlots(selectedPlaceId);
    }
  }, [selectedPlaceId, refreshSlots]);

  if (loading) {
    return <div className="text-cyan-400 py-12">Loading slot data...</div>;
  }

  const filteredLocations = locations.filter((loc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      loc.name?.toLowerCase().includes(q) ||
      loc.code?.toLowerCase().includes(q) ||
      loc.institutionName?.toLowerCase().includes(q) ||
      loc.area?.toLowerCase().includes(q) ||
      loc.district?.toLowerCase().includes(q) ||
      loc.state?.toLowerCase().includes(q) ||
      loc.country?.toLowerCase().includes(q)
    );
  });

  const activePlace = locations.find((l) => l.id === selectedPlaceId);
  const total = slots.length;
  const availableSlots = slots.filter((s) => s.status === "available").length;
  const occupiedSlots = slots.filter((s) => s.status === "occupied").length;
  const reservedSlots = slots.filter((s) => s.status === "reserved").length;
  const maintenanceSlots = slots.filter((s) => s.status === "maintenance").length;

  const handleStatusUpdate = async (
    slotId: string,
    status: SlotStatus,
    vehicleId?: string
  ) => {
    if (!selectedPlaceId) return;
    try {
      await updateSlotStatus(selectedPlaceId, slotId, status, vehicleId);
      setEditingSlot(null);
      setEditVehicleId("");
    } catch {
      alert("Failed to update slot status");
    }
  };

  const getSlotColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500 border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-100";
      case "occupied":
        return "bg-red-500 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-100";
      case "reserved":
        return "bg-yellow-500 border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)] text-yellow-100";
      case "maintenance":
        return "bg-gray-500 border-gray-400 text-gray-200";
      default:
        return "bg-slate-700 border-slate-600";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <MapPin className="w-8 h-8 text-amber-400" /> Slot Management
        </h1>
        <p className="text-gray-400 mt-1">Manage slot inventory across all locations</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 pl-12 pr-4 py-3 rounded-xl text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none transition"
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {filteredLocations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setSelectedPlaceId(loc.id)}
            className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition ${
              activePlace?.id === loc.id
                ? "bg-amber-400 text-black"
                : "bg-slate-900 text-gray-400 hover:bg-slate-800"
            }`}
          >
            {loc.name} ({loc.code})
          </button>
        ))}
      </div>

      {activePlace && (
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
          <h2 className="text-2xl font-bold text-white mb-2">{activePlace.name}</h2>
          <p className="text-gray-400 mb-8">
            {activePlace.institutionName} • {activePlace.area}, {activePlace.district},{" "}
            {activePlace.state}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
              <p className="text-gray-400 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{total}</p>
            </div>
            <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30 text-center">
              <p className="text-green-400 text-sm">Available</p>
              <p className="text-2xl font-bold text-green-400">{availableSlots}</p>
            </div>
            <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30 text-center">
              <p className="text-red-400 text-sm">Occupied</p>
              <p className="text-2xl font-bold text-red-400">{occupiedSlots}</p>
            </div>
            <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/30 text-center">
              <p className="text-yellow-400 text-sm">Reserved</p>
              <p className="text-2xl font-bold text-yellow-400">{reservedSlots}</p>
            </div>
            <div className="bg-gray-500/10 p-4 rounded-xl border border-gray-500/30 text-center">
              <p className="text-gray-400 text-sm">Maintenance</p>
              <p className="text-2xl font-bold text-gray-400">{maintenanceSlots}</p>
            </div>
          </div>

          {slotsLoading ? (
            <div className="text-cyan-400 text-center py-10">Loading slots...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {slots.map((slot) => (
                <div
                  key={slot.slotId}
                  className={`p-4 rounded-2xl border-2 flex flex-col gap-3 ${getSlotColor(slot.status)}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">{slot.slotId}</span>
                    {slot.status === "available" && <CheckCircle className="w-5 h-5 opacity-50" />}
                    {slot.status === "occupied" && <XCircle className="w-5 h-5 opacity-50" />}
                    {slot.status === "reserved" && <AlertTriangle className="w-5 h-5 opacity-50" />}
                    {slot.status === "maintenance" && <Wrench className="w-5 h-5 opacity-50" />}
                  </div>
                  <div className="text-xs uppercase font-bold tracking-wider opacity-80">
                    {slot.status}
                  </div>
                  {slot.vehicleId && (
                    <div className="bg-black/40 px-2 py-1 rounded text-sm text-center font-mono">
                      {slot.vehicleId}
                    </div>
                  )}
                  {editingSlot === slot.slotId ? (
                    <div className="mt-2 bg-slate-900/80 p-2 rounded-xl flex flex-col gap-2 -mx-2 -mb-2 border border-slate-700/50">
                      <select
                        className="bg-slate-800 text-white text-xs p-1 rounded"
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && val !== "occupied") {
                            handleStatusUpdate(slot.slotId, val as SlotStatus);
                          }
                        }}
                      >
                        <option value="">Set Status...</option>
                        <option value="available">Available</option>
                        <option value="reserved">Reserved</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                      <div className="flex gap-1">
                        <input
                          placeholder="Vehicle ID"
                          className="bg-slate-800 text-white text-xs p-1 rounded w-full"
                          value={editVehicleId}
                          onChange={(e) => setEditVehicleId(e.target.value)}
                        />
                        <button
                          className="bg-red-500 text-white rounded px-2"
                          onClick={() =>
                            handleStatusUpdate(slot.slotId, "occupied", editVehicleId)
                          }
                        >
                          <Save className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        className="text-gray-400 text-xs mt-1"
                        onClick={() => setEditingSlot(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingSlot(slot.slotId)}
                      className="mt-auto bg-black/20 hover:bg-black/40 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Actions
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useParking } from "@/lib/context/ParkingContext";
import { useState } from "react";
import { MapPin, Search, PlusCircle } from "lucide-react";
import Link from "next/link";

export default function AdminParkingPage() {
  const { locations, loading } = useParking();
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = locations.filter((loc) => {
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

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <MapPin className="w-8 h-8 text-cyan-400" /> Parking Locations
        </h1>
        <div className="flex gap-3">
          <Link
            href="/admin/parking/add"
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-black font-bold rounded-xl hover:bg-cyan-300 transition"
          >
            <PlusCircle className="w-4 h-4" /> Add Parking
          </Link>
          <Link href="/admin/dashboard" className="text-gray-400 hover:text-white self-center">
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, code, institution, area, district, state or country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 pl-12 pr-4 py-3 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none transition"
        />
      </div>

      {loading ? (
        <p className="text-cyan-400 text-center py-20">Loading parking locations...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-20">No parking locations found.</p>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-gray-400 text-sm">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Code</th>
                <th className="p-4 font-medium">Institution</th>
                <th className="p-4 font-medium">Area</th>
                <th className="p-4 font-medium">District</th>
                <th className="p-4 font-medium">State</th>
                <th className="p-4 font-medium text-center">Total Slots</th>
                <th className="p-4 font-medium text-center">Available</th>
                <th className="p-4 font-medium text-center">Occupied</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((loc) => (
                <tr key={loc.id} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition">
                  <td className="p-4 text-white font-medium">{loc.name}</td>
                  <td className="p-4 font-mono text-cyan-400 text-sm">{loc.code}</td>
                  <td className="p-4 text-gray-300 text-sm">{loc.institutionName}</td>
                  <td className="p-4 text-gray-300 text-sm">{loc.area}</td>
                  <td className="p-4 text-gray-300 text-sm">{loc.district}</td>
                  <td className="p-4 text-gray-300 text-sm">{loc.state}</td>
                  <td className="p-4 text-white text-center font-bold">{loc.totalSlots}</td>
                  <td className="p-4 text-green-400 text-center font-bold">{loc.availableSlots}</td>
                  <td className="p-4 text-red-400 text-center font-bold">{loc.occupiedSlots}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

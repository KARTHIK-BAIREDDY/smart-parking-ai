"use client";

import { useParking, ParkingPlace } from "@/lib/context/ParkingContext";
import { Search, Navigation } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function FindVehiclePage() {
  const { locations } = useParking();
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<{ place: ParkingPlace; slotId: string } | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearched(true);
    setLoading(true);
    setResult(null);

    const query = search.toLowerCase();

    try {
      let foundSlot = null;
      let foundPlace = null;

      for (const place of locations) {
        const res = await fetch(`/api/slots?placeId=${place.id}`);
        if (res.ok) {
          const data = await res.json();
          console.log("Slots API Response:", data);
          const slots = Array.isArray(data) ? data : data.slots || [];
          const found = slots.find((s: any) => s.vehicleId && s.vehicleId.toLowerCase() === query);
          if (found) {
            foundSlot = found.slotId;
            foundPlace = place;
            break;
          }
        }
      }

      if (foundPlace && foundSlot) {
        setResult({ place: foundPlace, slotId: foundSlot });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto flex flex-col items-center justify-center">
      <Link href="/" className="text-gray-400 self-start mb-8 hover:text-white">← Back to Home</Link>
      
      <div className="w-full bg-slate-900 border border-cyan-500/30 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,243,255,0.1)]">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center justify-center gap-3">
          <Search className="text-cyan-400" /> Find Vehicle
        </h1>
        
        <form onSubmit={handleSearch} className="flex gap-4 mb-8">
          <input
            type="text"
            placeholder="Enter Vehicle Plate Number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 p-4 rounded-xl text-white focus:border-cyan-400 outline-none text-lg uppercase"
          />
          <button type="submit" disabled={loading} className="bg-cyan-400 text-black font-bold px-8 rounded-xl hover:bg-cyan-300 transition disabled:opacity-50">
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {searched && !loading && (
          <div className="mt-8">
            {result ? (
              <div className="bg-green-500/10 border border-green-500/30 p-6 rounded-2xl flex flex-col items-center text-center">
                <Navigation className="w-12 h-12 text-green-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Vehicle Found!</h2>
                <p className="text-gray-300 text-lg mb-4">Your vehicle <span className="font-bold text-cyan-400 uppercase">{search}</span> is parked at:</p>
                <div className="bg-slate-950 px-8 py-4 rounded-xl border border-slate-800 inline-block text-left">
                  <p className="text-gray-400"><span className="text-white w-24 inline-block">Location:</span> {result.place.name}</p>
                  <p className="text-gray-400"><span className="text-white w-24 inline-block">Slot:</span> <strong className="text-green-400 text-xl">{result.slotId}</strong></p>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl text-center">
                <p className="text-red-400 text-xl">Vehicle not found in any parking location.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

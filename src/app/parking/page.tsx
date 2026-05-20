"use client";

import { useState, useMemo } from "react";
import { useParking, ParkingPlace, Slot } from "@/lib/context/ParkingContext";
import SlotVisualizer from "@/components/SlotVisualizer";
import { motion } from "framer-motion";
import { Search, MapPin, Zap } from "lucide-react";

export default function ParkingSearchPage() {
  const { locations, assignAiSlot } = useParking();
  
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [placeId, setPlaceId] = useState("");
  
  const [searchCode, setSearchCode] = useState("");
  
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Deriving hierarchy for dropdowns
  const countries = useMemo(() => Array.from(new Set(locations.map(l => l.country))), [locations]);
  const states = useMemo(() => Array.from(new Set(locations.filter(l => l.country === country).map(l => l.state))), [locations, country]);
  const districts = useMemo(() => Array.from(new Set(locations.filter(l => l.state === state).map(l => l.district))), [locations, state]);
  const areas = useMemo(() => Array.from(new Set(locations.filter(l => l.district === district).map(l => l.area))), [locations, district]);
  const places = useMemo(() => locations.filter(l => l.area === area), [locations, area]);

  const activePlace = useMemo(() => {
    if (searchCode) {
      return locations.find(l => l.code.toLowerCase() === searchCode.toLowerCase()) || null;
    }
    return locations.find(l => l.id === placeId) || null;
  }, [locations, searchCode, placeId]);

  const handleAiAssignment = () => {
    if (!activePlace) return;
    const slot = assignAiSlot(activePlace.id);
    if (slot) {
      setSelectedSlot(slot);
    } else {
      alert("No available slots!");
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <h1 className="text-4xl font-bold text-white mb-4">Find <span className="text-[var(--color-neon-cyan)] neon-text">Parking</span></h1>
        <p className="text-gray-400 max-w-2xl mx-auto">Search by location hierarchy or enter a specific parking code to view real-time 3D slot availability.</p>
      </motion.div>

      {/* Search Controls */}
      <div className="glass-panel p-6 rounded-2xl mb-12 shadow-[0_0_20px_rgba(0,243,255,0.1)]">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <select
              className="bg-slate-900/50 border border-[var(--color-glass-border)] p-3 rounded-xl text-white focus:outline-none focus:border-[var(--color-neon-cyan)] transition-colors"
              value={country}
              onChange={(e) => { setCountry(e.target.value); setState(""); setDistrict(""); setArea(""); setPlaceId(""); setSearchCode(""); }}
            >
              <option value="">Country</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              className="bg-slate-900/50 border border-[var(--color-glass-border)] p-3 rounded-xl text-white focus:outline-none focus:border-[var(--color-neon-cyan)] transition-colors"
              value={state}
              onChange={(e) => { setState(e.target.value); setDistrict(""); setArea(""); setPlaceId(""); setSearchCode(""); }}
              disabled={!country}
            >
              <option value="">State</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              className="bg-slate-900/50 border border-[var(--color-glass-border)] p-3 rounded-xl text-white focus:outline-none focus:border-[var(--color-neon-cyan)] transition-colors"
              value={district}
              onChange={(e) => { setDistrict(e.target.value); setArea(""); setPlaceId(""); setSearchCode(""); }}
              disabled={!state}
            >
              <option value="">District</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              className="bg-slate-900/50 border border-[var(--color-glass-border)] p-3 rounded-xl text-white focus:outline-none focus:border-[var(--color-neon-cyan)] transition-colors"
              value={area}
              onChange={(e) => { setArea(e.target.value); setPlaceId(""); setSearchCode(""); }}
              disabled={!district}
            >
              <option value="">Area</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            <select
              className="bg-slate-900/50 border border-[var(--color-glass-border)] p-3 rounded-xl text-white focus:outline-none focus:border-[var(--color-neon-cyan)] transition-colors"
              value={placeId}
              onChange={(e) => { setPlaceId(e.target.value); setSearchCode(""); }}
              disabled={!area}
            >
              <option value="">Parking Place</option>
              {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          
          <div className="flex items-center justify-center font-bold text-gray-500">OR</div>
          
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Enter Code (e.g. CMP-01)" 
              value={searchCode}
              onChange={(e) => {
                setSearchCode(e.target.value);
                setCountry(""); setState(""); setDistrict(""); setArea(""); setPlaceId("");
              }}
              className="w-full bg-slate-900/50 border border-[var(--color-glass-border)] p-3 pl-10 rounded-xl text-white focus:outline-none focus:border-[var(--color-neon-cyan)] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* activePlace Display */}
      {activePlace ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <MapPin className="w-8 h-8 text-green-400" />
                {activePlace.name}
              </h2>
              <p className="text-gray-400 mt-2">Code: <span className="text-[var(--color-neon-cyan)] font-mono">{activePlace.code}</span></p>
            </div>
            
            <button 
              onClick={handleAiAssignment}
              className="px-6 py-3 bg-[var(--color-neon-blue)] text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-600 transition-all shadow-[0_0_15px_rgba(0,81,255,0.4)] hover:shadow-[0_0_25px_rgba(0,81,255,0.6)]"
            >
              <Zap className="w-5 h-5" /> Simulate AI Assignment
            </button>
          </div>

          <div className="flex gap-4 mb-8 flex-wrap">
            <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 bg-green-500/20 border border-green-500 rounded" /> Available</div>
            <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 bg-red-500/20 border border-red-500 rounded" /> Occupied</div>
            <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 bg-yellow-500/20 border border-yellow-500 rounded" /> Reserved</div>
            <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 bg-gray-600/20 border border-gray-600 rounded" /> Inactive</div>
            <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 bg-blue-500/30 border border-blue-400 rounded" /> AI Recommended</div>
          </div>

          {activePlace.rows.map(row => (
            <div key={row.id} className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-[var(--color-neon-cyan)] pl-4">Row {row.id}</h2>
              {row.subRows.map(subRow => (
                <SlotVisualizer key={subRow.id} subRow={subRow} onSlotClick={setSelectedSlot} />
              ))}
            </div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center text-gray-500 py-20">
          <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">Select or search for a parking place to view slots.</p>
        </div>
      )}

      {selectedSlot && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-panel p-6 rounded-2xl shadow-[0_0_30px_rgba(0,243,255,0.2)] border border-[var(--color-neon-cyan)]/50 flex items-center gap-6 z-50"
        >
          <div>
            <p className="text-gray-300 text-sm">Selected Slot</p>
            <p className="text-3xl font-bold text-[var(--color-neon-cyan)]">{selectedSlot.id}</p>
          </div>
          <div className="h-12 w-[1px] bg-gray-600" />
          <div>
            <p className="text-gray-300 text-sm">Status</p>
            <p className="text-lg font-bold capitalize" style={{ color: selectedSlot.status === 'available' ? '#4ade80' : selectedSlot.status === 'occupied' ? '#f87171' : selectedSlot.status === 'ai-recommended' ? '#60a5fa' : '#fbbf24' }}>
              {selectedSlot.status.replace('-', ' ')}
            </p>
          </div>
          <button 
            onClick={() => setSelectedSlot(null)}
            className="ml-4 p-2 rounded-full hover:bg-slate-800 text-gray-400"
          >
            ✕
          </button>
        </motion.div>
      )}
    </main>
  );
}

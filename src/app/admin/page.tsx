"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useParking } from "@/lib/context/ParkingContext";
import { PlusCircle, ShieldAlert, Car, LogOut, Settings2, Activity, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { SlotStatus } from "@/lib/context/ParkingContext";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { locations, updateSlotStatus, addSecurityLog, addRow, addSubRow, addSlots } = useParking();

  const [selectedLoc, setSelectedLoc] = useState(locations[0]?.id || "");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slotStatus, setSlotStatus] = useState<SlotStatus>("occupied");
  const [vehicleNo, setVehicleNo] = useState("");

  // States for Structure Modification
  const [newRowLoc, setNewRowLoc] = useState(locations[0]?.id || "");
  const [newRowId, setNewRowId] = useState("");

  const [newSubRowLoc, setNewSubRowLoc] = useState(locations[0]?.id || "");
  const [newSubRowRowId, setNewSubRowRowId] = useState("");
  const [newSubRowId, setNewSubRowId] = useState("");

  const [newSlotsLoc, setNewSlotsLoc] = useState(locations[0]?.id || "");
  const [newSlotsRowId, setNewSlotsRowId] = useState("");
  const [newSlotsSubRowId, setNewSlotsSubRowId] = useState("");
  const [newSlotsCount, setNewSlotsCount] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-[var(--color-neon-cyan)] animate-pulse text-xl">Verifying session...</div>
    </div>
  );
  if (status === "unauthenticated") return null;

  const handleUpdateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoc || !selectedSlot) return;

    updateSlotStatus(selectedLoc, selectedSlot, slotStatus, slotStatus === "occupied" ? vehicleNo : undefined);
    addSecurityLog(`Admin manually updated slot ${selectedSlot} to ${status}`, "low");
    alert("Slot updated successfully!");
    setVehicleNo("");
    setSelectedSlot("");
  };

  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowLoc || !newRowId) return;
    addRow(newRowLoc, newRowId);
    setNewRowId("");
    alert("Row added successfully!");
  };

  const handleAddSubRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubRowLoc || !newSubRowRowId || !newSubRowId) return;
    addSubRow(newSubRowLoc, newSubRowRowId, newSubRowId);
    setNewSubRowId("");
    setNewSubRowRowId("");
    alert("Subrow added successfully!");
  };

  const handleAddSlots = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotsLoc || !newSlotsRowId || !newSlotsSubRowId || !newSlotsCount) return;
    addSlots(newSlotsLoc, newSlotsRowId, newSlotsSubRowId, parseInt(newSlotsCount));
    setNewSlotsCount("");
    setNewSlotsSubRowId("");
    setNewSlotsRowId("");
    alert("Slots added successfully!");
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <Settings2 className="w-10 h-10 text-[var(--color-neon-blue)]" />
            Admin <span className="text-[var(--color-neon-blue)] neon-text">Dashboard</span>
          </h1>
          <p className="text-gray-400 mt-2">Manage parking locations, monitor security, and control slots.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg flex items-center gap-2 hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Link href="/add-parking" className="glass-panel p-6 rounded-2xl border border-[var(--color-neon-cyan)]/30 hover:border-[var(--color-neon-cyan)] transition-colors group">
          <div className="w-12 h-12 rounded-full bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Add Location</h3>
          <p className="text-gray-400 text-sm">Create a new smart parking facility in the network.</p>
        </Link>
        
        <Link href="/security" className="glass-panel p-6 rounded-2xl border border-[var(--color-neon-blue)]/30 hover:border-[var(--color-neon-blue)] transition-colors group">
          <div className="w-12 h-12 rounded-full bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Cybersecurity</h3>
          <p className="text-gray-400 text-sm">Monitor session logs, alerts, and system health.</p>
        </Link>
        
        <div className="glass-panel p-6 rounded-2xl border border-green-500/30">
          <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Active Locations</h3>
          <p className="text-4xl font-extrabold text-green-400 mt-2">{locations.length}</p>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-[var(--color-glass-border)]">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Car className="w-6 h-6 text-gray-400" /> Manual Slot Management
        </h2>
        
        <form onSubmit={handleUpdateSlot} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
          <div className="lg:col-span-1">
            <label className="block text-sm text-gray-400 mb-2">Location</label>
            <select 
              className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 rounded-xl text-white focus:outline-none focus:border-[var(--color-neon-blue)]"
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value)}
              required
            >
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
          </div>

          <div className="lg:col-span-1">
            <label className="block text-sm text-gray-400 mb-2">Slot ID</label>
            <input 
              type="text"
              placeholder="e.g. A1-12"
              className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 rounded-xl text-white focus:outline-none focus:border-[var(--color-neon-blue)]"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              required
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-sm text-gray-400 mb-2">Status</label>
            <select 
              className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 rounded-xl text-white focus:outline-none focus:border-[var(--color-neon-blue)]"
              value={slotStatus}
              onChange={(e) => setSlotStatus(e.target.value as SlotStatus)}
            >
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="lg:col-span-1">
            <label className="block text-sm text-gray-400 mb-2">Vehicle No (optional)</label>
            <input 
              type="text"
              placeholder="If occupied"
              className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 rounded-xl text-white focus:outline-none focus:border-[var(--color-neon-blue)] disabled:opacity-50"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              disabled={slotStatus !== "occupied"}
            />
          </div>

          <div className="lg:col-span-1">
            <button 
              type="submit"
              className="w-full py-3 bg-[var(--color-neon-blue)] text-white font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-[0_0_15px_rgba(0,81,255,0.4)]"
            >
              Update Slot
            </button>
          </div>
        </form>
      </div>
      <div className="glass-panel p-8 rounded-3xl border border-[var(--color-glass-border)] mt-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-gray-400" /> Structure Modifications
        </h2>
        
        <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-8">
          {/* Add Row */}
          <details className="bg-slate-900/50 rounded-2xl border border-gray-800 group md:open">
            <summary className="p-6 text-lg font-bold text-white cursor-pointer list-none flex justify-between items-center outline-none">
              Add Row
              <span className="text-[var(--color-neon-cyan)] group-open:rotate-180 transition-transform md:hidden">▼</span>
            </summary>
            <form onSubmit={handleAddRow} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location</label>
                <select className="w-full bg-slate-900 border border-[var(--color-glass-border)] p-3 rounded-lg text-white touch-manipulation" value={newRowLoc} onChange={e => setNewRowLoc(e.target.value)} required>
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Row ID (e.g. D)</label>
                <input type="text" className="w-full bg-slate-900 border border-[var(--color-glass-border)] p-3 rounded-lg text-white touch-manipulation" value={newRowId} onChange={e => setNewRowId(e.target.value)} required />
              </div>
              <button type="submit" className="w-full py-4 mt-2 bg-[var(--color-neon-cyan)] text-black font-bold rounded-lg hover:scale-105 transition-transform touch-manipulation">Add Row</button>
            </form>
          </details>

          {/* Add SubRow */}
          <details className="bg-slate-900/50 rounded-2xl border border-gray-800 group md:open">
            <summary className="p-6 text-lg font-bold text-white cursor-pointer list-none flex justify-between items-center outline-none">
              Add Subrow
              <span className="text-[var(--color-neon-cyan)] group-open:rotate-180 transition-transform md:hidden">▼</span>
            </summary>
            <form onSubmit={handleAddSubRow} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location</label>
                <select className="w-full bg-slate-900 border border-[var(--color-glass-border)] p-3 rounded-lg text-white touch-manipulation" value={newSubRowLoc} onChange={e => setNewSubRowLoc(e.target.value)} required>
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target Row ID</label>
                <input type="text" className="w-full bg-slate-900 border border-[var(--color-glass-border)] p-3 rounded-lg text-white touch-manipulation" value={newSubRowRowId} onChange={e => setNewSubRowRowId(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">New SubRow ID (e.g. D1)</label>
                <input type="text" className="w-full bg-slate-900 border border-[var(--color-glass-border)] p-3 rounded-lg text-white touch-manipulation" value={newSubRowId} onChange={e => setNewSubRowId(e.target.value)} required />
              </div>
              <button type="submit" className="w-full py-4 mt-2 bg-[var(--color-neon-cyan)] text-black font-bold rounded-lg hover:scale-105 transition-transform touch-manipulation">Add Subrow</button>
            </form>
          </details>

          {/* Add Slots */}
          <details className="bg-slate-900/50 rounded-2xl border border-gray-800 group md:open">
            <summary className="p-6 text-lg font-bold text-white cursor-pointer list-none flex justify-between items-center outline-none">
              Add Slots
              <span className="text-[var(--color-neon-cyan)] group-open:rotate-180 transition-transform md:hidden">▼</span>
            </summary>
            <form onSubmit={handleAddSlots} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location</label>
                <select className="w-full bg-slate-900 border border-[var(--color-glass-border)] p-3 rounded-lg text-white touch-manipulation" value={newSlotsLoc} onChange={e => setNewSlotsLoc(e.target.value)} required>
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Row ID</label>
                  <input type="text" className="w-full bg-slate-900 border border-[var(--color-glass-border)] p-3 rounded-lg text-white touch-manipulation" value={newSlotsRowId} onChange={e => setNewSlotsRowId(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">SubRow ID</label>
                  <input type="text" className="w-full bg-slate-900 border border-[var(--color-glass-border)] p-3 rounded-lg text-white touch-manipulation" value={newSlotsSubRowId} onChange={e => setNewSlotsSubRowId(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Number of Slots</label>
                <input type="number" min="1" className="w-full bg-slate-900 border border-[var(--color-glass-border)] p-3 rounded-lg text-white touch-manipulation" value={newSlotsCount} onChange={e => setNewSlotsCount(e.target.value)} required />
              </div>
              <button type="submit" className="w-full py-4 mt-2 bg-[var(--color-neon-cyan)] text-black font-bold rounded-lg hover:scale-105 transition-transform touch-manipulation">Add Slots</button>
            </form>
          </details>
        </div>
      </div>
    </main>
  );
}

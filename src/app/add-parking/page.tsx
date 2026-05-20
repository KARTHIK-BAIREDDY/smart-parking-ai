"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useParking, ParkingPlace, Row, SubRow, SlotStatus } from "@/lib/context/ParkingContext";
import { Plus, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

export default function AddParkingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { addLocation } = useParking();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    country: "",
    state: "",
    district: "",
    area: "",
    institutionName: "",
    rows: "3",
    subRows: "2",
    slotsPerSubRow: "40"
  });

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-[var(--color-neon-cyan)] animate-pulse text-xl">Verifying session...</div>
    </div>
  );
  if (status === "unauthenticated") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const rowCount = parseInt(formData.rows);
    const subRowCount = parseInt(formData.subRows);
    const slotsCount = parseInt(formData.slotsPerSubRow);

    const generatedRows: Row[] = [];
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let i = 0; i < rowCount; i++) {
      const rowId = alphabet[i] || `R${i}`;
      const subRows: SubRow[] = [];
      
      for (let j = 0; j < subRowCount; j++) {
        const subId = `${rowId}${j + 1}`;
        const slots = Array.from({ length: slotsCount }, (_, k) => ({
          id: `${subId}-${k + 1}`,
          status: "available" as SlotStatus
        }));
        subRows.push({ id: subId, slots });
      }
      
      generatedRows.push({ id: rowId, subRows });
    }

    const newPlace: ParkingPlace = {
      id: `loc-${Date.now()}`,
      name: formData.name,
      code: formData.code.toUpperCase(),
      country: formData.country,
      state: formData.state,
      district: formData.district,
      area: formData.area,
      institutionName: formData.institutionName,
      rows: generatedRows
    };

    addLocation(newPlace);
    alert(`Successfully added ${newPlace.name} with ${rowCount * subRowCount * slotsCount} slots!`);
    router.push("/admin");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <Link href="/admin" className="text-[var(--color-neon-cyan)] flex items-center gap-2 mb-8 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="glass-panel p-8 rounded-3xl border border-[var(--color-neon-cyan)]/30">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-[var(--color-neon-cyan)]" /> Add New Parking
        </h1>
        <p className="text-gray-400 mb-8">Dynamically generate a new parking structure.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Parking Place Name</label>
              <input name="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 md:p-4 rounded-xl text-white focus:border-[var(--color-neon-cyan)] outline-none touch-manipulation" placeholder="e.g. Nexus Mall" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Parking Code</label>
              <input name="code" value={formData.code} onChange={handleChange} required className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 md:p-4 rounded-xl text-white focus:border-[var(--color-neon-cyan)] outline-none touch-manipulation" placeholder="e.g. NEX-01" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Country</label>
              <input name="country" value={formData.country} onChange={handleChange} required className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 md:p-4 rounded-xl text-white focus:border-[var(--color-neon-cyan)] outline-none touch-manipulation" placeholder="e.g. India" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">State</label>
              <input name="state" value={formData.state} onChange={handleChange} required className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 md:p-4 rounded-xl text-white focus:border-[var(--color-neon-cyan)] outline-none touch-manipulation" placeholder="e.g. Karnataka" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">District</label>
              <input name="district" value={formData.district} onChange={handleChange} required className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 md:p-4 rounded-xl text-white focus:border-[var(--color-neon-cyan)] outline-none touch-manipulation" placeholder="e.g. Bengaluru" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Area</label>
              <input name="area" value={formData.area} onChange={handleChange} required className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 md:p-4 rounded-xl text-white focus:border-[var(--color-neon-cyan)] outline-none touch-manipulation" placeholder="e.g. Indiranagar" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Institution Name</label>
              <input name="institutionName" value={formData.institutionName} onChange={handleChange} required className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 md:p-4 rounded-xl text-white focus:border-[var(--color-neon-cyan)] outline-none touch-manipulation" placeholder="e.g. City Mall Enterprises" />
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-6">Grid Configuration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Number of Rows</label>
                <select name="rows" value={formData.rows} onChange={handleChange} className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 md:p-4 rounded-xl text-white outline-none touch-manipulation">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Rows</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Subrows per Row</label>
                <select name="subRows" value={formData.subRows} onChange={handleChange} className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 md:p-4 rounded-xl text-white outline-none touch-manipulation">
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Subrows</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Slots per Subrow</label>
                <select name="slotsPerSubRow" value={formData.slotsPerSubRow} onChange={handleChange} className="w-full bg-slate-900/80 border border-[var(--color-glass-border)] p-3 md:p-4 rounded-xl text-white outline-none touch-manipulation">
                  {[10, 20, 30, 40, 50].map(n => <option key={n} value={n}>{n} Slots</option>)}
                </select>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-cyan)] text-black font-bold rounded-xl text-lg hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(0,243,255,0.3)] mt-8 touch-manipulation">
            Generate & Add Parking
          </button>
        </form>
      </div>
    </main>
  );
}

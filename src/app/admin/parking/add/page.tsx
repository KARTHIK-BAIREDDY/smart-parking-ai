"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { useParking } from "@/lib/context/ParkingContext";

export default function AdminAddParkingPage() {
  const router = useRouter();
  const { refreshLocations } = useParking();
  const [loading, setLoading] = useState(false);

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
    slotsPerSubRow: "10",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("/api/parking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          country: formData.country,
          state: formData.state,
          district: formData.district,
          area: formData.area,
          institutionName: formData.institutionName,
          rows: Number(formData.rows),
          subrows: Number(formData.subRows),
          slotsPerSubrow: Number(formData.slotsPerSubRow),
        }),
      });

      if (!res.ok) throw new Error("Failed to create parking");

      await refreshLocations();
      alert("Parking Created Successfully!");
      router.push("/admin/parking");
    } catch (error) {
      console.error(error);
      alert("Failed to create parking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <Link href="/admin/parking" className="text-cyan-400 flex items-center gap-2 mb-8 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Parking Locations
      </Link>

      <div className="bg-slate-900 border border-cyan-500/20 rounded-3xl p-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-cyan-400" /> Add New Parking
        </h1>
        <p className="text-gray-400 mb-8">Create a parking location and generate slot structure.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input name="name" placeholder="Parking Name" value={formData.name} onChange={handleChange} required className="p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none" />
            <input name="code" placeholder="Parking Code (e.g. 027)" value={formData.code} onChange={handleChange} required className="p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none" />
            <input name="country" placeholder="Country" value={formData.country} onChange={handleChange} required className="p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none" />
            <input name="state" placeholder="State" value={formData.state} onChange={handleChange} required className="p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none" />
            <input name="district" placeholder="District" value={formData.district} onChange={handleChange} required className="p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none" />
            <input name="area" placeholder="Area" value={formData.area} onChange={handleChange} required className="p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none" />
            <input name="institutionName" placeholder="Institution Name" value={formData.institutionName} onChange={handleChange} required className="p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none md:col-span-2" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <select name="rows" value={formData.rows} onChange={handleChange} className="p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n} Rows</option>)}
            </select>
            <select name="subRows" value={formData.subRows} onChange={handleChange} className="p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none">
              {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} SubRows</option>)}
            </select>
            <select name="slotsPerSubRow" value={formData.slotsPerSubRow} onChange={handleChange} className="p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-cyan-400 outline-none">
              {[5,10,15,20,30,40,50].map((n) => <option key={n} value={n}>{n} Slots/SubRow</option>)}
            </select>
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-cyan-400 text-black font-bold disabled:opacity-50 hover:bg-cyan-300 transition">
            {loading ? "Creating..." : "Generate & Add Parking"}
          </button>
        </form>
      </div>
    </main>
  );
}

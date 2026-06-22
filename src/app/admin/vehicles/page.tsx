"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Loader2, Search, Check, X, ShieldAlert, Car, User } from "lucide-react";

interface VehicleAdmin {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  ownerName: string;
  ownerMobile: string;
}

export default function AdminVehiclesPage() {
  const { data: session } = useSession();
  const [vehicles, setVehicles] = useState<VehicleAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vehicles");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error("Failed to load vehicles", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleUpdateStatus = async (vehicleId: string, status: "Approved" | "Rejected") => {
    try {
      setUpdatingId(vehicleId);
      const res = await fetch("/api/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, status }),
      });

      if (res.ok) {
        setVehicles(prev =>
          prev.map(v => (v.id === vehicleId ? { ...v, status } : v))
        );
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerMobile.includes(searchTerm)
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Vehicle Approvals</h1>
          <p className="text-gray-400">Manage and verify registered vehicles across the system.</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 bg-slate-900/50 border border-slate-800">
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Plate, Name, or Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-20 bg-slate-950/30 rounded-2xl border border-slate-800 border-dashed">
            <ShieldAlert className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300">No vehicles found</h3>
            <p className="text-gray-500 mt-1">There are no vehicles matching your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-sm font-medium text-gray-400">
                  <th className="p-4 whitespace-nowrap">Vehicle Plate</th>
                  <th className="p-4 whitespace-nowrap">Owner Details</th>
                  <th className="p-4 whitespace-nowrap">Type</th>
                  <th className="p-4 whitespace-nowrap">Registration Date</th>
                  <th className="p-4 whitespace-nowrap">Status</th>
                  <th className="p-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                          <Car className="w-5 h-5" />
                        </div>
                        <span className="font-mono font-bold text-white tracking-wider">
                          {v.vehicleNumber}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-white flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-400" /> {v.ownerName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{v.ownerMobile}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300 capitalize">{v.vehicleType}</td>
                    <td className="p-4 text-gray-400 text-sm">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          v.status === "Approved"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : v.status === "Rejected"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {v.status !== "Approved" && (
                          <button
                            onClick={() => handleUpdateStatus(v.id, "Approved")}
                            disabled={updatingId === v.id}
                            className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition disabled:opacity-50"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {v.status !== "Rejected" && (
                          <button
                            onClick={() => handleUpdateStatus(v.id, "Rejected")}
                            disabled={updatingId === v.id}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition disabled:opacity-50"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

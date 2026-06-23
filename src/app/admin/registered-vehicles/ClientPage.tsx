"use client";

import { useState } from "react";
import { Car, Search, Filter, MapPin, Calendar, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

export function RegisteredVehiclesClient({ initialVehicles }: { initialVehicles: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");

  const filterOptions = ["All", "Parked", "Not Parked", "Cars", "Motorcycles", "Trucks"];

  const filteredVehicles = initialVehicles.filter(v => {
    // Search match
    const searchMatch = 
      (v.number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.ownerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.ownerPhone || "").includes(searchTerm);
    
    if (!searchMatch) return false;

    // Filter match
    switch (filterType) {
      case "Parked": return v.status === "Parked";
      case "Not Parked": return v.status === "Not Parked";
      case "Cars": return v.type === "CAR";
      case "Motorcycles": return v.type === "MOTORCYCLE";
      case "Trucks": return v.type === "TRUCK";
      default: return true;
    }
  });

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Car className="w-8 h-8 text-cyan-400" /> Registered Vehicles
          </h1>
          <p className="text-gray-400 mt-2">View all registered vehicles and their current parking status.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Plate, Owner Name, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            {filterOptions.map(option => (
              <button
                key={option}
                onClick={() => setFilterType(option)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === option 
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                    : "bg-slate-800 text-gray-400 hover:bg-slate-700 border border-transparent"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-gray-400 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-medium px-4">Vehicle Number</th>
                <th className="pb-3 font-medium px-4">Vehicle Type</th>
                <th className="pb-3 font-medium px-4">Owner Name</th>
                <th className="pb-3 font-medium px-4">Owner Phone Number</th>
                <th className="pb-3 font-medium px-4">Parking Status</th>
                <th className="pb-3 font-medium px-4">Assigned Slot</th>
                <th className="pb-3 font-medium px-4">Registration Date</th>
                <th className="pb-3 font-medium px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    No vehicles found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map(v => (
                  <tr key={v.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="font-mono font-bold text-white tracking-wider">{v.number}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-300 capitalize">{v.type.toLowerCase()}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-white flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                        {v.ownerName}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-300">{v.ownerPhone}</div>
                    </td>
                    <td className="py-4 px-4">
                      {v.status === "Parked" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Parked
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                          Not Parked
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {v.assignedSlot ? (
                        <div>
                          <div className="font-bold text-cyan-400">{v.assignedSlot}</div>
                          {v.location && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {v.location}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        {v.registrationDate ? format(new Date(v.registrationDate), "MMM d, yyyy") : "-"}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
                          View Owner
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

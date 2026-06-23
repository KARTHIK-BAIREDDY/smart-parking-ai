"use client";

import { useState, useRef, useEffect } from "react";
import { Users, Search, Car, AlertCircle, CheckCircle2, MoreVertical, Eye, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function RegisteredUsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserVehicles, setSelectedUserVehicles] = useState<any | null>(null);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const filteredUsers = initialUsers.filter(u => 
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.phone || "").includes(searchTerm)
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-cyan-400" /> Registered Users
          </h1>
          <p className="text-gray-400 mt-2">Manage customer accounts and view parking activity.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Name or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-visible min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-gray-400 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-medium px-4">User Name</th>
                <th className="pb-3 font-medium px-4">Phone Number</th>
                <th className="pb-3 font-medium px-4">Role</th>
                <th className="pb-3 font-medium px-4 text-center">Registered Vehicles Count</th>
                <th className="pb-3 font-medium px-4 text-center">Active Sessions Count</th>
                <th className="pb-3 font-medium px-4">Status</th>
                <th className="pb-3 font-medium px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">
                    No registered users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white">{user.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-300">{user.phone}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-300 capitalize">{user.role}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-cyan-400 font-bold">
                        {user.registeredVehicles}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {user.activeSessions > 0 ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-400 font-bold border border-green-500/30">
                          {user.activeSessions}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {user.status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : user.status === "Pending" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5" /> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <AlertCircle className="w-3.5 h-3.5" /> Suspended
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="relative inline-block text-left">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            setDropdownOpen(dropdownOpen === user.id ? null : user.id);
                          }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 pointer-events-none" />
                        </button>

                        <AnimatePresence>
                          {dropdownOpen === user.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 mt-2 w-48 origin-top-right bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-[100] overflow-hidden"
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setSelectedUserVehicles(user);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-colors"
                                >
                                  <Car className="w-4 h-4" /> View Vehicles
                                </button>
                                <button
                                  onClick={() => setDropdownOpen(null)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-colors"
                                >
                                  <Eye className="w-4 h-4" /> View Details
                                </button>
                                <div className="h-px bg-slate-700 my-1"></div>
                                <button
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete User
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Vehicles Modal */}
      <AnimatePresence>
        {selectedUserVehicles && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Car className="w-5 h-5 text-cyan-400" />
                    Vehicles for {selectedUserVehicles.name}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Found {selectedUserVehicles.vehicles?.length || 0} registered vehicles.</p>
                </div>
                <button
                  onClick={() => setSelectedUserVehicles(null)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {(!selectedUserVehicles.vehicles || selectedUserVehicles.vehicles.length === 0) ? (
                  <div className="text-center py-12 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                    <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">This user does not have any registered vehicles.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedUserVehicles.vehicles.map((v: any) => (
                      <div key={v.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-white tracking-wider">{v.vehicleNumber}</h3>
                            {v.status === "approved" ? (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Approved</span>
                            ) : v.status === "rejected" ? (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">Rejected</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">Type: <span className="text-gray-300">{v.vehicleType}</span></p>
                          {v.registrationDate && (
                            <p className="text-xs text-gray-500 mt-1">Registered: {new Date(v.registrationDate).toLocaleDateString()}</p>
                          )}
                        </div>
                        
                        <div className="text-right w-full sm:w-auto">
                          {v.assignedSlot ? (
                            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-4 py-2">
                              <p className="text-xs text-cyan-400 font-medium mb-0.5">Currently Parked</p>
                              <p className="text-lg font-bold text-white">Slot {v.assignedSlot}</p>
                            </div>
                          ) : (
                            <div className="bg-slate-800/50 rounded-lg px-4 py-2 text-gray-400 text-sm">
                              Not parked
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <div className="p-3 bg-rose-500/10 rounded-full">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Delete User</h2>
              </div>
              
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete <span className="font-semibold text-white">{userToDelete.name}</span>? 
                This action cannot be undone.
              </p>

              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-6">
                <p className="text-sm text-gray-400 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Delete API not configured
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-rose-500/50 cursor-not-allowed transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

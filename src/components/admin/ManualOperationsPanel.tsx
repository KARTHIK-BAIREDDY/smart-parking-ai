"use client";

import { useState, useEffect } from "react";
import { AlertOctagon, Car, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ManualOperationsPanel() {
  const [parkingPlaces, setParkingPlaces] = useState<any[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);

  useEffect(() => {
    fetch("/api/parking")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setParkingPlaces(data);
          if (data.length > 0) {
            setAssignPlaceId(data[0].id);
          }
        }
        setLoadingPlaces(false);
      })
      .catch(err => {
        console.error("Failed to load parking places", err);
        setLoadingPlaces(false);
      });
  }, []);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [resultAssign, setResultAssign] = useState<{success: boolean, msg: string} | null>(null);

  const [loadingRemove, setLoadingRemove] = useState(false);
  const [resultRemove, setResultRemove] = useState<{success: boolean, msg: string} | null>(null);

  // Assignment fields
  const [assignVehicleNo, setAssignVehicleNo] = useState("");
  const [assignType, setAssignType] = useState("CAR");
  const [assignReason, setAssignReason] = useState("");
  const [assignPlaceId, setAssignPlaceId] = useState("");

  // Removal fields
  const [removeVehicleNo, setRemoveVehicleNo] = useState("");
  const [removeSlotId, setRemoveSlotId] = useState("");
  const [removeReason, setRemoveReason] = useState("");

  const handleAssignment = async () => {
    setLoadingAssign(true);
    setResultAssign(null);
    try {
      const res = await fetch("/api/slots/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: assignVehicleNo,
          vehicleType: assignType,
          placeId: assignPlaceId || "P-1", // Use selected or default
          confidence: 100,
          cameraId: "manual_assignment"
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to assign slot");
      
      setResultAssign({ success: true, msg: `Assigned Slot: ${data.slotId} for ${data.vehicleNumber}` });
      setAssignVehicleNo("");
      setAssignReason("");
    } catch (e: any) {
      setResultAssign({ success: false, msg: e.message });
    } finally {
      setLoadingAssign(false);
    }
  };

  const handleRemoval = async () => {
    setLoadingRemove(true);
    setResultRemove(null);
    try {
      const sessionsRes = await fetch("/api/admin/sessions");
      const sessionsData = await sessionsRes.json();
      
      if (!sessionsData.success) {
        throw new Error(sessionsData.error || "Failed to fetch sessions");
      }

      const sessions = sessionsData.sessions || [];
      const session = sessions.find((s: any) => {
        const matchVehicle = removeVehicleNo && s.vehicleNumber?.toUpperCase() === removeVehicleNo.toUpperCase();
        const matchSlot = removeSlotId && s.slotId === removeSlotId;
        if (removeVehicleNo && removeSlotId) {
          return matchVehicle && matchSlot;
        }
        return matchVehicle || matchSlot;
      });

      if (!session) {
        throw new Error("No active session found matching the provided details");
      }

      const res = await fetch(`/api/admin/sessions/${session.id}/force-close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: removeReason || "Manual removal by Admin" })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.message || data.error || "Failed to close session");

      setResultRemove({ success: true, msg: "Session closed and slot released." });
      setRemoveVehicleNo("");
      setRemoveSlotId("");
      setRemoveReason("");
    } catch (e: any) {
      setResultRemove({ success: false, msg: e.message });
    } finally {
      setLoadingRemove(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <AlertOctagon className="w-5 h-5 text-red-500" />
        Manual Operations
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Manual Vehicle Assignment */}
        <div className="border border-slate-800 bg-slate-950/50 rounded-2xl p-5 flex flex-col h-full">
          <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
            <Car className="w-4 h-4 text-cyan-400"/> Manual Vehicle Assignment
          </h4>
          
          {resultAssign && (
            <div className={`p-3 mb-4 rounded ${resultAssign.success ? 'bg-green-900/30 border border-green-800 text-green-400' : 'bg-red-900/30 border border-red-800 text-red-400'} text-sm`}>
              {resultAssign.msg}
            </div>
          )}
          
          <div className="flex-1 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vehicle Number</label>
              <input 
                type="text" placeholder="e.g. MH12TR6518" 
                value={assignVehicleNo} onChange={e => setAssignVehicleNo(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white w-full focus:border-cyan-500 outline-none"
              />
            </div>
            
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vehicle Type</label>
              <select 
                value={assignType} onChange={e => setAssignType(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white w-full focus:border-cyan-500 outline-none"
              >
                <option value="CAR">CAR</option>
                <option value="MOTORCYCLE">MOTORCYCLE</option>
                <option value="TRUCK">TRUCK</option>
              </select>
            </div>
            
            {parkingPlaces.length > 1 && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Parking Place</label>
                <select 
                  value={assignPlaceId} onChange={e => setAssignPlaceId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white w-full focus:border-cyan-500 outline-none"
                >
                  {parkingPlaces.map(place => (
                    <option key={place.id} value={place.id}>{place.name || place.id}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Reason (Audit)</label>
              <input 
                type="text" placeholder="e.g. OCR Failed" 
                value={assignReason} onChange={e => setAssignReason(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white w-full focus:border-cyan-500 outline-none"
              />
            </div>
          </div>
          
          <div className="mt-5 pt-4 border-t border-slate-800/50">
            <Button 
              size="sm" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white" 
              disabled={loadingAssign || !assignVehicleNo}
              onClick={handleAssignment}
            >
              {loadingAssign ? "Processing..." : "Assign Vehicle"}
            </Button>
          </div>
        </div>

        {/* Manual Vehicle Removal */}
        <div className="border border-slate-800 bg-slate-950/50 rounded-2xl p-5 flex flex-col h-full">
          <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
            <LogOut className="w-4 h-4 text-red-400"/> Manual Vehicle Removal
          </h4>
          
          {resultRemove && (
            <div className={`p-3 mb-4 rounded ${resultRemove.success ? 'bg-green-900/30 border border-green-800 text-green-400' : 'bg-red-900/30 border border-red-800 text-red-400'} text-sm`}>
              {resultRemove.msg}
            </div>
          )}

          <div className="flex-1 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vehicle Number</label>
              <input 
                type="text" placeholder="e.g. MH12TR6518" 
                value={removeVehicleNo} onChange={e => setRemoveVehicleNo(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white w-full focus:border-red-500 outline-none"
              />
            </div>
            
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Slot ID</label>
              <input 
                type="text" placeholder="e.g. A1-5" 
                value={removeSlotId} onChange={e => setRemoveSlotId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white w-full focus:border-red-500 outline-none"
              />
            </div>
            
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Reason (Audit)</label>
              <input 
                type="text" placeholder="e.g. Vehicle left without checkout" 
                value={removeReason} onChange={e => setRemoveReason(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white w-full focus:border-red-500 outline-none"
              />
            </div>
            
          </div>
          
          <div className="mt-5 pt-4 border-t border-slate-800/50">
            <Button 
              size="sm" variant="destructive" className="w-full bg-red-600 hover:bg-red-500" 
              disabled={loadingRemove || (!removeVehicleNo && !removeSlotId) || !removeReason}
              onClick={handleRemoval}
            >
              {loadingRemove ? "Processing..." : "Remove Vehicle"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

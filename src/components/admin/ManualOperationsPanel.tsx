/* eslint-disable */
"use client";

import { useState } from "react";
import { AlertOctagon, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ManualOperationsPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success: boolean, msg: string} | null>(null);

  const [closeSessionId, setCloseSessionId] = useState("");
  const [closeReason, setCloseReason] = useState("");

  const [releaseSlotId, setReleaseSlotId] = useState("");
  const [releaseReason, setReleaseReason] = useState("");

  const [reassignSession, setReassignSession] = useState("");
  const [reassignOldSlot, setReassignOldSlot] = useState("");
  const [reassignNewSlot, setReassignNewSlot] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  const handleOp = async (path: string, body: any) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setResult({ success: data.success, msg: data.message || data.error });
      if (data.success) {
        setCloseSessionId(""); setCloseReason("");
        setReleaseSlotId(""); setReleaseReason("");
        setReassignSession(""); setReassignOldSlot(""); setReassignNewSlot(""); setReassignReason("");
      }
    } catch (e: any) {
      setResult({ success: false, msg: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <AlertOctagon className="w-5 h-5 text-red-500" />
        Manual Operations
      </h3>

      {result && (
        <div className={`p-3 mb-4 rounded ${result.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {result.msg}
        </div>
      )}

      <div className="space-y-6">
        {/* Force Close */}
        <div className="border border-slate-800 rounded-xl p-4">
          <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-400"/> Force Close Session
          </h4>
          <div className="flex gap-2 mb-2">
            <input 
              type="text" placeholder="Session ID" 
              value={closeSessionId} onChange={e => setCloseSessionId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-white flex-1 focus:border-cyan-500 outline-none"
            />
            <input 
              type="text" placeholder="Reason (Required)" 
              value={closeReason} onChange={e => setCloseReason(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-white flex-2 focus:border-cyan-500 outline-none"
            />
          </div>
          <Button 
            size="sm" variant="destructive" className="w-full" disabled={loading || !closeSessionId || !closeReason}
            onClick={() => handleOp(`/api/admin/sessions/${closeSessionId}/force-close`, { reason: closeReason })}
          >
            Force Close Session
          </Button>
        </div>

        {/* Release Slot */}
        <div className="border border-slate-800 rounded-xl p-4">
          <h4 className="text-sm font-bold text-gray-300 mb-3">Release Zombie Slot</h4>
          <div className="flex gap-2 mb-2">
            <input 
              type="text" placeholder="Slot ID (e.g. A1-1)" 
              value={releaseSlotId} onChange={e => setReleaseSlotId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-white flex-1 focus:border-cyan-500 outline-none"
            />
            <input 
              type="text" placeholder="Reason (Required)" 
              value={releaseReason} onChange={e => setReleaseReason(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-white flex-2 focus:border-cyan-500 outline-none"
            />
          </div>
          <Button 
            size="sm" variant="secondary" className="w-full bg-slate-800 hover:bg-slate-700 text-white" 
            disabled={loading || !releaseSlotId || !releaseReason}
            onClick={() => handleOp(`/api/admin/slots/${releaseSlotId}/release`, { reason: releaseReason })}
          >
            Release Slot
          </Button>
        </div>

        {/* Reassign Slot */}
        <div className="border border-slate-800 rounded-xl p-4">
          <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-blue-400"/> Reassign Vehicle
          </h4>
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex gap-2">
              <input 
                type="text" placeholder="Session ID" 
                value={reassignSession} onChange={e => setReassignSession(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-white flex-1 focus:border-cyan-500 outline-none"
              />
              <input 
                type="text" placeholder="Old Slot ID" 
                value={reassignOldSlot} onChange={e => setReassignOldSlot(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-white flex-1 focus:border-cyan-500 outline-none"
              />
              <input 
                type="text" placeholder="New Slot ID" 
                value={reassignNewSlot} onChange={e => setReassignNewSlot(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-white flex-1 focus:border-cyan-500 outline-none"
              />
            </div>
            <input 
              type="text" placeholder="Reason (Required)" 
              value={reassignReason} onChange={e => setReassignReason(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-white w-full focus:border-cyan-500 outline-none"
            />
          </div>
          <Button 
            size="sm" className="w-full bg-blue-600 hover:bg-blue-500 text-white" 
            disabled={loading || !reassignSession || !reassignOldSlot || !reassignNewSlot || !reassignReason}
            onClick={() => handleOp(`/api/admin/slots/${reassignOldSlot}/reassign`, { sessionId: reassignSession, newSlotId: reassignNewSlot, reason: reassignReason })}
          >
            Reassign Vehicle
          </Button>
        </div>
      </div>
    </div>
  );
}

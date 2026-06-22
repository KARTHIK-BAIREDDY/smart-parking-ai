/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { Check, X, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OcrReviewQueue() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQueue = () => {
    fetch("/api/admin/ocr-queue")
      .then(res => res.json())
      .then(data => {
        if (data.success) setEvents(data.events);
      });
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (eventId: string, action: string, plate?: string) => {
    setLoading(true);
    try {
      await fetch("/api/admin/ocr-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, action, correctedPlate: plate })
      });
      fetchQueue(); // Refresh
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-amber-900/30 rounded-3xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          OCR Review Queue
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchQueue} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Queue is empty. All clear!
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(ev => (
            <div key={ev.id} className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Detected Plate (Confidence: <span className="text-amber-400">{ev.confidence}%</span>)</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    defaultValue={ev.plateNumber} 
                    id={`plate-${ev.id}`}
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-gray-500 px-2">{ev.eventType.toUpperCase()} - {ev.cameraId}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-red-400 border-red-900 hover:bg-red-900/30" onClick={() => handleAction(ev.id, 'reject')}>
                  <X className="w-4 h-4 mr-1"/> Reject
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white" onClick={() => {
                  const val = (document.getElementById(`plate-${ev.id}`) as HTMLInputElement).value;
                  handleAction(ev.id, 'approve', val);
                }}>
                  <Check className="w-4 h-4 mr-1"/> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

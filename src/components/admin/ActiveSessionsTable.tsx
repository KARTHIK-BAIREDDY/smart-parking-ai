/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { MapPin, Clock } from "lucide-react";

export function ActiveSessionsTable() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/sessions")
      .then(res => res.json())
      .then(data => {
        if (data.success) setSessions(data.sessions);
      });
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Active Sessions</h3>
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-800/50">
            <TableRow>
              <TableHead>Vehicle Plate</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Entry Time</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500 py-6">
                  No active parking sessions
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((s) => (
                <TableRow key={s.id} className="border-slate-800 hover:bg-slate-800/30">
                  <TableCell className="font-mono text-cyan-400 font-bold">{s.vehicleNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {s.placeName} ({s.slotId})
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {(() => {
                        console.log("SESSION DATE =", s.entryTime);
                        console.log("DATE TYPE =", typeof s.entryTime);
                        const date = s.entryTime ? new Date(s.entryTime) : null;
                        return date && !isNaN(date.getTime())
                          ? format(date, "MMM d, HH:mm")
                          : "Never";
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${s.isVisitor ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                      {s.slotType}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

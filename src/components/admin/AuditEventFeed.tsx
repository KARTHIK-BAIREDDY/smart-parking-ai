/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { format } from "date-fns";

export function AuditEventFeed() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/audit-logs")
      .then(res => res.json())
      .then(data => {
        if (data.success) setLogs(data.logs);
      });
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-[400px] flex flex-col">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-gray-400" />
        Audit Logs
      </h3>
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">No audit logs found</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-cyan-400">{log.action}</span>
                <span className="text-xs text-gray-500">
                  {(() => {
                    console.log("AUDIT LOG DATE =", log.timestamp);
                    console.log("DATE TYPE =", typeof log.timestamp);
                    const date = log.timestamp ? new Date(log.timestamp) : null;
                    return date && !isNaN(date.getTime())
                      ? format(date, "MMM d, HH:mm:ss")
                      : "Never";
                  })()}
                </span>
              </div>
              <p className="text-gray-300">
                <span className="text-gray-500 mr-2">{log.actorId}</span>
                {log.entityType}: {log.entityId}
              </p>
              {log.metadata?.reason && (
                <p className="text-gray-400 mt-1 italic">"{log.metadata.reason}"</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { History, Search, Filter } from "lucide-react";
import { format } from "date-fns";

export function AuditEventFeed() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/audit-logs")
      .then(res => res.json())
      .then(data => {
        if (data.success) setLogs(data.logs);
      });
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.actorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchSearch) return false;

    if (dateFilter === "today") {
      const today = new Date().setHours(0,0,0,0);
      const logDate = new Date(log.timestamp).setHours(0,0,0,0);
      return today === logDate;
    }
    // Could add more date filters here like 'week', 'month'
    
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-[500px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-gray-400" />
          Audit Logs
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 w-full sm:w-64"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-300 focus:outline-none focus:border-cyan-500 appearance-none w-full sm:w-auto cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No audit logs found
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900 z-10 text-gray-400">
              <tr>
                <th className="pb-3 font-medium w-1/4">Date</th>
                <th className="pb-3 font-medium w-1/4">Action</th>
                <th className="pb-3 font-medium w-1/4">Entity</th>
                <th className="pb-3 font-medium w-1/4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredLogs.map((log) => {
                const date = log.timestamp ? new Date(log.timestamp) : null;
                const formattedDate = date && !isNaN(date.getTime()) 
                  ? format(date, "MMM d, HH:mm:ss") 
                  : "Unknown";

                return (
                  <tr key={log.id} className="group hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 text-gray-400 align-top">
                      {formattedDate}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <span className="font-semibold text-cyan-400">{log.action}</span>
                      <div className="text-xs text-gray-500 mt-0.5">{log.actorId}</div>
                    </td>
                    <td className="py-3 pr-4 align-top text-gray-300">
                      {log.entityType}: {log.entityId}
                    </td>
                    <td className="py-3 align-top text-gray-400 italic text-xs leading-relaxed">
                      {log.metadata?.reason ? `"${log.metadata.reason}"` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

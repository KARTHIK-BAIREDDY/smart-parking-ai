"use client";

import { useState } from "react";
import { Bell, Send, AlertTriangle, CheckCircle, Info, ShieldAlert, Loader2 } from "lucide-react";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "security">("info");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, type }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send announcement");

      setSuccessMsg("Announcement broadcasted successfully to all users!");
      setTitle("");
      setMessage("");
      setType("info");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Bell className="w-8 h-8 text-amber-400" /> Notification Management
        </h1>
        <p className="text-gray-400 mt-2">
          Create and broadcast system-wide notifications and admin announcements to all registered users.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6">Broadcast New Announcement</h2>

        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 text-green-400 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleBroadcast} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Announcement Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled System Maintenance"
              required
              className="w-full p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-amber-450 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Alert Severity/Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-amber-450 focus:outline-none transition"
            >
              <option value="info">Info (Blue)</option>
              <option value="success">Success (Green)</option>
              <option value="warning">Warning (Yellow)</option>
              <option value="security">Security Incident (Cyan)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Broadcast Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter details of the announcement here..."
              required
              rows={4}
              className="w-full p-4 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-amber-450 focus:outline-none transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Broadcasting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" /> Broadcast Announcement
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

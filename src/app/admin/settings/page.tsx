"use client";

import { Settings2 } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white flex items-center gap-3">
        <Settings2 className="w-8 h-8 text-amber-400" /> System Settings
      </h1>
      <p className="text-gray-400">
        ANPR configuration, camera endpoints, and operational preferences.
      </p>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-gray-500 text-center">
        ANPR and system configuration panels will be available here.
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Settings, Activity, Send } from "lucide-react";

export function SmsSettingsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState("MSG91");
  const [counts, setCounts] = useState({ pending: 0, processing: 0, completed: 0, failed: 0, dead: 0 });
  const [testPhone, setTestPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSettings = () => {
    fetch("/api/admin/sms/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEnabled(data.settings.smsEnabled);
          setProvider(data.settings.provider);
          setCounts(data.queueCounts);
        }
      });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/sms/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", settings: { smsEnabled: enabled, provider } })
    });
    const data = await res.json();
    setMessage(data.success ? "Settings saved" : "Save failed");
    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleTest = async () => {
    if (!testPhone) return;
    setLoading(true);
    const res = await fetch("/api/admin/sms/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", testPhoneNumber: testPhone })
    });
    const data = await res.json();
    setMessage(data.success ? "Test queued" : "Test failed");
    setLoading(false);
    fetchSettings();
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-indigo-400" />
        SMS Configuration
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Settings */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">System Status</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${enabled ? 'left-7' : 'left-1'}`} />
              </button>
              <span className="text-sm text-gray-300">{enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Active Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            >
              <option value="MSG91">MSG91</option>
              <option value="Twilio">Twilio</option>
              <option value="Aws">AWS SNS</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Settings className="w-4 h-4" /> Save Settings
          </button>
        </div>

        {/* Queue Health */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" /> Queue Health
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Pending:</span> <span className="font-mono text-yellow-400">{counts.pending}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Processing:</span> <span className="font-mono text-cyan-400">{counts.processing}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Completed:</span> <span className="font-mono text-green-400">{counts.completed}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Failed:</span> <span className="font-mono text-red-400">{counts.failed}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Dead:</span> <span className="font-mono text-purple-400">{counts.dead}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <label className="text-sm text-gray-400 block mb-2">Test Delivery</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="+1234567890"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
          />
          <button
            onClick={handleTest}
            disabled={loading || !testPhone}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Send className="w-4 h-4" /> Queue Test
          </button>
        </div>
      </div>
      
      {message && <p className="text-xs text-center text-cyan-400">{message}</p>}
    </div>
  );
}

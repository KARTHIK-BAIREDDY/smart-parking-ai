"use client";

import { useState, useEffect } from "react";
import { Shield, ShieldAlert, UserPlus, Loader2, Key, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { isSuperAdminRole } from "@/lib/auth-helpers";

interface AdminUser {
  _id: string;
  username?: string;
  email?: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [resetModalUser, setResetModalUser] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const isSuperAdmin = isSuperAdminRole(session?.user?.role);

  const loadUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h2 className="text-xl font-bold text-white">Super Admin Required</h2>
        <p>You do not have permission to view or manage administrators.</p>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setCreating(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(data.error || "Failed to create admin.");
      return;
    }

    setSuccess(`${newRole === "operator" ? "Operator" : "Admin"} ${newUsername} created successfully.`);
    setNewUsername("");
    setNewPassword("");
    setConfirmPassword("");
    setNewRole("admin");
    loadUsers();
  };

  const handleAction = async (userId: string, action: "disable" | "enable") => {
    if (!confirm(`Are you sure you want to ${action} this admin?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("An unexpected error occurred.");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE this admin?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("An unexpected error occurred.");
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (resetPassword !== resetConfirm) {
      alert("Passwords do not match.");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetModalUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", password: resetPassword }),
      });
      if (res.ok) {
        alert("Password reset successfully.");
        setResetModalUser(null);
        setResetPassword("");
        setResetConfirm("");
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("An unexpected error occurred.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="w-8 h-8 text-amber-400" /> Admin Management
        </h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Add New Account</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-amber-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-amber-400"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-amber-400"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-amber-400"
          >
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            Create Account
          </button>
        </form>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        {success && <p className="text-green-400 text-sm mt-3">{success}</p>}
      </div>

      {loading ? (
        <p className="text-amber-400 text-center py-20">Loading...</p>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-gray-400 text-sm">
                <th className="p-4 font-medium">Username / Email</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition">
                  <td className="p-4 text-white font-medium">
                    {user.username || user.email}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-400">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.role === "super_admin" ? (
                      <span className="text-green-400 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Immutable</span>
                    ) : user.active ? (
                      <span className="text-green-400 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Active</span>
                    ) : (
                      <span className="text-red-400 text-sm flex items-center gap-1"><Ban className="w-4 h-4"/> Disabled</span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {user.role !== "super_admin" && (
                      <>
                        <button
                          onClick={() => setResetModalUser(user)}
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition inline-flex items-center gap-1"
                        >
                          <Key className="w-4 h-4" /> Reset
                        </button>
                        {user.active ? (
                          <button
                            onClick={() => handleAction(user._id, "disable")}
                            className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-500/30 transition inline-flex items-center gap-1"
                          >
                            <Ban className="w-4 h-4" /> Disable
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(user._id, "enable")}
                            className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Enable
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Reset Password for {resetModalUser.username}</h3>
            <form onSubmit={submitReset} className="space-y-4">
              <input
                type="password"
                placeholder="New Password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                required
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-400"
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                required
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-400"
              />
              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition flex items-center gap-2"
                >
                  {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

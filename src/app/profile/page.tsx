"use client";

import { useSession } from "next-auth/react";
import { User, Mail, Phone } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <Link href="/parking" className="text-gray-400 hover:text-white mb-8 inline-block">← Back to Dashboard</Link>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name ?? ""} className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <User className="w-8 h-8 text-cyan-400" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user?.name || "—"}</h1>
            <span className="text-xs px-2 py-1 bg-green-400/20 text-green-400 rounded-full font-bold capitalize">
              {user?.role ?? "user"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-xl">
            <Mail className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Email</p>
              <p className="text-white">{user?.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-xl">
            <Phone className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Mobile</p>
              <p className="text-white text-gray-300">Stored in your registration</p>
            </div>
          </div>
        </div>

        <p className="text-gray-500 text-xs text-center mt-8">
          Profile editing will be available in a future update.
        </p>
      </div>
    </main>
  );
}

import { motion } from "framer-motion";
import { User, ShieldAlert, ShieldCheck, LogIn } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-[500px] bg-[var(--color-neon-cyan)]/10 blur-[150px] pointer-events-none rounded-full" />
      
      <div className="relative z-10 w-full max-w-5xl px-4 sm:px-6 lg:px-8 mx-auto text-center">
        
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
            Welcome
          </h1>
          <p className="text-xl text-gray-400 mx-auto">
            Select your portal to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RoleCard 
            href="/login/user"
            icon={<User className="w-8 h-8" />}
            title="User Login"
            description="Mobile Number + Password Access. Find parking, manage your registered vehicles, and view your parking history."
            colorClass="text-cyan-400"
            borderClass="border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
          />

          <RoleCard 
            href="/login/admin"
            icon={<ShieldCheck className="w-8 h-8" />}
            title="Admin Login"
            description="Manage slots, monitor camera feeds, and oversee daily operations."
            colorClass="text-blue-400"
            borderClass="border-blue-500/30 hover:border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
          />

          <RoleCard 
            href="/login/super-admin"
            icon={<ShieldAlert className="w-8 h-8" />}
            title="Super Admin"
            description="Full system control, manage admin accounts, and configure core settings."
            colorClass="text-purple-400"
            borderClass="border-purple-500/30 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
          />
        </div>

      </div>
    </main>
  );
}

function RoleCard({ href, icon, title, description, colorClass, borderClass }: any) {
  return (
    <div>
      <Link 
        href={href}
        className={`block h-full glass-panel p-8 rounded-3xl border transition-all duration-300 group ${borderClass} bg-slate-900/40 hover:bg-slate-900/60`}
      >
        <div className={`w-16 h-16 rounded-2xl bg-black/50 flex items-center justify-center mb-6 mx-auto ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          {description}
        </p>
        <div className={`flex items-center justify-center gap-2 text-sm font-bold ${colorClass}`}>
          Login <LogIn className="w-4 h-4" />
        </div>
      </Link>
    </div>
  );
}
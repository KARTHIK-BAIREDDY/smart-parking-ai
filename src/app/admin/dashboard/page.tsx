import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-server";
import { isAdminRole } from "@/lib/auth-helpers";
import { getSessionUser } from "@/lib/auth-helpers";

import { MetricsOverview } from "@/components/admin/MetricsOverview";
import { AnalyticsSection } from "@/components/admin/AnalyticsSection";
import { ActiveSessionsTable } from "@/components/admin/ActiveSessionsTable";

import { ManualOperationsPanel } from "@/components/admin/ManualOperationsPanel";
import { SystemHealthPanel } from "@/components/admin/SystemHealthPanel";
import { AuditEventFeed } from "@/components/admin/AuditEventFeed";
import { SmsSettingsPanel } from "@/components/admin/SmsSettingsPanel";

export default async function AdminDashboardPage() {
  const session = await getAuthSession();
  const user = getSessionUser(session);
  
  if (!user || !isAdminRole(user.role)) {
    redirect("/login/admin");
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 font-sans pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Admin Control Center
            </h1>
            <p className="text-gray-400 mt-1">Smart Parking System Operations</p>
          </div>
          <div className="text-sm text-gray-500 bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
            Welcome, {user.name}
          </div>
        </header>

        <MetricsOverview />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <AnalyticsSection />

            <ActiveSessionsTable />
          </div>
          <div className="space-y-8">
            <SystemHealthPanel />
            <SmsSettingsPanel />
            <ManualOperationsPanel />
            <AuditEventFeed />
          </div>
        </div>

      </div>
    </div>
  );
}

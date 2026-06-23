import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-server";
import { isAdminRole } from "@/lib/auth-helpers";
import { getSessionUser } from "@/lib/auth-helpers";

import { MetricsOverview } from "@/components/admin/MetricsOverview";
import { TelemetryPanel } from "@/components/admin/TelemetryPanel";
import { AnalyticsSection } from "@/components/admin/AnalyticsSection";
import { ActiveSessionsTable } from "@/components/admin/ActiveSessionsTable";

import { ManualOperationsPanel } from "@/components/admin/ManualOperationsPanel";
import { AuditEventFeed } from "@/components/admin/AuditEventFeed";
export default async function AdminDashboardPage() {
  const session = await getAuthSession();
  const user = getSessionUser(session);
  
  if (!user || !isAdminRole(user.role)) {
    redirect("/login/admin");
  }

  return (
    <div className="min-h-screen bg-black px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-[1600px] mx-auto space-y-8">
        
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
        <TelemetryPanel />

        <div className="space-y-8">
          <AnalyticsSection />
          <ActiveSessionsTable />
        </div>

        <ManualOperationsPanel />

        <AuditEventFeed />

      </div>
    </div>
  );
}

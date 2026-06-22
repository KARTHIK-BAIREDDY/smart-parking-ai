"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Define public routes that still use the Navbar
  const isPublicRoute = pathname === "/login" || pathname === "/signup" || pathname?.startsWith("/login/");

  // Loading gate for protected routes
  if (!isPublicRoute && status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-background)] text-[var(--color-neon-cyan)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current"></div>
      </div>
    );
  }

  // Double check auth state client-side
  if (!isPublicRoute && status === "unauthenticated") {
    if (typeof window !== "undefined") {
      router.replace("/login");
    }
    return null;
  }

  if (isPublicRoute || pathname === "/") {
    // If we are at the root, we can still render the Navbar, but it is protected.
    // Or we just treat / as a public layout route (Navbar) even though it requires auth.
    return (
      <>
        <Navbar />
        <div className="pt-16 flex-1 flex flex-col">{children}</div>
      </>
    );
  }

  // Authenticated routes use the Sidebar layout
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[var(--color-background)] p-4 md:p-8">
        <div className="mx-auto max-w-7xl h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

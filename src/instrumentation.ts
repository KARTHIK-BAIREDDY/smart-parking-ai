/**
 * src/instrumentation.ts
 *
 * Next.js Instrumentation Hook — executed once per server process on cold start.
 * Used to initialize and verify database indexes on every environment automatically.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { ensureIndexes, verifyIndexes } = await import("@/lib/mongo-db");

      // Step 1: Create any missing indexes (idempotent — safe to run every startup)
      await ensureIndexes();

      // Step 2: Verify critical indexes exist with correct properties.
      // Logs warnings but NEVER throws — a missing index must not block traffic.
      await verifyIndexes();
    } catch (err) {
      // Index init/verify failure must never prevent the server from starting
      console.error("[instrumentation] Startup DB check failed (non-fatal):", err);
    }
  }
}


/* eslint-disable */
import clientPromise from "./mongodb";
import type { Db } from "mongodb";

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db("smartparking");
}

// ---------------------------------------------------------------------------
// ensureIndexes
// Creates all required indexes idempotently. Called from src/instrumentation.ts
// at server startup so every environment auto-migrates without manual steps.
// ---------------------------------------------------------------------------

let indexesInitialized = false;

export async function ensureIndexes(): Promise<void> {
  // Only run once per server process
  if (indexesInitialized) return;
  indexesInitialized = true;

  try {
    const db = await getDatabase();
    await createAllIndexes(db);
    console.log("[db] Index initialization complete.");
  } catch (err) {
    // Log but never throw — a missing index must never crash the app
    console.error("[db] Index initialization failed (non-fatal):", err);
  }
}

async function createAllIndexes(db: Db): Promise<void> {
  const ops: Promise<string>[] = [
    // ─── users ───────────────────────────────────────────────────────────────
    db.collection("users").createIndex({ mobile: 1 }, { unique: true, sparse: true, name: "users_mobile_unique" }),
    db.collection("users").createIndex({ phoneNumber: 1 }, { unique: true, sparse: true, name: "users_phoneNumber_unique" }),
    db.collection("users").createIndex({ email: 1 },  { unique: true, sparse: true, name: "users_email_unique" }),
    db.collection("users").createIndex({ role: 1 },                                  { name: "users_role" }),

    // ─── vehicles ────────────────────────────────────────────────────────────
    db.collection("vehicles").createIndex({ vehicleNumber: 1 }, { unique: true,  name: "vehicles_vehicleNumber_unique" }),
    db.collection("vehicles").createIndex({ userId: 1 },                            { name: "vehicles_userId" }),
    db.collection("vehicles").createIndex({ status: 1 },                            { name: "vehicles_status" }),

    // ─── parking_places ──────────────────────────────────────────────────────
    db.collection("parking_places").createIndex({ isActive: 1 }, { name: "parking_places_isActive" }),

    // ─── parking_slots ───────────────────────────────────────────────────────
    db.collection("parking_slots").createIndex({ parkingPlaceId: 1 },            { name: "parking_slots_placeId" }),
    db.collection("parking_slots").createIndex({ parkingPlaceId: 1, status: 1 }, { name: "parking_slots_placeId_status" }),
    // NOTE: slotNumber unique index intentionally omitted (has null values in existing data)

    // ─── parking_sessions ────────────────────────────────────────────────────
    db.collection("parking_sessions").createIndex({ vehicleNumber: 1 },          { name: "sessions_vehicleNumber" }),
    db.collection("parking_sessions").createIndex({ slotId: 1 },                 { name: "sessions_slotId" }),
    db.collection("parking_sessions").createIndex({ status: 1 },                 { name: "sessions_status" }),
    db.collection("parking_sessions").createIndex({ userId: 1 },                 { name: "sessions_userId" }),
    db.collection("parking_sessions").createIndex({ vehicleId: 1 }, { sparse: true, name: "sessions_vehicleId" }),
    db.collection("parking_sessions").createIndex({ parkingPlaceId: 1 },         { name: "sessions_placeId" }),
    db.collection("parking_sessions").createIndex({ entryTime: -1 },             { name: "sessions_entryTime" }),
    db.collection("parking_sessions").createIndex({ status: 1, entryTime: -1 },  { name: "sessions_status_entryTime" }),

    // ─── camera_events ───────────────────────────────────────────────────────
    db.collection("camera_events").createIndex({ plateNumber: 1 },          { name: "camera_events_plate" }),
    db.collection("camera_events").createIndex({ timestamp: -1 },           { name: "camera_events_timestamp" }),
    db.collection("camera_events").createIndex({ sessionId: 1 }, { sparse: true, name: "camera_events_sessionId" }),
    db.collection("camera_events").createIndex({ cameraId: 1 },             { name: "camera_events_cameraId" }),
    db.collection("camera_events").createIndex({ eventType: 1 },            { name: "camera_events_eventType" }),

    // ─── audit_logs ──────────────────────────────────────────────────────────
    db.collection("audit_logs").createIndex({ action: 1 },     { name: "audit_logs_action" }),
    db.collection("audit_logs").createIndex({ entityId: 1 },   { name: "audit_logs_entityId" }),
    db.collection("audit_logs").createIndex({ actorId: 1 },    { name: "audit_logs_actorId" }),
    db.collection("audit_logs").createIndex({ timestamp: -1 }, { name: "audit_logs_timestamp" }),


    // ─── bookings ────────────────────────────────────────────────────────────
    db.collection("bookings").createIndex({ userId: 1 },         { name: "bookings_userId" }),
    db.collection("bookings").createIndex({ slotId: 1 },         { name: "bookings_slotId" }),
    db.collection("bookings").createIndex({ status: 1 },         { name: "bookings_status" }),
    db.collection("bookings").createIndex({ scheduledTime: -1 }, { name: "bookings_scheduledTime" }),

    // ─── notifications ───────────────────────────────────────────────────────
    db.collection("notifications").createIndex({ userId: 1, createdAt: -1 }, { name: "notifications_userId_createdAt" }),
    db.collection("notifications").createIndex({ isRead: 1 },                { name: "notifications_isRead" }),

    // ─── security_logs ───────────────────────────────────────────────────────
    db.collection("security_logs").createIndex({ userId: 1 },     { name: "security_logs_userId" }),
    db.collection("security_logs").createIndex({ action: 1 },     { name: "security_logs_action" }),
    db.collection("security_logs").createIndex({ createdAt: -1 }, { name: "security_logs_createdAt" }),

    // ─── notification_logs ───────────────────────────────────────────────────
    db.collection("notification_logs").createIndex({ userId: 1 }, { name: "notification_logs_userId" }),
    db.collection("notification_logs").createIndex({ timestamp: -1 }, { name: "notification_logs_timestamp" }),

    // ─── camera_settings ─────────────────────────────────────────────────────
    db.collection("camera_settings").createIndex({ cameraId: 1 }, { unique: true, name: "camera_settings_cameraId" }),
  ];

  const results = await Promise.allSettled(ops);

  let createdCount  = 0;
  let skippedCount  = 0;
  let failedCount   = 0;

  results.forEach((r) => {
    if (r.status === "fulfilled") {
      // MongoDB returns the index name when created, or a string when it already exists
      createdCount++;
    } else {
      const msg = r.reason?.message ?? String(r.reason);
      // These are not real errors — index already exists with the same spec
      const isAlreadyExistsError =
        msg.includes("already exists") ||
        msg.includes("IndexKeySpecsConflict");

      if (isAlreadyExistsError) {
        skippedCount++;
      } else if (msg.includes("IndexOptionsConflict")) {
        // Same key, different options — requires manual drop + recreate
        failedCount++;
        console.error(
          "[db] IndexOptionsConflict — drop the old index in Atlas then restart:",
          msg
        );
      } else {
        failedCount++;
        console.error("[db] Index creation error:", msg);
      }
    }
  });

  console.log(
    `[db] Indexes — ${createdCount} ok, ${skippedCount} already existed, ${failedCount} error(s)`
  );
}

// ---------------------------------------------------------------------------
// verifyIndexes
// Called at startup (after ensureIndexes) to confirm critical unique indexes
// are present and correctly configured.  Logs warnings but NEVER throws —
// a missing index warning must never prevent the server from handling requests.
// ---------------------------------------------------------------------------

interface IndexCheckResult {
  index: string;
  status: "ok" | "missing" | "wrong_options";
  detail?: string;
}

const CRITICAL_CHECKS = [
  { col: "users",            name: "users_mobile_unique",           wantUnique: true,  wantTtl: false },
  { col: "users",            name: "users_email_unique",            wantUnique: true,  wantTtl: false },
  { col: "vehicles",         name: "vehicles_vehicleNumber_unique", wantUnique: true,  wantTtl: false },

  { col: "parking_sessions", name: "sessions_status_entryTime",     wantUnique: false, wantTtl: false },
] as const;

export async function verifyIndexes(): Promise<IndexCheckResult[]> {
  const results: IndexCheckResult[] = [];

  try {
    const db = await getDatabase();

    for (const check of CRITICAL_CHECKS) {
      try {
        const indexes = await db.collection(check.col).indexes();
        const found = indexes.find((i: Record<string, unknown>) => i.name === check.name);

        if (!found) {
          results.push({ index: `${check.col}.${check.name}`, status: "missing" });
          console.warn(`[db] ⚠️  Critical index MISSING: ${check.col} → ${check.name}`);
          console.warn(`[db]    Run: node scripts/migrate-and-index.js --execute`);
          continue;
        }

        const problems: string[] = [];
        if (check.wantUnique && !found.unique) problems.push("should be UNIQUE");
        if (check.wantTtl    && found.expireAfterSeconds === undefined) problems.push("TTL not set");

        if (problems.length > 0) {
          results.push({
            index: `${check.col}.${check.name}`,
            status: "wrong_options",
            detail: problems.join(", "),
          });
          console.warn(`[db] ⚠️  Index property mismatch: ${check.col} → ${check.name} — ${problems.join(", ")}`);
        } else {
          results.push({ index: `${check.col}.${check.name}`, status: "ok" });
        }
      } catch (_colErr) {
        // Collection doesn't exist yet — not an error if the app is new
        results.push({
          index: `${check.col}.${check.name}`,
          status: "missing",
          detail: "collection not yet created",
        });
      }
    }

    const ok      = results.filter((r) => r.status === "ok").length;
    const missing = results.filter((r) => r.status !== "ok").length;

    if (missing === 0) {
      console.log(`[db] Index verification passed — all ${ok} critical indexes confirmed.`);
    } else {
      console.warn(`[db] Index verification: ${ok} ok, ${missing} issue(s) — see warnings above.`);
    }
  } catch (err) {
    console.error("[db] verifyIndexes failed (non-fatal):", err);
  }

  return results;
}
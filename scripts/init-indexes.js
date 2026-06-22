/**
 * scripts/init-indexes.js
 *
 * Idempotent production index initializer.
 * Safe to run multiple times — createIndex() is a no-op when the index already exists.
 *
 * Usage:
 *   node scripts/init-indexes.js
 *
 * Also called automatically at Next.js startup via src/instrumentation.ts
 */

const fs = require("fs");
const path = require("path");

// Manual .env.local loader — avoids requiring the dotenv package
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnv();
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set. Aborting index initialization.");
  process.exit(1);
}

async function createIndexesSafe(db) {
  const ops = [];

  // ─── users ───────────────────────────────────────────────────────────────
  ops.push(
    db.collection("users").createIndex({ mobile: 1 }, { unique: true, sparse: true, name: "users_mobile_unique" }),
    db.collection("users").createIndex({ email: 1 },  { unique: true, sparse: true, name: "users_email_unique" }),
    db.collection("users").createIndex({ role: 1 },                                  { name: "users_role" })
  );

  // ─── vehicles ────────────────────────────────────────────────────────────
  ops.push(
    db.collection("vehicles").createIndex({ vehicleNumber: 1 }, { unique: true,  name: "vehicles_vehicleNumber_unique" }),
    db.collection("vehicles").createIndex({ userId: 1 },                           { name: "vehicles_userId" }),
    db.collection("vehicles").createIndex({ status: 1 },                           { name: "vehicles_status" })
  );

  // ─── parking_places ──────────────────────────────────────────────────────
  ops.push(
    db.collection("parking_places").createIndex({ isActive: 1 }, { name: "parking_places_isActive" })
  );

  // ─── parking_slots ───────────────────────────────────────────────────────
  ops.push(
    db.collection("parking_slots").createIndex({ parkingPlaceId: 1 },              { name: "parking_slots_placeId" }),
    db.collection("parking_slots").createIndex({ parkingPlaceId: 1, status: 1 },   { name: "parking_slots_placeId_status" })
    // NOTE: slotNumber is not the primary key — slotId is used in all queries.
    // slotNumber unique index intentionally omitted (has null values in existing data).
  );

  // ─── parking_sessions ────────────────────────────────────────────────────
  ops.push(
    db.collection("parking_sessions").createIndex({ vehicleNumber: 1 },              { name: "sessions_vehicleNumber" }),
    db.collection("parking_sessions").createIndex({ slotId: 1 },                     { name: "sessions_slotId" }),
    db.collection("parking_sessions").createIndex({ status: 1 },                     { name: "sessions_status" }),
    db.collection("parking_sessions").createIndex({ userId: 1 },                     { name: "sessions_userId" }),
    db.collection("parking_sessions").createIndex({ vehicleId: 1 }, { sparse: true, name: "sessions_vehicleId" }),
    db.collection("parking_sessions").createIndex({ parkingPlaceId: 1 },             { name: "sessions_placeId" }),
    db.collection("parking_sessions").createIndex({ entryTime: -1 },                 { name: "sessions_entryTime" }),
    db.collection("parking_sessions").createIndex({ status: 1, entryTime: -1 },      { name: "sessions_status_entryTime" })
  );

  // ─── otps ────────────────────────────────────────────────────────────────
  ops.push(
    db.collection("otps").createIndex({ mobile: 1 },     { name: "otps_mobile" }),
    // TTL index — MongoDB auto-deletes documents when expiresAt has passed
    db.collection("otps").createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: "otps_expiresAt_ttl" }
    )
  );

  // ─── camera_events ───────────────────────────────────────────────────────
  ops.push(
    db.collection("camera_events").createIndex({ plateNumber: 1 },          { name: "camera_events_plate" }),
    db.collection("camera_events").createIndex({ timestamp: -1 },           { name: "camera_events_timestamp" }),
    db.collection("camera_events").createIndex({ sessionId: 1 }, { sparse: true, name: "camera_events_sessionId" }),
    db.collection("camera_events").createIndex({ cameraId: 1 },             { name: "camera_events_cameraId" }),
    db.collection("camera_events").createIndex({ eventType: 1 },            { name: "camera_events_eventType" })
  );

  // ─── audit_logs ──────────────────────────────────────────────────────────
  ops.push(
    db.collection("audit_logs").createIndex({ action: 1 },     { name: "audit_logs_action" }),
    db.collection("audit_logs").createIndex({ entityId: 1 },   { name: "audit_logs_entityId" }),
    db.collection("audit_logs").createIndex({ actorId: 1 },    { name: "audit_logs_actorId" }),
    db.collection("audit_logs").createIndex({ timestamp: -1 }, { name: "audit_logs_timestamp" })
  );

  // ─── payments ────────────────────────────────────────────────────────────
  ops.push(
    db.collection("payments").createIndex({ sessionId: 1 },  { name: "payments_sessionId" }),
    db.collection("payments").createIndex({ userId: 1 },     { name: "payments_userId" }),
    db.collection("payments").createIndex({ status: 1 },     { name: "payments_status" }),
    db.collection("payments").createIndex({ createdAt: -1 }, { name: "payments_createdAt" })
  );

  // ─── bookings ────────────────────────────────────────────────────────────
  ops.push(
    db.collection("bookings").createIndex({ userId: 1 },        { name: "bookings_userId" }),
    db.collection("bookings").createIndex({ slotId: 1 },        { name: "bookings_slotId" }),
    db.collection("bookings").createIndex({ status: 1 },        { name: "bookings_status" }),
    db.collection("bookings").createIndex({ scheduledTime: -1 },{ name: "bookings_scheduledTime" })
  );

  // ─── notifications ───────────────────────────────────────────────────────
  ops.push(
    db.collection("notifications").createIndex({ userId: 1, createdAt: -1 }, { name: "notifications_userId_createdAt" }),
    db.collection("notifications").createIndex({ isRead: 1 },                { name: "notifications_isRead" })
  );

  // ─── security_logs ───────────────────────────────────────────────────────
  ops.push(
    db.collection("security_logs").createIndex({ userId: 1 },    { name: "security_logs_userId" }),
    db.collection("security_logs").createIndex({ action: 1 },    { name: "security_logs_action" }),
    db.collection("security_logs").createIndex({ createdAt: -1 },{ name: "security_logs_createdAt" })
  );

  // Run all index creations concurrently — each is idempotent
  const results = await Promise.allSettled(ops);

  let created = 0;
  let skipped = 0;
  let failed  = 0;

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      // MongoDB returns the index name if created, or "ok" if it already existed
      const val = r.value;
      if (val && val !== "ok") {
        created++;
      } else {
        skipped++;
      }
    } else {
      const msg = r.reason?.message || String(r.reason);
      // Index already exists with same spec → not a real error
      if (msg.includes("already exists") || msg.includes("IndexOptionsConflict") === false && msg.includes("existing index")) {
        skipped++;
      } else if (msg.includes("IndexOptionsConflict")) {
        console.warn(`  ⚠️  Index conflict (op ${i}): ${msg}`);
        failed++;
      } else {
        console.error(`  ❌ Index error (op ${i}): ${msg}`);
        failed++;
      }
    }
  });

  return { created, skipped, failed };
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db("smartparking");

    console.log("\n📦 Initializing production indexes...\n");

    const { created, skipped, failed } = await createIndexesSafe(db);

    console.log(`✅  Done — created: ${created}, already existed: ${skipped}, errors: ${failed}`);

    if (failed > 0) {
      console.error("⚠️  Some indexes failed to create. Review errors above.");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌  Fatal error:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();

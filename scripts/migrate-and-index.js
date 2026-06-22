/**
 * scripts/migrate-and-index.js
 *
 * Production-grade data cleanup migration + index enforcement.
 *
 * What this script does (in safe, ordered phases):
 *   Phase 0 — Pre-flight: connect, verify env, count collections
 *   Phase 1 — Audit & report users (duplicate mobile)
 *   Phase 2 — Audit & report vehicles (null/empty vehicleNumber)
 *   Phase 3 — Audit & report vehicles (duplicate vehicleNumber)
 *   Phase 4 — Execute cleanup (only if --execute flag is passed)
 *   Phase 5 — Create / verify all production indexes
 *   Phase 6 — Final health report with collection counts
 *
 * DRY RUN (default — safe, read-only):
 *   node scripts/migrate-and-index.js
 *
 * EXECUTE (writes to DB — run after reviewing dry-run output):
 *   node scripts/migrate-and-index.js --execute
 *
 * Migration safety guarantees:
 *   • Dry-run by default — nothing is mutated without --execute
 *   • Duplicate users: older duplicates are archived to `_archived_users`
 *     BEFORE deletion — data is never permanently lost in the same run
 *   • Orphaned vehicles: archived to `_archived_vehicles` before deletion
 *   • Duplicate vehicles: oldest duplicates archived, newest kept
 *   • All mutations are logged with timestamps
 *   • Index creation uses createIndex() which is a no-op if index exists
 *   • IndexOptionsConflict exits with code 1 and clear instructions
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ─── Environment loader ───────────────────────────────────────────────────────
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
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set in .env.local or environment.");
  process.exit(1);
}

const EXECUTE = process.argv.includes("--execute");
const DB_NAME = "smartparking";

// ─── Report storage (populated per phase, printed in Phase 6) ────────────────
const report = {
  runAt: new Date().toISOString(),
  mode: EXECUTE ? "EXECUTE" : "DRY RUN",
  // Phase 1
  duplicateUsers: [],
  usersArchived: 0,
  usersDeleted: 0,
  // Phase 2
  invalidVehicles: [],
  invalidVehiclesArchived: 0,
  invalidVehiclesDeleted: 0,
  // Phase 3
  duplicateVehicles: [],
  duplicateVehiclesArchived: 0,
  duplicateVehiclesDeleted: 0,
  // Phase 5
  indexResults: [],
  // Phase 6
  collectionCounts: {},
};

// ─── Utility ─────────────────────────────────────────────────────────────────
function sep(title) {
  const line = "─".repeat(62);
  console.log(`\n${line}`);
  if (title) console.log(`  ${title}`);
  console.log(line);
}

function dryNote(msg) {
  if (!EXECUTE) console.log(`  [DRY RUN] ${msg}`);
}

/** Return a human-readable _id string regardless of type */
function idStr(id) {
  return id instanceof ObjectId ? id.toHexString() : String(id);
}

// =============================================================================
// Phase 0 — Pre-flight
// =============================================================================
async function phase0_preflight(db) {
  sep("Phase 0 — Pre-flight checks");

  const allCollections = (await db.listCollections().toArray()).map((c) => c.name);
  console.log(`  Connected to: ${DB_NAME}`);
  console.log(`  Collections : ${allCollections.length}`);
  console.log(`  Mode        : ${EXECUTE ? "⚠️  EXECUTE — database will be mutated" : "✅ DRY RUN  — read-only, nothing will change"}`);

  if (!EXECUTE) {
    console.log("\n  To apply changes, re-run with: node scripts/migrate-and-index.js --execute\n");
  }

  return allCollections;
}

// =============================================================================
// Phase 1 — Audit users for duplicate mobile numbers
// =============================================================================
async function phase1_auditUserMobiles(db) {
  sep("Phase 1 — Users: duplicate mobile audit");

  // 1a. Find all documents that have a mobile field set to null or empty string
  const nullMobileCount = await db.collection("users").countDocuments({
    $or: [
      { mobile: null },
      { mobile: "" },
      { mobile: { $exists: false } },
    ],
  });
  console.log(`  Users with null/empty/missing mobile : ${nullMobileCount}`);

  // 1b. Aggregate to find duplicate mobiles
  const dupCursor = await db.collection("users").aggregate([
    {
      $match: {
        mobile: { $exists: true, $ne: null, $ne: "" },
      },
    },
    {
      $group: {
        _id: "$mobile",
        count: { $sum: 1 },
        docs: {
          $push: {
            _id: "$_id",
            id: "$id",
            name: "$name",
            email: "$email",
            createdAt: "$createdAt",
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const duplicates = await dupCursor.toArray();

  if (duplicates.length === 0) {
    console.log("  ✅ No duplicate mobile numbers found.");
  } else {
    console.log(`\n  ⚠️  Found ${duplicates.length} mobile number(s) with duplicates:\n`);

    for (const dup of duplicates) {
      // Sort by createdAt descending — keep the newest
      const sorted = [...dup.docs].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta; // newest first
      });

      const keep   = sorted[0];
      const remove = sorted.slice(1);

      console.log(`  mobile: ${dup._id}  (${dup.count} accounts)`);
      console.log(`    KEEP   : _id=${idStr(keep._id)}  name="${keep.name}"  email="${keep.email}"  createdAt=${keep.createdAt}`);
      remove.forEach((r) => {
        console.log(`    REMOVE : _id=${idStr(r._id)}  name="${r.name}"  email="${r.email}"  createdAt=${r.createdAt}`);
      });
      console.log();

      report.duplicateUsers.push({
        mobile: dup._id,
        totalCount: dup.count,
        keep: { _id: idStr(keep._id), name: keep.name, email: keep.email },
        remove: remove.map((r) => ({ _id: idStr(r._id), name: r.name, email: r.email })),
      });
    }
  }

  // 1c. Execute cleanup
  if (EXECUTE && duplicates.length > 0) {
    console.log("  🔧 Archiving and removing duplicates...");

    for (const dup of report.duplicateUsers) {
      const removeIds = dup.remove.map((r) => new ObjectId(r._id));

      // Fetch full documents before archiving
      const docsToArchive = await db
        .collection("users")
        .find({ _id: { $in: removeIds } })
        .toArray();

      // Archive to _archived_users with a migration timestamp
      if (docsToArchive.length > 0) {
        const archived = docsToArchive.map((d) => ({
          ...d,
          _archivedAt: new Date(),
          _archiveReason: "duplicate_mobile",
          _originalId: d._id,
        }));
        await db.collection("_archived_users").insertMany(archived, { ordered: false });
        report.usersArchived += archived.length;
      }

      // Delete from live collection
      const del = await db.collection("users").deleteMany({ _id: { $in: removeIds } });
      report.usersDeleted += del.deletedCount;
      console.log(`    ✅ mobile=${dup.mobile}: archived ${docsToArchive.length}, deleted ${del.deletedCount}`);
    }
  } else if (duplicates.length > 0) {
    dryNote(`Would archive + delete ${duplicates.flatMap((d) => d.remove).length} duplicate user(s).`);
  }

  // 1d. Users with null mobile — unset the field so sparse index skips them
  if (EXECUTE && nullMobileCount > 0) {
    await db.collection("users").updateMany(
      { $or: [{ mobile: null }, { mobile: "" }] },
      { $unset: { mobile: "" } }
    );
    console.log(`  ✅ Unset null/empty mobile on ${nullMobileCount} user(s) (sparse index will skip).`);
  } else if (nullMobileCount > 0) {
    dryNote(`Would unset mobile on ${nullMobileCount} user(s) with null/empty value.`);
  }
}

// =============================================================================
// Phase 2 — Audit vehicles: null / empty / missing vehicleNumber
// =============================================================================
async function phase2_auditInvalidVehicles(db) {
  sep("Phase 2 — Vehicles: null/empty/missing vehicleNumber");

  const invalid = await db.collection("vehicles").find({
    $or: [
      { vehicleNumber: null },
      { vehicleNumber: "" },
      { vehicleNumber: { $exists: false } },
    ],
  }).toArray();

  if (invalid.length === 0) {
    console.log("  ✅ No vehicles with invalid vehicleNumber.");
    return;
  }

  console.log(`  ⚠️  Found ${invalid.length} vehicle record(s) with null/empty/missing vehicleNumber:\n`);

  for (const v of invalid) {
    const isOrphaned = !v.userId; // no owner → safe to remove
    console.log(
      `    _id=${idStr(v._id)}  userId=${v.userId ?? "(none)"}  status=${v.status ?? "—"}  createdAt=${v.createdAt ?? "—"}  ${isOrphaned ? "[ORPHANED]" : "[HAS OWNER]"}`
    );
    report.invalidVehicles.push({
      _id: idStr(v._id),
      userId: v.userId ?? null,
      status: v.status ?? null,
      isOrphaned,
    });
  }
  console.log();

  if (EXECUTE) {
    console.log("  🔧 Archiving and removing invalid vehicles...");

    const ids = invalid.map((v) => v._id);

    const archived = invalid.map((v) => ({
      ...v,
      _archivedAt: new Date(),
      _archiveReason: "null_vehicleNumber",
      _originalId: v._id,
    }));

    await db.collection("_archived_vehicles").insertMany(archived, { ordered: false });
    report.invalidVehiclesArchived = archived.length;

    const del = await db.collection("vehicles").deleteMany({ _id: { $in: ids } });
    report.invalidVehiclesDeleted = del.deletedCount;

    console.log(`  ✅ Archived ${report.invalidVehiclesArchived}, deleted ${report.invalidVehiclesDeleted} invalid vehicle(s).`);
  } else {
    dryNote(`Would archive + delete ${invalid.length} invalid vehicle record(s).`);
  }
}

// =============================================================================
// Phase 3 — Audit vehicles: duplicate vehicleNumber
// =============================================================================
async function phase3_auditDuplicateVehicles(db) {
  sep("Phase 3 — Vehicles: duplicate vehicleNumber");

  const dupCursor = await db.collection("vehicles").aggregate([
    {
      $match: {
        vehicleNumber: { $exists: true, $ne: null, $ne: "" },
      },
    },
    {
      $group: {
        _id: "$vehicleNumber",
        count: { $sum: 1 },
        docs: {
          $push: {
            _id: "$_id",
            id: "$id",
            userId: "$userId",
            status: "$status",
            createdAt: "$createdAt",
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const duplicates = await dupCursor.toArray();

  if (duplicates.length === 0) {
    console.log("  ✅ No duplicate vehicleNumbers found.");
    return;
  }

  console.log(`  ⚠️  Found ${duplicates.length} vehicleNumber(s) with duplicates:\n`);

  for (const dup of duplicates) {
    // Sort: prefer "approved" status, then newest createdAt
    const sorted = [...dup.docs].sort((a, b) => {
      // Approved records take priority
      const aApproved = (a.status === "approved" || a.status === "Approved") ? 1 : 0;
      const bApproved = (b.status === "approved" || b.status === "Approved") ? 1 : 0;
      if (bApproved !== aApproved) return bApproved - aApproved;
      // Tiebreak by newest
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    const keep   = sorted[0];
    const remove = sorted.slice(1);

    console.log(`  vehicleNumber: ${dup._id}  (${dup.count} records)`);
    console.log(`    KEEP   : _id=${idStr(keep._id)}  userId=${keep.userId}  status=${keep.status}  createdAt=${keep.createdAt}`);
    remove.forEach((r) => {
      console.log(`    REMOVE : _id=${idStr(r._id)}  userId=${r.userId}  status=${r.status}  createdAt=${r.createdAt}`);
    });
    console.log();

    report.duplicateVehicles.push({
      vehicleNumber: dup._id,
      totalCount: dup.count,
      keep: { _id: idStr(keep._id), userId: keep.userId, status: keep.status },
      remove: remove.map((r) => ({ _id: idStr(r._id), userId: r.userId, status: r.status })),
    });
  }

  if (EXECUTE && duplicates.length > 0) {
    console.log("  🔧 Archiving and removing duplicate vehicles...");

    for (const dup of report.duplicateVehicles) {
      const removeIds = dup.remove.map((r) => new ObjectId(r._id));

      const docsToArchive = await db
        .collection("vehicles")
        .find({ _id: { $in: removeIds } })
        .toArray();

      if (docsToArchive.length > 0) {
        const archived = docsToArchive.map((d) => ({
          ...d,
          _archivedAt: new Date(),
          _archiveReason: "duplicate_vehicleNumber",
          _originalId: d._id,
        }));
        await db.collection("_archived_vehicles").insertMany(archived, { ordered: false });
        report.duplicateVehiclesArchived += archived.length;
      }

      const del = await db.collection("vehicles").deleteMany({ _id: { $in: removeIds } });
      report.duplicateVehiclesDeleted += del.deletedCount;
      console.log(`    ✅ ${dup.vehicleNumber}: archived ${docsToArchive.length}, deleted ${del.deletedCount}`);
    }
  } else if (duplicates.length > 0) {
    dryNote(`Would archive + delete ${duplicates.flatMap((d) => d.remove).length} duplicate vehicle(s).`);
  }
}

// =============================================================================
// Phase 5 — Create / verify all production indexes
// =============================================================================

const INDEX_SPECS = [
  // ─── users ────────────────────────────────────────────────────────────────
  { col: "users", keys: { mobile: 1 }, opts: { unique: true, sparse: true, name: "users_mobile_unique" } },
  { col: "users", keys: { email: 1 },  opts: { unique: true, sparse: true, name: "users_email_unique" } },
  { col: "users", keys: { role: 1 },   opts: { name: "users_role" } },

  // ─── vehicles ─────────────────────────────────────────────────────────────
  { col: "vehicles", keys: { vehicleNumber: 1 }, opts: { unique: true, name: "vehicles_vehicleNumber_unique" } },
  { col: "vehicles", keys: { userId: 1 },        opts: { name: "vehicles_userId" } },
  { col: "vehicles", keys: { status: 1 },        opts: { name: "vehicles_status" } },

  // ─── parking_places ───────────────────────────────────────────────────────
  { col: "parking_places", keys: { isActive: 1 }, opts: { name: "parking_places_isActive" } },

  // ─── parking_slots ────────────────────────────────────────────────────────
  { col: "parking_slots", keys: { parkingPlaceId: 1 },            opts: { name: "parking_slots_placeId" } },
  { col: "parking_slots", keys: { parkingPlaceId: 1, status: 1 }, opts: { name: "parking_slots_placeId_status" } },

  // ─── parking_sessions ─────────────────────────────────────────────────────
  { col: "parking_sessions", keys: { vehicleNumber: 1 },         opts: { name: "sessions_vehicleNumber" } },
  { col: "parking_sessions", keys: { slotId: 1 },                opts: { name: "sessions_slotId" } },
  { col: "parking_sessions", keys: { status: 1 },                opts: { name: "sessions_status" } },
  { col: "parking_sessions", keys: { userId: 1 },                opts: { name: "sessions_userId" } },
  { col: "parking_sessions", keys: { vehicleId: 1 },             opts: { sparse: true, name: "sessions_vehicleId" } },
  { col: "parking_sessions", keys: { parkingPlaceId: 1 },        opts: { name: "sessions_placeId" } },
  { col: "parking_sessions", keys: { entryTime: -1 },            opts: { name: "sessions_entryTime" } },
  { col: "parking_sessions", keys: { status: 1, entryTime: -1 }, opts: { name: "sessions_status_entryTime" } },

  // ─── otps ─────────────────────────────────────────────────────────────────
  { col: "otps", keys: { mobile: 1 },    opts: { name: "otps_mobile" } },
  { col: "otps", keys: { expiresAt: 1 }, opts: { expireAfterSeconds: 0, name: "otps_expiresAt_ttl" } },

  // ─── camera_events ────────────────────────────────────────────────────────
  { col: "camera_events", keys: { plateNumber: 1 }, opts: { name: "camera_events_plate" } },
  { col: "camera_events", keys: { timestamp: -1 },  opts: { name: "camera_events_timestamp" } },
  { col: "camera_events", keys: { sessionId: 1 },   opts: { sparse: true, name: "camera_events_sessionId" } },
  { col: "camera_events", keys: { cameraId: 1 },    opts: { name: "camera_events_cameraId" } },
  { col: "camera_events", keys: { eventType: 1 },   opts: { name: "camera_events_eventType" } },

  // ─── audit_logs ───────────────────────────────────────────────────────────
  { col: "audit_logs", keys: { action: 1 },     opts: { name: "audit_logs_action" } },
  { col: "audit_logs", keys: { entityId: 1 },   opts: { name: "audit_logs_entityId" } },
  { col: "audit_logs", keys: { actorId: 1 },    opts: { name: "audit_logs_actorId" } },
  { col: "audit_logs", keys: { timestamp: -1 }, opts: { name: "audit_logs_timestamp" } },

  // ─── payments ─────────────────────────────────────────────────────────────
  { col: "payments", keys: { sessionId: 1 },  opts: { name: "payments_sessionId" } },
  { col: "payments", keys: { userId: 1 },     opts: { name: "payments_userId" } },
  { col: "payments", keys: { status: 1 },     opts: { name: "payments_status" } },
  { col: "payments", keys: { createdAt: -1 }, opts: { name: "payments_createdAt" } },

  // ─── bookings ─────────────────────────────────────────────────────────────
  { col: "bookings", keys: { userId: 1 },         opts: { name: "bookings_userId" } },
  { col: "bookings", keys: { slotId: 1 },         opts: { name: "bookings_slotId" } },
  { col: "bookings", keys: { status: 1 },         opts: { name: "bookings_status" } },
  { col: "bookings", keys: { scheduledTime: -1 }, opts: { name: "bookings_scheduledTime" } },

  // ─── notifications ────────────────────────────────────────────────────────
  { col: "notifications", keys: { userId: 1, createdAt: -1 }, opts: { name: "notifications_userId_createdAt" } },
  { col: "notifications", keys: { isRead: 1 },                opts: { name: "notifications_isRead" } },

  // ─── security_logs ────────────────────────────────────────────────────────
  { col: "security_logs", keys: { userId: 1 },     opts: { name: "security_logs_userId" } },
  { col: "security_logs", keys: { action: 1 },     opts: { name: "security_logs_action" } },
  { col: "security_logs", keys: { createdAt: -1 }, opts: { name: "security_logs_createdAt" } },
];

async function phase5_createIndexes(db) {
  sep("Phase 5 — Create / verify production indexes");

  if (!EXECUTE) {
    console.log(`  [DRY RUN] Would attempt to create/verify ${INDEX_SPECS.length} indexes.`);
    console.log("  No indexes will be created in dry-run mode.\n");
    INDEX_SPECS.forEach((s) => {
      const flags = [];
      if (s.opts.unique) flags.push("UNIQUE");
      if (s.opts.sparse) flags.push("SPARSE");
      if (s.opts.expireAfterSeconds !== undefined) flags.push("TTL");
      const flagStr = flags.length ? ` [${flags.join(", ")}]` : "";
      console.log(`  • ${s.col}.${Object.keys(s.keys).join("+")}  →  ${s.opts.name}${flagStr}`);
    });
    return;
  }

  console.log(`  Creating ${INDEX_SPECS.length} indexes (idempotent)...\n`);

  let created = 0;
  let alreadyExisted = 0;
  let conflicts = 0;
  let errors = 0;

  for (const spec of INDEX_SPECS) {
    try {
      const result = await db.collection(spec.col).createIndex(spec.keys, spec.opts);
      const flags = [];
      if (spec.opts.unique) flags.push("UNIQUE");
      if (spec.opts.sparse) flags.push("SPARSE");
      if (spec.opts.expireAfterSeconds !== undefined) flags.push("TTL");
      const flagStr = flags.length ? ` [${flags.join(", ")}]` : "";

      if (result === spec.opts.name || result === "ok") {
        console.log(`  ✅ ${spec.opts.name}${flagStr}  (already existed)`);
        alreadyExisted++;
      } else {
        console.log(`  ✅ ${spec.opts.name}${flagStr}  ← CREATED`);
        created++;
      }
      report.indexResults.push({ name: spec.opts.name, status: "ok" });
    } catch (err) {
      const msg = err.message || String(err);

      if (msg.includes("already exists") || msg.includes("IndexKeySpecsConflict") === false && msg.includes("existing index")) {
        console.log(`  ✅ ${spec.opts.name}  (already existed)`);
        alreadyExisted++;
        report.indexResults.push({ name: spec.opts.name, status: "already_existed" });
      } else if (msg.includes("IndexOptionsConflict") || msg.includes("IndexKeySpecsConflict")) {
        console.error(`  ❌ CONFLICT  ${spec.opts.name}: ${msg}`);
        console.error(`     → Drop the conflicting index in MongoDB Atlas or run:`);
        console.error(`       db.${spec.col}.dropIndex("${spec.opts.name}")`);
        conflicts++;
        errors++;
        report.indexResults.push({ name: spec.opts.name, status: "conflict", error: msg });
      } else {
        console.error(`  ❌ ERROR  ${spec.opts.name}: ${msg}`);
        errors++;
        report.indexResults.push({ name: spec.opts.name, status: "error", error: msg });
      }
    }
  }

  console.log(`\n  Summary: ${created} created, ${alreadyExisted} already existed, ${errors} error(s)`);

  if (conflicts > 0) {
    console.error(`\n  ⚠️  ${conflicts} index conflict(s) detected.`);
    console.error("  Resolve by dropping the old conflicting index(es) in Atlas,");
    console.error("  then re-run: node scripts/migrate-and-index.js --execute\n");
  }
}

// =============================================================================
// Phase 6 — Startup validation + final report
// =============================================================================
async function phase6_verifyAndReport(db) {
  sep("Phase 6 — Startup validation + final report");

  // ── Verify critical indexes exist ────────────────────────────────────────
  const criticalChecks = [
    { col: "users",    indexName: "users_mobile_unique",             expectUnique: true },
    { col: "users",    indexName: "users_email_unique",              expectUnique: true },
    { col: "vehicles", indexName: "vehicles_vehicleNumber_unique",   expectUnique: true },
    { col: "otps",     indexName: "otps_expiresAt_ttl",              expectTtl: true },
    { col: "parking_sessions", indexName: "sessions_status_entryTime", expectUnique: false },
  ];

  console.log("  Critical index verification:\n");

  let verifyPass = 0;
  let verifyFail = 0;

  for (const check of criticalChecks) {
    try {
      const indexes = await db.collection(check.col).indexes();
      const found = indexes.find((i) => i.name === check.indexName);

      if (!found) {
        console.log(`  ❌ MISSING   ${check.col} → ${check.indexName}`);
        verifyFail++;
        continue;
      }

      const warnings = [];
      if (check.expectUnique && !found.unique) warnings.push("expected UNIQUE but not set");
      if (check.expectTtl   && found.expireAfterSeconds === undefined) warnings.push("expected TTL but expireAfterSeconds missing");

      if (warnings.length > 0) {
        console.log(`  ⚠️  WARN     ${check.col} → ${check.indexName}  (${warnings.join(", ")})`);
        verifyFail++;
      } else {
        console.log(`  ✅ OK        ${check.col} → ${check.indexName}`);
        verifyPass++;
      }
    } catch (err) {
      console.log(`  ❌ ERROR     ${check.col} → ${check.indexName}: ${err.message}`);
      verifyFail++;
    }
  }

  console.log(`\n  Result: ${verifyPass} passed, ${verifyFail} failed`);

  // ── Collection document counts ───────────────────────────────────────────
  const countTargets = [
    "users", "vehicles", "parking_places", "parking_slots",
    "parking_sessions", "camera_events", "audit_logs", "otps",
    "payments", "bookings", "_archived_users", "_archived_vehicles",
  ];

  console.log("\n  Collection document counts:\n");

  for (const col of countTargets) {
    try {
      const n = await db.collection(col).estimatedDocumentCount();
      console.log(`  ${col.padEnd(24)} : ${n}`);
      report.collectionCounts[col] = n;
    } catch {
      // Collection doesn't exist yet — that's fine
      report.collectionCounts[col] = 0;
    }
  }

  // ── Print machine-readable JSON report ───────────────────────────────────
  sep("Machine-readable migration report (JSON)");

  const finalReport = {
    ...report,
    verification: { passed: verifyPass, failed: verifyFail },
  };

  console.log(JSON.stringify(finalReport, null, 2));

  return verifyFail === 0;
}

// =============================================================================
// Main
// =============================================================================
async function main() {
  const client = new MongoClient(MONGODB_URI);

  sep("Smart Parking — Production DB Migration & Index Enforcement");
  console.log(`  Started : ${new Date().toISOString()}`);
  console.log(`  Mode    : ${EXECUTE ? "EXECUTE (⚠️  writes WILL happen)" : "DRY Run  (read-only)"}`);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    await phase0_preflight(db);
    await phase1_auditUserMobiles(db);
    await phase2_auditInvalidVehicles(db);
    await phase3_auditDuplicateVehicles(db);
    await phase5_createIndexes(db);
    const allVerified = await phase6_verifyAndReport(db);

    sep("Migration complete");
    console.log(`  Finished: ${new Date().toISOString()}`);
    console.log(`  Mode    : ${EXECUTE ? "EXECUTE" : "DRY RUN"}`);

    if (!EXECUTE) {
      console.log("\n  ✅ Dry run complete — no data was changed.");
      console.log("  Review the report above and run with --execute to apply:\n");
      console.log("    node scripts/migrate-and-index.js --execute\n");
    } else if (!allVerified) {
      console.error("\n  ⚠️  Some critical indexes failed verification. See errors above.");
      console.error("  The server can still start but database integrity may be compromised.\n");
      process.exit(1);
    } else {
      console.log("\n  ✅ All cleanup applied and indexes verified.\n");
    }
  } catch (err) {
    console.error("\n❌  Fatal migration error:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();

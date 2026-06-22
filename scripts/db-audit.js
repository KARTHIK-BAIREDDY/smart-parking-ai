/**
 * scripts/db-audit.js
 *
 * Read-only audit: lists all collections, their document counts,
 * and all indexes — including which are UNIQUE, SPARSE, TTL.
 *
 * Also cross-checks that every critical production index exists
 * with the correct properties.
 *
 * Usage:
 *   node scripts/db-audit.js
 *
 * Reads MONGODB_URI from .env.local automatically.
 * No credentials are hardcoded in this file.
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

const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set in .env.local or environment.");
  process.exit(1);
}

const DB_NAME = "smartparking";

// ─── Production index specification ──────────────────────────────────────────
// Single source of truth — matches init-indexes.js and mongo-db.ts
const CRITICAL_INDEXES = [
  { col: "users",            name: "users_mobile_unique",           unique: true,  sparse: true,  ttl: false },
  { col: "users",            name: "users_email_unique",            unique: true,  sparse: true,  ttl: false },
  { col: "vehicles",         name: "vehicles_vehicleNumber_unique", unique: true,  sparse: false, ttl: false },
  { col: "parking_slots",    name: "parking_slots_placeId",         unique: false, sparse: false, ttl: false },
  { col: "parking_slots",    name: "parking_slots_placeId_status",  unique: false, sparse: false, ttl: false },
  { col: "parking_sessions", name: "sessions_vehicleNumber",        unique: false, sparse: false, ttl: false },
  { col: "parking_sessions", name: "sessions_slotId",               unique: false, sparse: false, ttl: false },
  { col: "parking_sessions", name: "sessions_status",               unique: false, sparse: false, ttl: false },
  { col: "parking_sessions", name: "sessions_status_entryTime",     unique: false, sparse: false, ttl: false },
  { col: "otps",             name: "otps_mobile",                   unique: false, sparse: false, ttl: false },
  { col: "otps",             name: "otps_expiresAt_ttl",            unique: false, sparse: false, ttl: true  },
];

function sep(title) {
  const bar = "═".repeat(64);
  console.log(`\n${bar}`);
  if (title) console.log(`  ${title}`);
  console.log(bar);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    sep(`DB Audit — ${DB_NAME}  (${new Date().toISOString()})`);
    console.log("  Connected. Read-only — no changes will be made.\n");

    // ── 1. List all collections with document counts ─────────────────────────
    const allCollections = await db.listCollections().toArray();
    allCollections.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`  Collections (${allCollections.length} total):\n`);
    for (const c of allCollections) {
      const n = await db.collection(c.name).estimatedDocumentCount();
      console.log(`  ${c.name.padEnd(28)} : ${n} document(s)`);
    }

    // ── 2. Indexes per collection ─────────────────────────────────────────────
    sep("Indexes per collection");

    for (const c of allCollections) {
      if (c.name.startsWith("system.")) continue;

      let indexes;
      try {
        indexes = await db.collection(c.name).indexes();
      } catch {
        continue;
      }

      console.log(`\n  ${c.name}`);

      for (const idx of indexes) {
        const flags = [];
        if (idx.unique)                            flags.push("UNIQUE");
        if (idx.sparse)                            flags.push("SPARSE");
        if (idx.expireAfterSeconds !== undefined)  flags.push(`TTL(${idx.expireAfterSeconds}s)`);
        if (idx.background)                        flags.push("BACKGROUND");

        const flagStr = flags.length ? `  [${flags.join(", ")}]` : "";
        const keyStr  = JSON.stringify(idx.key);
        console.log(`    • ${idx.name}${flagStr}`);
        console.log(`      keys: ${keyStr}`);
      }
    }

    // ── 3. Critical index verification ───────────────────────────────────────
    sep("Critical index verification");

    console.log();

    let pass = 0;
    let fail = 0;

    for (const check of CRITICAL_INDEXES) {
      let indexes;
      try {
        indexes = await db.collection(check.col).indexes();
      } catch {
        console.log(`  ❌ COLLECTION MISSING  ${check.col}`);
        fail++;
        continue;
      }

      const found = indexes.find((i) => i.name === check.name);

      if (!found) {
        console.log(`  ❌ MISSING    ${check.col} → ${check.name}`);
        fail++;
        continue;
      }

      const problems = [];
      if (check.unique && !found.unique)                             problems.push("not UNIQUE");
      if (check.sparse && !found.sparse)                             problems.push("not SPARSE");
      if (check.ttl    && found.expireAfterSeconds === undefined)    problems.push("TTL missing");

      if (problems.length > 0) {
        console.log(`  ⚠️  PROPERTY  ${check.col} → ${check.name}  (${problems.join(", ")})`);
        fail++;
      } else {
        console.log(`  ✅ OK         ${check.col} → ${check.name}`);
        pass++;
      }
    }

    console.log(`\n  Result: ${pass}/${CRITICAL_INDEXES.length} passed, ${fail} failed`);

    if (fail > 0) {
      console.log("\n  To create missing indexes, run:");
      console.log("    node scripts/migrate-and-index.js --execute\n");
    }

    // ── 4. Data integrity spot-checks ────────────────────────────────────────
    sep("Data integrity spot-checks");
    console.log();

    // Duplicate mobiles
    const dupMobiles = await db.collection("users").aggregate([
      { $match: { mobile: { $exists: true, $ne: null, $ne: "" } } },
      { $group: { _id: "$mobile", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "total" },
    ]).toArray();
    const nDupMobiles = dupMobiles[0]?.total ?? 0;
    console.log(`  users.mobile duplicates         : ${nDupMobiles === 0 ? "✅ None" : `⚠️  ${nDupMobiles} group(s) — run migrate-and-index.js`}`);

    // Null vehicleNumbers
    const nNullVehicles = await db.collection("vehicles").countDocuments({
      $or: [{ vehicleNumber: null }, { vehicleNumber: "" }, { vehicleNumber: { $exists: false } }],
    });
    console.log(`  vehicles null vehicleNumber     : ${nNullVehicles === 0 ? "✅ None" : `⚠️  ${nNullVehicles} record(s) — run migrate-and-index.js`}`);

    // Duplicate vehicleNumbers
    const dupVehicles = await db.collection("vehicles").aggregate([
      { $match: { vehicleNumber: { $exists: true, $ne: null, $ne: "" } } },
      { $group: { _id: "$vehicleNumber", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "total" },
    ]).toArray();
    const nDupVehicles = dupVehicles[0]?.total ?? 0;
    console.log(`  vehicles.vehicleNumber dupes    : ${nDupVehicles === 0 ? "✅ None" : `⚠️  ${nDupVehicles} group(s) — run migrate-and-index.js`}`);

    // Active sessions without a slotId
    const nBadSessions = await db.collection("parking_sessions").countDocuments({
      status: "active",
      $or: [{ slotId: null }, { slotId: "" }, { slotId: { $exists: false } }],
    });
    console.log(`  active sessions missing slotId  : ${nBadSessions === 0 ? "✅ None" : `⚠️  ${nBadSessions} session(s)`}`);

    sep("Audit complete");
    console.log(`  Finished: ${new Date().toISOString()}\n`);

    if (fail > 0 || nDupMobiles > 0 || nNullVehicles > 0 || nDupVehicles > 0) {
      process.exit(2); // exit 2 = audit issues found (not a crash)
    }
  } catch (err) {
    console.error("❌  Audit failed:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();

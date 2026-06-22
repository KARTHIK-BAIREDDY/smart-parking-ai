/**
 * scripts/repair-data.js
 *
 * One-time data repair before unique indexes can be created.
 * Fixes pre-existing null/duplicate values that prevent index creation.
 *
 * Problems to fix:
 *   1. users.mobile — duplicate value (same mobile on multiple accounts)
 *   2. vehicles.vehicleNumber — null value on some vehicle documents
 *   3. parking_slots.slotNumber — null values prevent unique compound index
 *
 * Run ONCE before init-indexes.js:
 *   node scripts/repair-data.js
 *   node scripts/init-indexes.js
 */

const fs = require("fs");
const path = require("path");

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
  console.error("❌  MONGODB_URI is not set.");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db("smartparking");

    console.log("\n🔧 Running data repair...\n");

    // ─── Fix 1: vehicles with null vehicleNumber ─────────────────────────────
    // These are orphaned/incomplete registrations — safe to delete.
    const nullVehicles = await db
      .collection("vehicles")
      .find({ vehicleNumber: { $in: [null, "", undefined] } })
      .toArray();

    if (nullVehicles.length > 0) {
      console.log(`  Found ${nullVehicles.length} vehicle(s) with null vehicleNumber:`);
      nullVehicles.forEach((v) =>
        console.log(`    • _id=${v._id}, userId=${v.userId}, status=${v.status}`)
      );
      const delResult = await db
        .collection("vehicles")
        .deleteMany({ vehicleNumber: { $in: [null, "", undefined] } });
      console.log(`  ✅ Deleted ${delResult.deletedCount} vehicle(s) with null vehicleNumber.\n`);
    } else {
      console.log("  ✅ No vehicles with null vehicleNumber.\n");
    }

    // ─── Fix 2: parking_slots with null slotNumber ───────────────────────────
    // Slots with null slotNumber are invalid — either repair or drop the
    // unique index on slotNumber. Since slots use slotId (not slotNumber) as
    // the primary key in all API queries, we just won't create that unique
    // index. It's removed from init-indexes.js instead.
    const nullSlots = await db
      .collection("parking_slots")
      .countDocuments({ slotNumber: { $in: [null, undefined] } });

    console.log(
      nullSlots > 0
        ? `  ℹ️  ${nullSlots} parking_slot(s) have null slotNumber — skipping slotNumber unique index (not needed, slotId is the key).\n`
        : "  ✅ No parking_slots with null slotNumber.\n"
    );

    // ─── Fix 3: duplicate users.mobile ───────────────────────────────────────
    // Find all duplicate mobile values and keep only the newest account.
    const pipeline = [
      { $match: { mobile: { $ne: null, $exists: true, $ne: "" } } },
      { $group: { _id: "$mobile", count: { $sum: 1 }, ids: { $push: "$_id" }, latestId: { $last: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ];

    const duplicates = await db.collection("users").aggregate(pipeline).toArray();

    if (duplicates.length > 0) {
      console.log(`  Found ${duplicates.length} duplicate mobile number(s):`);
      let totalRemoved = 0;

      for (const dup of duplicates) {
        // Keep the last created account, remove older duplicates
        const toDelete = dup.ids.filter(
          (id) => id.toString() !== dup.latestId.toString()
        );
        console.log(
          `    • mobile=${dup._id}: ${dup.count} accounts — keeping newest, removing ${toDelete.length}`
        );
        const delResult = await db
          .collection("users")
          .deleteMany({ _id: { $in: toDelete } });
        totalRemoved += delResult.deletedCount;
      }

      console.log(`  ✅ Removed ${totalRemoved} duplicate user account(s).\n`);
    } else {
      console.log("  ✅ No duplicate mobile numbers in users.\n");
    }

    // ─── Fix 4: users with null/empty mobile (make sparse-safe) ─────────────
    const nullMobileCount = await db
      .collection("users")
      .countDocuments({ mobile: { $in: [null, "", undefined] } });

    if (nullMobileCount > 0) {
      // Unset mobile entirely so the sparse unique index skips them
      await db
        .collection("users")
        .updateMany(
          { mobile: { $in: [null, ""] } },
          { $unset: { mobile: "" } }
        );
      console.log(`  ✅ Cleared null/empty mobile on ${nullMobileCount} user(s) (sparse index will skip them).\n`);
    } else {
      console.log("  ✅ No users with null/empty mobile.\n");
    }

    console.log("✅  Data repair complete. You can now run: node scripts/init-indexes.js\n");
  } catch (err) {
    console.error("❌  Repair failed:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();

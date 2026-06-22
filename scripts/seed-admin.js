/**
 * Seed the first super administrator directly in MongoDB.
 *
 * Usage:
 *   MONGODB_URI="mongodb://..." node scripts/seed-admin.js
 *
 * Optional env vars:
 *   ADMIN_EMAIL    (default: admin@autopark.com)
 *   ADMIN_PASSWORD (default: ChangeMe123!)
 *   ADMIN_NAME     (default: System Admin)
 */

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required.");
    process.exit(1);
  }

  const email = (process.env.ADMIN_EMAIL || "admin@autopark.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const name = process.env.ADMIN_NAME || "System Admin";

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("smartparking");

  const existing = await db.collection("users").findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email} (role: ${existing.role})`);
    await client.close();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.collection("users").insertOne({
    id: `superadmin-${Date.now()}`,
    role: "superadmin",
    name,
    email,
    mobile: "",
    phone: "",
    passwordHash,
    createdAt: new Date(),
  });

  console.log(`Super admin created: ${email}`);
  console.log("Change the default password immediately after first login.");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

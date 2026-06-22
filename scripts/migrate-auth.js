const fs = require("fs");
const { MongoClient } = require("mongodb");

function loadEnv() {
  try {
    const content = fs.readFileSync(".env.local", "utf-8");
    content.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  } catch (err) {
    console.log("No .env.local found or error reading it.");
  }
}

async function migrateAuth() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;

  if (!uri) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  if (!superAdminEmail) {
    console.error("SUPER_ADMIN_EMAIL not found in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Connected.");

    const db = client.db("smart-parking");
    const usersCollection = db.collection("users");

    console.log("Deleting all admins and super_admins...");
    const deleteResult = await usersCollection.deleteMany({
      role: { $in: ["admin", "super_admin"] },
    });
    console.log(`Deleted ${deleteResult.deletedCount} old admin accounts.`);

    console.log(`Creating new super_admin for: ${superAdminEmail}`);
    await usersCollection.insertOne({
      email: superAdminEmail.toLowerCase().trim(),
      role: "super_admin",
      createdAt: new Date(),
    });

    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.close();
  }
}

migrateAuth();

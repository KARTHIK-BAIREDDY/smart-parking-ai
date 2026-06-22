const { MongoClient } = require("mongodb");
const fs = require("fs");
const envFile = fs.readFileSync(".env.local", "utf8");
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
});

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("No MONGODB_URI");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  console.log("--- DB AUDIT ---");
  const superAdmins = await db.collection("users").find({ role: "super_admin" }).toArray();
  console.log("Super Admins found:", superAdmins.length);
  superAdmins.forEach(u => console.log(u));

  const admins = await db.collection("users").find({ role: "admin" }).toArray();
  console.log("Admins found:", admins.length);

  await client.close();
}

run().catch(console.error);

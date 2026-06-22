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

async function run() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("smart-parking");
    const users = await db.collection("users").find({}).toArray();
    
    users.forEach(u => {
      console.log(`Email: ${u.email || u.username}, Role: ${u.role}, Status: ${u.status || u.active}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();

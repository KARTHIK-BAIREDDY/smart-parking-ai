import { MongoClient } from "mongodb";
import fs from "fs";

const uri = "mongodb://parkingadmin:KGBmen001@ac-svjokx4-shard-00-00.zjc3tmo.mongodb.net:27017,ac-svjokx4-shard-00-01.zjc3tmo.mongodb.net:27017,ac-svjokx4-shard-00-02.zjc3tmo.mongodb.net:27017/smartparking?ssl=true&replicaSet=atlas-zbedl5-shard-0&authSource=admin";
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db("smartparking");
  
  // Backfill phoneNumber field
  const users = await db.collection("users").find({ phoneNumber: { $exists: false } }).toArray();
  for (const user of users) {
    if (user.mobile) {
      const digitsOnly = user.mobile.replace(/\D/g, "");
      const norm = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      await db.collection("users").updateOne({ _id: user._id }, { $set: { phoneNumber: norm } });
    }
  }
  
  try {
     await db.collection("users").createIndex({ phoneNumber: 1 }, { unique: true, sparse: true, name: "users_phoneNumber_unique" });
     console.log("Index created successfully.");
  } catch (err) {
     console.error("Index creation failed:", err.message);
  }
  
  await client.close();
}

run().catch(console.error);

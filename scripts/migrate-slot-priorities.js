import { MongoClient } from "mongodb";
import fs from "fs";

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db("smartparking");
  
  const slots = await db.collection("parking_slots").find({}).toArray();
  console.log(`Found ${slots.length} slots. Migrating priority...`);
  
  let count = 0;
  for (const slot of slots) {
    if (slot.priority === undefined) {
      // Basic heuristic: Extract digits from slotId, e.g., "A1" -> 1
      const numMatch = slot.slotId?.match(/\d+/);
      const priority = numMatch ? parseInt(numMatch[0], 10) : 999;
      
      await db.collection("parking_slots").updateOne(
        { _id: slot._id },
        { $set: { priority } }
      );
      count++;
    }
  }
  
  console.log(`Migration complete. Updated ${count} slots.`);
  await client.close();
}

run().catch(console.error);

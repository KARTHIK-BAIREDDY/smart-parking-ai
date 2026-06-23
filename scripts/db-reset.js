import { MongoClient } from "mongodb";

// Hardcoded URI for immediate execution
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function resetDatabase() {
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db("smartparking");

    const collectionsToClear = [
      "users",
      "vehicles",
      "parking_places",
      "parking_slots",
      "parking_sessions",
      "camera_events",
      "notification_logs",
      "camera_settings",
      "otps",
      "audit_logs",
      "security_logs",
      "bookings"
    ];

    console.log("Starting database cleanup...");

    for (const collectionName of collectionsToClear) {
      const collection = db.collection(collectionName);
      // We wrap in a try-catch so it won't crash if a collection doesn't exist yet
      try {
        const result = await collection.deleteMany({});
        console.log(`✅ Cleared ${result.deletedCount} documents from '${collectionName}'.`);
      } catch (err) {
        console.log(`⚠️  Could not clear '${collectionName}': ${err.message}`);
      }
    }

    console.log("\nDatabase reset complete! System is now a fresh installation.");
  } catch (error) {
    console.error("\n❌ Database reset failed:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

resetDatabase();

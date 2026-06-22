import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    });
  }
}
loadEnv();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("No MONGODB_URI");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('smartparking');

  const visitor = await db.collection('parking_sessions').find({ isVisitor: true }).sort({ createdAt: -1 }).limit(1).toArray();
  console.log("--- VISITOR SESSION ---");
  console.log(JSON.stringify(visitor, null, 2));

  const regular = await db.collection('parking_sessions').find({ isVisitor: false }).sort({ createdAt: -1 }).limit(1).toArray();
  console.log("\n--- REGULAR SESSION ---");
  console.log(JSON.stringify(regular, null, 2));

  const cameraEvent = await db.collection('camera_events').find().sort({ timestamp: -1 }).limit(1).toArray();
  console.log("\n--- LAST CAMERA EVENT ---");
  console.log(JSON.stringify(cameraEvent, null, 2));

  await client.close();
}

run().catch(console.error);

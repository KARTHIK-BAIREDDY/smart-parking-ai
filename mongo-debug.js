const { MongoClient } = require('mongodb');

async function run() {
  try {
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    await client.connect();
    const db = client.db('smartparking');
    
    console.log("=== USERS ===");
    const users = await db.collection('users').find({}).limit(5).toArray();
    users.forEach(u => console.log(JSON.stringify(u)));

    console.log("\n=== VEHICLES ===");
    const vehicles = await db.collection('vehicles').find({}).limit(5).toArray();
    vehicles.forEach(v => console.log(JSON.stringify(v)));

    await client.close();
  } catch(e) {
    console.error(e);
  }
}
run();

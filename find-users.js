const { MongoClient } = require('mongodb'); 
async function run() { 
  const client = new MongoClient('mongodb://parkingadmin:KGBman007@ac-svjokx4-shard-00-00.zjc3tmo.mongodb.net:27017,ac-svjokx4-shard-00-01.zjc3tmo.mongodb.net:27017,ac-svjokx4-shard-00-02.zjc3tmo.mongodb.net:27017/smartparking?ssl=true&replicaSet=atlas-zbedl5-shard-0&authSource=admin'); 
  await client.connect(); 
  const db = client.db('smartparking'); 
  const result = await db.collection('users').updateOne({ email: 'karthikbaireddy351@gmail.com' }, { $set: { role: 'super_admin' } }); 
  console.log('Updated:', result.modifiedCount); 
  const user = await db.collection('users').findOne({ email: 'karthikbaireddy351@gmail.com' });
  console.log(user);
  await client.close(); 
} 
run().catch(console.dir);

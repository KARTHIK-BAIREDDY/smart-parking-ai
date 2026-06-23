const { MongoClient } = require('mongodb'); 
async function run() { 
  const client = new MongoClient(process.env.MONGODB_URI); 
  await client.connect(); 
  const db = client.db('smartparking'); 
  const result = await db.collection('users').updateOne({ email: 'karthikbaireddy351@gmail.com' }, { $set: { role: 'super_admin' } }); 
  console.log('Updated:', result.modifiedCount); 
  const user = await db.collection('users').findOne({ email: 'karthikbaireddy351@gmail.com' });
  console.log(user);
  await client.close(); 
} 
run().catch(console.dir);

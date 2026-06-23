const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  try {
    const client = new MongoClient('mongodb://parkingadmin:KGBmen001@ac-svjokx4-shard-00-00.zjc3tmo.mongodb.net:27017,ac-svjokx4-shard-00-01.zjc3tmo.mongodb.net:27017,ac-svjokx4-shard-00-02.zjc3tmo.mongodb.net:27017/smartparking?ssl=true&replicaSet=atlas-zbedl5-shard-0&authSource=admin');
    await client.connect();
    const db = client.db('smartparking');

    // Manually add 'name' to the user record for testing purposes
    await db.collection('users').updateOne(
      { _id: new ObjectId('6a37956ce97a30106cdeba56') },
      { $set: { name: "Karthik Baireddy" } }
    );

    console.log("==========================================");
    console.log("1. UPDATED USER RECORD FROM DB");
    console.log("==========================================");
    const user = await db.collection('users').findOne({ _id: new ObjectId('6a37956ce97a30106cdeba56') });
    console.log(JSON.stringify(user, null, 2));

    console.log("\n==========================================");
    console.log("2. VEHICLE RECORD FROM DB");
    console.log("==========================================");
    const vehicle = await db.collection('vehicles').findOne({ userId: "6a37956ce97a30106cdeba56" });
    console.log(JSON.stringify(vehicle, null, 2));

    console.log("\n==========================================");
    console.log("3. API MAPPED RESPONSE (MANAGE VEHICLES)");
    console.log("==========================================");
    const agg = await db.collection('vehicles').aggregate([
      { $match: { userId: "6a37956ce97a30106cdeba56" } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'users',
          let: { vUserId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$id', '$$vUserId'] },
                    { $eq: [{ $toString: '$_id' }, '$$vUserId'] }
                  ]
                }
              }
            }
          ],
          as: 'ownerDetails'
        }
      },
      {
        $unwind: { path: '$ownerDetails', preserveNullAndEmptyArrays: true }
      }
    ]).toArray();

    const cleanedVehicles = agg.map((v) => ({
      ...v,
      status: v.status || v.approvalStatus,
      verificationStatus: v.status || "pending_verification",
      ownerName: v.ownerDetails?.name || v.ownerDetails?.fullName || v.ownerDetails?.username || v.ownerDetails?.profile?.name || "Unknown",
      ownerMobile: v.ownerDetails?.phone || v.ownerDetails?.mobile || v.ownerDetails?.phoneNumber || "Unknown",
      ownerDetails: undefined,
    }));

    console.log(JSON.stringify(cleanedVehicles[0], null, 2));

    await client.close();
  } catch(e) {
    console.error(e);
  }
}
run();

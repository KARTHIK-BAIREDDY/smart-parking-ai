import { getDatabase } from "@/lib/mongo-db";
import { RegisteredVehiclesClient } from "./ClientPage";

export const dynamic = "force-dynamic";

export default async function RegisteredVehiclesPage() {
  const db = await getDatabase();
  
  // Fetch vehicles and lookup owner details
  const vehiclesCursor = db.collection("vehicles").aggregate([
    {
      $lookup: {
        from: "users",
        let: { vUserId: "$userId" },
        pipeline: [
          { 
            $match: { 
              $expr: { 
                $or: [
                  { $eq: ["$id", "$$vUserId"] },
                  { $eq: [{ $toString: "$_id" }, "$$vUserId"] }
                ]
              } 
            } 
          }
        ],
        as: "owner"
      }
    },
    {
      $unwind: { path: "$owner", preserveNullAndEmptyArrays: true }
    },
    {
      $lookup: {
        from: "parking_sessions",
        let: { vehicleNo: "$number" },
        pipeline: [
          { $match: { $expr: { $and: [ { $eq: ["$vehicleNumber", "$$vehicleNo"] }, { $eq: ["$status", "active"] } ] } } }
        ],
        as: "activeSession"
      }
    },
    {
      $unwind: { path: "$activeSession", preserveNullAndEmptyArrays: true }
    }
  ]);
  
  const vehicles = await vehiclesCursor.toArray();
  
  const formattedVehicles = vehicles.map(v => {
    return {
      id: v._id.toString(),
      number: v.number || v.vehicleNumber || v.plateNumber || "-",
      type: v.type || v.vehicleType || "CAR",
      ownerName: v.owner?.name || v.owner?.fullName || v.owner?.username || v.owner?.profile?.name || "-",
      ownerPhone: v.owner?.phone || v.owner?.mobile || v.owner?.phoneNumber || "-",
      status: v.activeSession ? "Parked" : "Not Parked",
      assignedSlot: v.activeSession?.slotId || null,
      location: v.activeSession?.placeName || null,
      registrationDate: v.createdAt ? v.createdAt.toISOString() : null
    };
  });

  return <RegisteredVehiclesClient initialVehicles={formattedVehicles} />;
}

import { getDatabase } from "@/lib/mongo-db";
import { RegisteredUsersClient } from "./ClientPage";

export const dynamic = "force-dynamic";

export default async function RegisteredUsersPage() {
  const db = await getDatabase();
  
  // Fetch users from DB
  const usersCursor = db.collection("users").find({ role: { $nin: ["admin", "super_admin", "operator"] } });
  const users = await usersCursor.toArray();
  
  // Count vehicles and sessions for all users in parallel
  const userStats = await Promise.all(
    users.map(async (u) => {
      // The user ID stored in vehicles/sessions is often the string `u.id` or `u.userId`, 
      // rather than the MongoDB ObjectId string representation. Let's try both to be safe.
      const uidObj = u._id.toString();
      const uIdString = u.id || u.userId || uidObj;

      const [vehiclesList, activeSessionsList] = await Promise.all([
        db.collection("vehicles").find({ $or: [{ userId: uidObj }, { userId: uIdString }] }).toArray(),
        db.collection("parking_sessions").find({ $or: [{ userId: uidObj }, { userId: uIdString }], status: "active" }).toArray()
      ]);

      const vehicleDetails = vehiclesList.map(v => {
        const session = activeSessionsList.find(s => s.vehicleNumber === v.vehicleNumber);
        return {
          id: v.id || v._id.toString(),
          vehicleNumber: v.vehicleNumber,
          vehicleType: v.vehicleType || "Unknown",
          status: v.status || v.approvalStatus || "pending",
          assignedSlot: session ? session.slotId : null,
          registrationDate: v.createdAt ? new Date(v.createdAt).toISOString() : null
        };
      });

      return {
        id: uIdString,
        name: u.name || u.fullName || u.username || u?.profile?.name || "Unknown User",
        phone: u.phone || u.mobile || u.phoneNumber || "-",
        role: u.role || "user",
        registeredVehicles: vehiclesList.length,
        activeSessions: activeSessionsList.length,
        status: u.isActive === false ? "Suspended" : "Active",
        vehicles: vehicleDetails
      };
    })
  );

  return <RegisteredUsersClient initialUsers={userStats} />;
}

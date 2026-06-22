import { getDatabase } from "@/lib/mongo-db";

export interface AuditLogData {
  action: string;
  userId: string;
  details: string;
  timestamp?: Date;
}

export async function insertAuditLog(data: AuditLogData) {
  try {
    const db = await getDatabase();
    await db.collection("audit_logs").insertOne({
      action: data.action,
      userId: data.userId,
      details: data.details,
      timestamp: data.timestamp || new Date(),
    });
  } catch (error) {
    console.error("Failed to insert audit log", error);
  }
}

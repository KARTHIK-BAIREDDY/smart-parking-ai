import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";
import { writeAuditLog } from "@/lib/audit-logger";
import { enqueueNotification } from "@/lib/sms/notification-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Reason is required for manual overrides" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // We must use a transaction to safely force-close and release the slot
    const client = db.client;
    const session = client.startSession();

    let resultMsg = "";

    try {
      await session.withTransaction(async () => {
        const parkingSession = await db.collection("parking_sessions").findOne(
          { sessionId: id, status: "active" },
          { session }
        );

        if (!parkingSession) {
          throw new Error("Active session not found");
        }

        const now = new Date();
        const durationMinutes = Math.floor((now.getTime() - new Date(parkingSession.entryTime).getTime()) / 60000);

        // 1. Close the session
        await db.collection("parking_sessions").updateOne(
          { sessionId: id },
          { 
            $set: { 
              status: "completed", 
              exitTime: now, 
              durationMinutes,
              forceClosed: true,
              forceClosedReason: reason,
              forceClosedBy: auth.user?.userId || "admin"
            } 
          },
          { session }
        );

        // 2. Release the slot
        if (parkingSession.slotId) {
          await db.collection("parking_slots").updateOne(
            { slotId: parkingSession.slotId },
            { $set: { status: "available" } },
            { session }
          );
        }

        // 3. Audit Log
        await writeAuditLog({
          actorId: auth.user?.userId || "admin",
          actorRole: auth.user?.role || "admin",
          action: "ADMIN_FORCE_CLOSE" as any,
          entityType: "parking_session" as any,
          entityId: id,
          metadata: {
            reason,
            slotId: parkingSession.slotId,
            vehicleNumber: parkingSession.vehicleNumber
          }
        });

        resultMsg = "Session forcefully closed and slot released";
      });
    } finally {
      await session.endSession();
    }

    if (resultMsg) {
      // Find user phone to send SMS if applicable
      try {
        const parkingSession = await db.collection("parking_sessions").findOne({ sessionId: id });
        if (parkingSession && parkingSession.userId) {
          const owner = await db.collection("users").findOne({ _id: new ObjectId(parkingSession.userId) });
          if (owner?.phone || owner?.mobile) {
            await enqueueNotification({
              phoneNumber: owner.phone || owner.mobile,
              eventType: "MANUAL_OVERRIDE",
              metadata: {
                vehicleNumber: parkingSession.vehicleNumber,
                action: "closed" as any,
                reason
              }
            });
          }
        }
      } catch (err) {
        console.error("[force-close] Failed to queue SMS:", err);
      }
    }

    return NextResponse.json({ success: true, message: resultMsg });

  } catch (error: any) {
    console.error("POST /api/admin/sessions/[id]/force-close error:", error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) }, 
      { status: 500 }
    );
  }
}

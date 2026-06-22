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
    const { id: oldSlotId } = await params;
    const body = await request.json();
    const { reason, newSlotId, sessionId } = body;

    if (!reason || reason.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Reason is required for manual overrides" },
        { status: 400 }
      );
    }
    
    if (!newSlotId || !sessionId) {
      return NextResponse.json(
        { success: false, error: "newSlotId and sessionId are required" },
        { status: 400 }
      );
    }

    if (oldSlotId === newSlotId) {
      return NextResponse.json(
        { success: false, error: "New slot must be different from old slot" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const client = db.client;
    const session = client.startSession();

    let resultMsg = "";

    try {
      await session.withTransaction(async () => {
        // 1. Verify session exists and is active
        const parkingSession = await db.collection("parking_sessions").findOne(
          { sessionId, status: "active" },
          { session }
        );

        if (!parkingSession) {
          throw new Error("Active session not found");
        }
        
        if (parkingSession.slotId !== oldSlotId) {
          throw new Error(`Session is currently assigned to ${parkingSession.slotId}, not ${oldSlotId}`);
        }

        // 2. Verify new slot is available
        const newSlot = await db.collection("parking_slots").findOne(
          { slotId: newSlotId },
          { session }
        );

        if (!newSlot) {
          throw new Error("New slot not found");
        }

        if (newSlot.status !== "available") {
          throw new Error("New slot is not available");
        }

        // 3. Update old slot to available
        await db.collection("parking_slots").updateOne(
          { slotId: oldSlotId },
          { $set: { status: "available" } },
          { session }
        );

        // 4. Update new slot to occupied
        await db.collection("parking_slots").updateOne(
          { slotId: newSlotId },
          { $set: { status: "occupied" } },
          { session }
        );

        // 5. Update session with new slot ID
        await db.collection("parking_sessions").updateOne(
          { sessionId },
          { 
            $set: { 
              slotId: newSlotId,
              reassigned: true,
              reassignedReason: reason,
              reassignedBy: auth.user?.userId || "admin"
            } 
          },
          { session }
        );

        // 6. Audit log
        await writeAuditLog({
          actorId: auth.user?.userId || "admin",
          actorRole: auth.user?.role || "admin",
          action: "ADMIN_SLOT_REASSIGN" as any,
          entityType: "parking_session" as any,
          entityId: sessionId,
          metadata: {
            reason,
            oldSlotId,
            newSlotId,
            vehicleNumber: parkingSession.vehicleNumber
          }
        });

        resultMsg = `Vehicle reassigned from ${oldSlotId} to ${newSlotId} successfully`;
      });
    } finally {
      await session.endSession();
    }

    if (resultMsg) {
      try {
        const parkingSession = await db.collection("parking_sessions").findOne({ sessionId });
        if (parkingSession && parkingSession.userId) {
          const owner = await db.collection("users").findOne({ _id: new ObjectId(parkingSession.userId) });
          if (owner?.phone || owner?.mobile) {
            await enqueueNotification({
              phoneNumber: owner.phone || owner.mobile,
              eventType: "MANUAL_OVERRIDE",
              metadata: {
                vehicleNumber: parkingSession.vehicleNumber,
                action: `reassigned to ${newSlotId}`,
                reason
              }
            });
          }
        }
      } catch (err) {
        console.error("[reassign] Failed to queue SMS:", err);
      }
    }

    return NextResponse.json({ success: true, message: resultMsg });

  } catch (error: any) {
    console.error("POST /api/admin/slots/[id]/reassign error:", error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) }, 
      { status: 500 }
    );
  }
}

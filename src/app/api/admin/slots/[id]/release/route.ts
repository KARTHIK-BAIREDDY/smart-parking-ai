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
    
    const client = db.client;
    const session = client.startSession();

    let resultMsg = "";

    try {
      await session.withTransaction(async () => {
        const slot = await db.collection("parking_slots").findOne({ slotId: id }, { session });

        if (!slot) {
          throw new Error("Slot not found");
        }

        // We forcefully set it to available
        await db.collection("parking_slots").updateOne(
          { slotId: id },
          { $set: { status: "available" } },
          { session }
        );

        // Also we must close any session that is currently occupying it
        const parkingSession = await db.collection("parking_sessions").findOne(
          { slotId: id, status: "active" },
          { session }
        );

        if (parkingSession) {
          const now = new Date();
          const durationMinutes = Math.floor((now.getTime() - new Date(parkingSession.entryTime).getTime()) / 60000);

          await db.collection("parking_sessions").updateOne(
            { _id: parkingSession._id },
            { 
              $set: { 
                status: "completed", 
                exitTime: now, 
                durationMinutes,
                forceClosed: true,
                forceClosedReason: `Slot ${id} released manually: ${reason}`,
                forceClosedBy: auth.user?.userId || "admin"
              } 
            },
            { session }
          );
        }

        // Audit Log
        await writeAuditLog({
          actorId: auth.user?.userId || "admin",
          actorRole: auth.user?.role || "admin",
          action: "ADMIN_SLOT_RELEASE" as any,
          entityType: "parking_slot" as any,
          entityId: id,
          metadata: {
            reason,
            slotId: id,
            affectedSessionId: parkingSession ? parkingSession.sessionId : null
          }
        });

        resultMsg = "Slot forcefully released" + (parkingSession ? " and orphan session closed." : ".");
      });
    } finally {
      await session.endSession();
    }

    if (resultMsg.includes("orphan session closed")) {
      try {
        const parkingSession = await db.collection("parking_sessions").findOne({ slotId: id, forceClosed: true }, { sort: { exitTime: -1 } });
        if (parkingSession && parkingSession.userId) {
          const owner = await db.collection("users").findOne({ _id: new ObjectId(parkingSession.userId) });
          if (owner?.phone || owner?.mobile) {
            await enqueueNotification({
              phoneNumber: owner.phone || owner.mobile,
              eventType: "MANUAL_OVERRIDE",
              metadata: {
                vehicleNumber: parkingSession.vehicleNumber,
                action: `cleared from slot ${id}`,
                reason
              }
            });
          }
        }
      } catch (err) {
        console.error("[release] Failed to queue SMS:", err);
      }
    }

    return NextResponse.json({ success: true, message: resultMsg });

  } catch (error: any) {
    console.error("POST /api/admin/slots/[id]/release error:", error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) }, 
      { status: 500 }
    );
  }
}

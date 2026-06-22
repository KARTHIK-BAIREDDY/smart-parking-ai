// ---------------------------------------------------------------------------
// GET  /api/assignments  — backward-compatible read proxy → parking_sessions
// PUT  /api/assignments  — backward-compatible checkout proxy → parking_sessions
// POST /api/assignments  — RETIRED (returns 410 Gone)
//
// The `assignments` MongoDB collection is no longer written to.
// All parking activity lives in `parking_sessions`.
// Existing consumers (my-parking, history, reports pages) continue to work
// because the response shape matches what they expect.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAuth } from "@/lib/auth-server";
import { isAdminRole } from "@/lib/auth-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();

    // Admins see all sessions; users see only their own
    const query = isAdminRole(auth.user.role)
      ? {}
      : { userId: auth.user.userId };

    const sessions = await db
      .collection("parking_sessions")
      .find(query)
      .sort({ entryTime: -1 })
      .toArray();

    // Map parking_sessions fields to the shape the legacy UI expects
    const mapped = sessions.map((s) => ({
      id: s.sessionId ?? s.id ?? s._id.toString(),
      userId: s.userId,
      parkingPlaceId: s.parkingPlaceId,
      slotId: s.slotId,
      vehicleNumber: s.vehicleNumber ?? null,
      vehicleType: s.vehicleType ?? null,
      entryTime: s.entryTime,
      exitTime: s.exitTime ?? null,
      durationMinutes: s.durationMinutes ?? null,
      status: s.status,
      isVisitor: s.isVisitor ?? false,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST is retired — slot creation now exclusively via POST /api/slots/assign
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is retired. Use POST /api/slots/assign for camera-triggered slot assignment.",
    },
    { status: 410 }
  );
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { assignmentId, exitTime, status } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required." }, { status: 400 });
    }

    const db = await getDatabase();

    // Look up by sessionId (new field) or legacy id field
    const session = await db.collection("parking_sessions").findOne({
      $or: [{ sessionId: assignmentId }, { id: assignmentId }],
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Non-admins can only checkout their own session
    if (!isAdminRole(auth.user.role) && session.userId !== auth.user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedExitTime = exitTime ? new Date(exitTime) : new Date();
    const entryTime = session.entryTime ? new Date(session.entryTime) : resolvedExitTime;
    const durationMinutes = Math.max(
      0,
      Math.round((resolvedExitTime.getTime() - entryTime.getTime()) / 60_000)
    );

    await db.collection("parking_sessions").updateOne(
      { _id: session._id },
      {
        $set: {
          exitTime: resolvedExitTime,
          durationMinutes,
          status: status || "completed",
          updatedAt: new Date(),
        },
      }
    );

    // Free the slot
    if (session.slotId && session.parkingPlaceId) {
      await db.collection("parking_slots").updateOne(
        { slotId: session.slotId, parkingPlaceId: session.parkingPlaceId },
        {
          $set: {
            status: "available",
            vehicleId: null,
            vehicleType: null,
            entryTime: null,
          },
        }
      );
    }

    if (session.userId) {
      try {
        const { notificationService } = require("@/lib/notification-service");
        notificationService.createNotification(
          session.userId,
          "Vehicle Exit",
          `Your vehicle ${session.vehicleNumber || ""} has exited. Duration: ${durationMinutes} mins.`,
          "success"
        );
      } catch (err) {
        console.error("[assignments] Failed to create in-app notification:", err);
      }
    }

    return NextResponse.json({ success: true, durationMinutes });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

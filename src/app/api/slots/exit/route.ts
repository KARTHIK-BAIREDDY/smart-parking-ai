import { logger } from "@/lib/logger";
import { rateLimiter } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongo-db";
import { requireCameraOrAdmin } from "@/lib/camera-auth";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
  const auth = await requireCameraOrAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const allowed = await rateLimiter.check(50, ip);
  if (!allowed) {
    return NextResponse.json({ success: false, error: "Too Many Requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const {
      vehicleId,    // plate number from OCR
      placeId,
      confidence = 0,
      cameraId = "unknown",
      imagePath = null,
    } = body as any;

    if (!vehicleId || !placeId) {
      return NextResponse.json(
        { success: false, error: "vehicleId (license plate) and placeId are required." },
        { status: 400 }
      );
    }

    // Normalization: Uppercase, remove spaces, hyphens, and special chars
    const normalizedPlate = vehicleId.toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    if (!normalizedPlate) {
      return NextResponse.json(
        { success: false, error: "License plate is empty after normalization. Cannot proceed." },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // 0. Duplicate Detection (30 second cooldown)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const recentEvent = await db.collection("camera_events").findOne({
      cameraId,
      vehicleNumber: normalizedPlate,
      eventType: "EXIT",
      timestamp: { $gte: thirtySecondsAgo }
    });

    if (recentEvent) {
      logger.info(`[exit] Duplicate exit detected for ${normalizedPlate} on ${cameraId}. Ignoring.`);
      return NextResponse.json(
        { success: false, error: "Duplicate detection ignored", action: "debounced" },
        { status: 200 }
      );
    }

    // 1. Find the active parking session
    const sessionDoc = await db.collection("parking_sessions").findOne({
      vehicleNumber: normalizedPlate,
      parkingPlaceId: placeId,
      status: "active",
    });

    if (!sessionDoc) {
      return NextResponse.json(
        { success: false, error: "No active parking session found for this vehicle at this location" },
        { status: 404 }
      );
    }

    const exitTime = new Date();
    const entryTime = new Date(sessionDoc.entryTime);
    const durationMs = exitTime.getTime() - entryTime.getTime();
    const durationMinutes = Math.ceil(durationMs / 60_000); // round up to nearest minute

    const notificationMessage = `Vehicle ${normalizedPlate} has successfully exited Slot ${sessionDoc.slotId}. Duration: ${durationMinutes} mins.`;

    // 2. ATOMIC TRANSACTION
    const client = await clientPromise;
    const mongoSession = client.startSession();
    
    try {
      await mongoSession.withTransaction(async () => {
        // Complete session
        const sessionUpdate = await db.collection("parking_sessions").updateOne(
          { _id: sessionDoc._id, status: "active" }, // guard
          {
            $set: {
              exitTime,
              durationMinutes,
              status: "completed",
              updatedAt: exitTime,
            },
          },
          { session: mongoSession }
        );

        if (sessionUpdate.modifiedCount === 0) {
          throw new Error("Conflict");
        }

        // Release slot
        await db.collection("parking_slots").updateOne(
          {
            slotId: sessionDoc.slotId,
            parkingPlaceId: placeId,
          },
          {
            $set: {
              status: "available",
              vehicleId: null,
              vehicleType: null,
              entryTime: null,
            },
          },
          { session: mongoSession }
        );

        // Create camera event
        await db.collection("camera_events").insertOne({
          cameraId,
          cameraType: "exit",
          vehicleNumber: normalizedPlate,
          plateNumber: normalizedPlate,
          confidence,
          eventType: "EXIT",
          parkingPlaceId: placeId,
          imageUrl: imagePath,
          timestamp: exitTime,
          sessionId: sessionDoc.sessionId,
        }, { session: mongoSession });

        // Create notification log
        if (sessionDoc.userId) {
          await db.collection("notification_logs").insertOne({
            userId: sessionDoc.userId,
            vehicleNumber: normalizedPlate,
            slotNumber: sessionDoc.slotId,
            type: "EXIT",
            message: notificationMessage,
            delivered: false,
            timestamp: exitTime
          }, { session: mongoSession });
        }
      });
    } catch (error: any) {
      if (error.message.includes("Conflict")) {
         return NextResponse.json(
          { success: false, error: "Session already closed." },
          { status: 409 }
        );
      }
      throw error;
    } finally {
      await mongoSession.endSession();
    }

    logger.info(`[exit] Slot released successfully for ${normalizedPlate} from ${sessionDoc.slotId}`);

    // Asynchronous processing (non-blocking) - In-app notification & SMS
    let ownerNotified = false;
    if (sessionDoc.userId) {
      try {
        const { notificationService } = require("@/lib/notification-service");
        notificationService.createNotification(
          sessionDoc.userId,
          "Vehicle Exit",
          notificationMessage,
          "success"
        ).catch(() => {});
      } catch (err) {}

      try {
        const owner = await db.collection("users").findOne({ _id: new ObjectId(sessionDoc.userId) });
        if (owner && (owner.phone || owner.mobile)) {
          const { enqueueNotification } = require("@/lib/sms/notification-service");
          enqueueNotification({
            phoneNumber: owner.phone || owner.mobile,
            eventType: "EXIT_COMPLETED",
            metadata: { durationMinutes }
          });
          ownerNotified = true;
          db.collection("notification_logs").updateOne(
            { userId: sessionDoc.userId, vehicleNumber: normalizedPlate, timestamp: exitTime },
            { $set: { delivered: true } }
          ).catch(() => {});
        }
      } catch (smsError) {
        console.error("[exit] SMS notification failed:", smsError);
      }
    }

    const response = {
      success: true,
      sessionId: sessionDoc.sessionId,
      vehicleNumber: normalizedPlate,
      slotId: sessionDoc.slotId,
      parkingPlaceId: placeId,
      placeName: sessionDoc.placeName ?? placeId,
      entryTime: entryTime.toISOString(),
      exitTime: exitTime.toISOString(),
      durationMinutes,
      ownerNotified,
    };

    return NextResponse.json(response, { status: 200 });
  } catch(err: any) {
    logger.error("POST /api/slots/exit ERROR:", err as Error, { component: "ExitAPI" });
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

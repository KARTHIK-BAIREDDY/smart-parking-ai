import { logger } from "@/lib/logger";
import { rateLimiter } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireCameraOrAdmin } from "@/lib/camera-auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
    let {
      vehicleId,    // plate number from OCR
      placeId,
      vehicleType = "Car",
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
      eventType: "ENTRY",
      timestamp: { $gte: thirtySecondsAgo }
    });

    if (recentEvent) {
      logger.info(`[assign] Duplicate entry detected for ${normalizedPlate} on ${cameraId}. Ignoring.`);
      return NextResponse.json(
        { success: false, error: "Duplicate detection ignored", action: "debounced" },
        { status: 200 }
      );
    }

    // 1. Verify place exists
    let place = await db.collection("parking_places").findOne({ id: placeId });
    if (!place) {
      const allPlaces = await db.collection("parking_places").find({}).toArray();
      console.log("Available parking places:", allPlaces);
      console.log("Requested place:", placeId);

      if (allPlaces.length === 1) {
        place = allPlaces[0];
        placeId = place.id; // Update placeId so downstream queries use the correct one
        console.log(`Automatically fallback to only available parking place: ${placeId}`);
      } else {
        return NextResponse.json(
          { success: false, error: "Parking place not found" },
          { status: 404 }
        );
      }
    }
    const placeName = place.name || placeId;

    // 2. Exact match in registered vehicles
    console.log("OCR PLATE:", vehicleId);
    console.log("NORMALIZED PLATE:", normalizedPlate);

    const vehicleRecord = await db.collection("vehicles").findOne({
      vehicleNumber: normalizedPlate,
    });

    console.log("VEHICLE FOUND:", vehicleRecord);

    if (vehicleRecord) {
      console.log("VEHICLE ID:", vehicleRecord._id);
      console.log("APPROVED:", vehicleRecord.approved);
      console.log("VEHICLE STATUS:", vehicleRecord.status);
      console.log("USER ID:", vehicleRecord.userId);
    }

    if (!vehicleRecord) {
      logger.info(`[assign] Vehicle Not Registered: ${normalizedPlate}`);
      return NextResponse.json(
        { success: false, error: "Vehicle Not Registered" },
        { status: 403 }
      );
    }

    // 3. User verification
    if (!vehicleRecord.userId) {
      return NextResponse.json(
        { success: false, error: "Vehicle has no associated user account" },
        { status: 403 }
      );
    }

    let userRecord = null;
    try {
      userRecord = await db.collection("users").findOne({
        _id: new ObjectId(vehicleRecord.userId)
      });
    } catch (err) {
      console.error("Invalid userId format", vehicleRecord.userId);
    }
    
    console.log("USER RECORD:", userRecord);

    if (userRecord) {
      console.log("USER ACTIVE (isActive):", userRecord.isActive);
      console.log("USER STATUS (status):", userRecord.status);
      console.log("USER ROLE:", userRecord.role);
    }

    console.log({
      plate: normalizedPlate,
      vehicleFound: !!vehicleRecord,
      approved: vehicleRecord?.approved,
      vehicleStatus: vehicleRecord?.status,
      userFound: !!userRecord,
      userActive: userRecord?.isActive,
      userStatus: userRecord?.status
    });

    // If neither status nor isActive exists, treat an existing user account as active.
    const isExplicitlyInactive = userRecord && (
      (userRecord.status !== undefined && userRecord.status !== "active") ||
      (userRecord.isActive === false)
    );

    if (!userRecord || isExplicitlyInactive) {
      return NextResponse.json(
        { success: false, error: "Invalid or inactive user account" },
        { status: 403 }
      );
    }

    // 4. Active Session check
    console.log("OCR_RESULT_BEFORE_DB:", normalizedPlate);
    const activeSession = await db.collection("parking_sessions").findOne({
      vehicleNumber: normalizedPlate,
      status: "active"
    });
    console.log("DB_MATCH_FOUND:", !!activeSession);
    console.log("DB_SESSION_PLATE:", activeSession ? activeSession.vehicleNumber : null);

    if (activeSession) {
      return NextResponse.json(
        { success: false, error: "Vehicle already has an active parking session" },
        { status: 409 }
      );
    }

    // 5. Find available slot (lowest priority)
    const typeUpper = vehicleType.toUpperCase();
    let targetRow = "A"; 
    if (["MOTORCYCLE", "BIKE"].includes(typeUpper)) targetRow = "B";
    else if (["BUS", "TRUCK", "HEAVY"].includes(typeUpper)) targetRow = "C";

    const targetSlot = await db.collection("parking_slots")
      .find({ 
        parkingPlaceId: placeId, 
        status: "available",
        slotId: { $regex: `^${targetRow}` }
      })
      .sort({ priority: 1, slotId: 1 })
      .limit(1)
      .toArray()
      .then(res => res[0]);

    if (!targetSlot) {
      return NextResponse.json(
        { success: false, error: "WAITING_FOR_SLOT" },
        { status: 409 }
      );
    }

    const entryTime = new Date();
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const notificationMessage = `Welcome ${userRecord.name || 'User'}. Vehicle ${normalizedPlate} has been assigned Slot ${targetSlot.slotId}.`;

    // 6. ATOMIC TRANSACTION
    const client = await clientPromise;
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        // Mark slot occupied
        const updateResult = await db.collection("parking_slots").updateOne(
          { _id: targetSlot._id, status: "available" },
          {
            $set: {
              status: "occupied",
              vehicleId: normalizedPlate,
              vehicleType,
              entryTime,
            },
          },
          { session }
        );

        if (updateResult.modifiedCount === 0) {
          throw new Error("Conflict");
        }

        // Create parking session
        await db.collection("parking_sessions").insertOne({
          sessionId,
          userId: vehicleRecord.userId,
          vehicleId: vehicleRecord.id || vehicleRecord._id,
          vehicleNumber: normalizedPlate,
          vehicleType,
          parkingPlaceId: placeId,
          placeName,
          slotId: targetSlot.slotId,
          slotDbId: targetSlot._id?.toString(),
          slotType: targetSlot.slotType || "regular",
          isVisitor: false,
          confidence,
          entryTime,
          exitTime: null,
          durationMinutes: null,
          amountDue: null,
          status: "active",
          createdAt: entryTime,
          updatedAt: entryTime,
        }, { session });

        // Create camera event
        await db.collection("camera_events").insertOne({
          cameraId,
          cameraType: "entry",
          vehicleNumber: normalizedPlate,
          plateNumber: normalizedPlate, // for backward compatibility
          confidence,
          eventType: "ENTRY",
          parkingPlaceId: placeId,
          imageUrl: imagePath,
          timestamp: entryTime,
          sessionId,
        }, { session });

        // Create notification log
        await db.collection("notification_logs").insertOne({
          userId: vehicleRecord.userId,
          vehicleNumber: normalizedPlate,
          slotNumber: targetSlot.slotId,
          type: "ENTRY",
          message: notificationMessage,
          delivered: false,
          timestamp: entryTime
        }, { session });
      });
    } catch (error: any) {
      if (error.message.includes("Conflict") || error.message.includes("E11000")) {
        return NextResponse.json(
          { success: false, error: "Slot was already claimed or duplicate session exists" },
          { status: 409 }
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }

    logger.info(`[assign] Slot assigned successfully for ${normalizedPlate} at ${targetSlot.slotId}`);

    // Asynchronous processing (non-blocking) - In-app notification & SMS
    try {
      const { notificationService } = require("@/lib/notification-service");
      notificationService.createNotification(
        vehicleRecord.userId,
        "Slot Assigned",
        notificationMessage,
        "success"
      ).catch(() => {});
    } catch (e) {}

    if (userRecord.phone || userRecord.mobile) {
       try {
         const { enqueueNotification } = require("@/lib/sms/notification-service");
         enqueueNotification({
            phoneNumber: userRecord.phone || userRecord.mobile,
            eventType: "ENTRY_ASSIGNED",
            metadata: { placeName, slotId: targetSlot.slotId, vehicleNumber: normalizedPlate }
         });
         db.collection("notification_logs").updateOne(
            { userId: vehicleRecord.userId, vehicleNumber: normalizedPlate, timestamp: entryTime },
            { $set: { delivered: true } }
         ).catch(() => {});
       } catch (e) {
         console.error(e);
       }
    }

    const response = {
      success: true,
      slotId: targetSlot.slotId,
      vehicleNumber: normalizedPlate,
      confidence,
      vehicleType,
      placeName,
      parkingPlaceId: placeId,
      entryTime: entryTime.toISOString(),
      ownerNotified: true,
      sessionId,
      status: "active",
    };

    console.log("FINAL_RESPONSE_PLATE:", response.vehicleNumber);
    return NextResponse.json(response, { status: 201 });
  } catch(err: any) {
    logger.error("POST /api/slots/assign ERROR:", err as Error, { component: "AssignAPI" });
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

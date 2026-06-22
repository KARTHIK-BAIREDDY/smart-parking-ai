// ---------------------------------------------------------------------------
// Camera Event Logger
// Every detection by any camera must produce a record in `camera_events`.
// This provides a complete, immutable audit trail of all physical detections
// independent of whether a parking session was created.
//
// Schema:
//   cameraId        — identifier of the camera/device that made the detection
//   plateNumber     — raw plate text as detected (may be "UNKNOWN")
//   confidence      — OCR/ANPR confidence score 0–100
//   imagePath       — optional stored image/frame path (null if not captured)
//   eventType       — "entry" | "exit" | "unknown"
//   parkingPlaceId  — the parking place where the event occurred
//   vehicleId       — FK to vehicles.id (null for unregistered vehicles)
//   timestamp       — server-side UTC detection timestamp
//   sessionId       — linked parking_session id (null until session is created)
//   processedAt     — when the event was linked to a session (null until linked)
// ---------------------------------------------------------------------------

import { getDatabase } from "@/lib/mongo-db";

export type CameraEventType = "entry" | "exit" | "unknown";

export interface CameraEventPayload {
  cameraId: string;
  plateNumber: string;
  confidence: number;
  imagePath?: string | null;
  eventType: CameraEventType;
  parkingPlaceId?: string | null;
  vehicleId?: string | null;   // FK → vehicles.id (null for visitors/unregistered)
  sessionId?: string | null;
  vehicleType?: string;
  detectedClass?: string;
}

/**
 * Write a camera detection event to the `camera_events` collection.
 * Non-blocking and non-fatal — detection logging must never block assignment.
 * Returns the inserted document's id string, or null on failure.
 */
export async function logCameraEvent(
  payload: CameraEventPayload
): Promise<string | null> {
  try {
    const db = await getDatabase();
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const result = await db.collection("camera_events").insertOne({
      eventId,
      cameraId: payload.cameraId,
      plateNumber: payload.plateNumber,
      confidence: payload.confidence,
      imagePath: payload.imagePath ?? null,
      eventType: payload.eventType,
      parkingPlaceId: payload.parkingPlaceId ?? null,
      vehicleId: payload.vehicleId ?? null,
      timestamp: new Date(),
      sessionId: payload.sessionId ?? null,
      processedAt: null,
      vehicleType: payload.vehicleType ?? "Car",
      detectedClass: payload.detectedClass ?? null,
    });
    return result.insertedId.toString();
  } catch (err) {
    console.error("[camera-events] Failed to log camera event:", err);
    return null;
  }
}

/**
 * Back-fill the sessionId and processedAt on an existing camera_event record.
 * Called after the parking_session has been created (entry) or completed (exit).
 */
export async function linkCameraEventToSession(
  cameraEventDbId: string,
  sessionId: string,
  assignedSlot?: string
): Promise<void> {
  try {
    const { ObjectId } = await import("mongodb");
    const db = await getDatabase();
    await db.collection("camera_events").updateOne(
      { _id: new ObjectId(cameraEventDbId) },
      { $set: { sessionId, assignedSlot: assignedSlot ?? null, processedAt: new Date() } }
    );
  } catch (err) {
    console.error("[camera-events] Failed to link session to camera event:", err);
  }
}

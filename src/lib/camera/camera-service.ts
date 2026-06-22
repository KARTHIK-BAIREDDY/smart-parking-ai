/* eslint-disable */
import { getDatabase } from "@/lib/mongo-db";
import { logCameraEvent } from "@/lib/camera-events";

/**
 * Camera Detection Pipeline
 * Handles duplicate detection prevention (debouncing), OCR parsing, and event routing.
 */
export class CameraDetectionService {
  /**
   * Processes an incoming camera frame or OCR read.
   * Debounces identical plates detected on the same camera within 2 minutes.
   */
  static async processDetection(payload: {
    cameraId: string;
    plateNumber: string;
    confidence: number;
    eventType: "entry" | "exit";
    imagePath?: string;
    parkingPlaceId: string;
    vehicleType?: string;
    detectedClass?: string;
  }) {
    const { cameraId, plateNumber, confidence, eventType, imagePath, parkingPlaceId, vehicleType, detectedClass } = payload;
    
    // Generate an anonymous tracking ID if OCR failed or was bypassed
    const normalizedPlate = plateNumber ? plateNumber.toUpperCase().replace(/\s+/g, "") : `UNKNOWN-${Date.now()}`;

    const db = await getDatabase();
    
    // 1. Debounce logic: prevent duplicate triggers within 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentEvent = await db.collection("camera_events").findOne({
      cameraId,
      plateNumber: normalizedPlate,
      eventType,
      timestamp: { $gte: twoMinutesAgo }
    });

    if (recentEvent) {
      console.log(`[camera] Debounced duplicate ${eventType} for ${normalizedPlate} on camera ${cameraId}`);
      return { success: true, action: "debounced" };
    }

    // 2. Determine OCR reliability based on confidence score (Skip if plateless)
    const isPlateless = normalizedPlate.startsWith("UNKNOWN-");
    
    if (!isPlateless && confidence < 70) {
      console.warn(`[camera] Rejected low confidence OCR (${confidence}%) for plate ${normalizedPlate}`);
      
      await logCameraEvent({
        cameraId,
        plateNumber: normalizedPlate,
        confidence,
        imagePath: imagePath || null,
        eventType,
        parkingPlaceId,
        sessionId: null,
        vehicleType,
        detectedClass,
      });

      // Update camera_events to mark as rejected
      await db.collection("camera_events").updateOne(
        { cameraId, plateNumber: normalizedPlate, timestamp: { $gte: twoMinutesAgo } }, // find the one just logged
        { $set: { processedAt: new Date(), requiresReview: false, status: "rejected" } }
      );

      return { success: true, action: "rejected", plateNumber: normalizedPlate };
    }

    if (!isPlateless && confidence >= 70 && confidence < 90) {
      console.warn(`[camera] Queued for review: OCR (${confidence}%) for plate ${normalizedPlate}`);
      
      const cameraEventId = await logCameraEvent({
        cameraId,
        plateNumber: normalizedPlate,
        confidence,
        imagePath: imagePath || null,
        eventType,
        parkingPlaceId,
        sessionId: null,
        vehicleType,
        detectedClass,
      });

      // Mark event as requiring review
      await db.collection("camera_events").updateOne(
        { _id: new (require("mongodb").ObjectId)(cameraEventId) },
        { $set: { requiresReview: true, status: "pending_review" } }
      );

      return { success: true, action: "queued", plateNumber: normalizedPlate, cameraEventId };
    }

    // 3. Depending on eventType, call internal API logic or enqueue task
    // In Phase 5 we will hook this directly to the assign/exit workflows
    // For now, it logs the event as a unique, verified trigger
    const cameraEventId = await logCameraEvent({
      cameraId,
      plateNumber: normalizedPlate,
      confidence,
      imagePath: imagePath || null,
      eventType,
      parkingPlaceId,
      sessionId: null,
      vehicleType,
      detectedClass,
    });

    return { success: true, action: "processed", plateNumber: normalizedPlate, cameraEventId };
  }

  /**
   * Health monitoring check for active cameras
   */
  static async getCameraHealth() {
    const db = await getDatabase();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const activeCameras = await db.collection("camera_events").aggregate([
      { $match: { timestamp: { $gte: tenMinutesAgo } } },
      { $group: { _id: "$cameraId", lastSeen: { $max: "$timestamp" }, count: { $sum: 1 } } }
    ]).toArray();

    return activeCameras.map(cam => ({
      cameraId: cam._id,
      status: "online",
      lastSeen: cam.lastSeen,
      recentEvents: cam.count
    }));
  }
}

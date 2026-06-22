/* eslint-disable */
import { getDatabase } from "@/lib/mongo-db";
import { ObjectId } from "mongodb";

export type SmsEventType = 
  | "ENTRY_ASSIGNED" 
  | "EXIT_COMPLETED" 
  | "MANUAL_OVERRIDE" 
  | "CAMERA_OFFLINE";

interface NotificationPayload {
  phoneNumber: string;
  eventType: SmsEventType;
  metadata: Record<string, any>;
}

export async function enqueueNotification(payload: NotificationPayload): Promise<{ success: boolean }> {
  try {
    const { phoneNumber, eventType, metadata } = payload;

    // Fast validation: Don't block, but do sanity check
    if (!phoneNumber || phoneNumber.trim() === "") {
      console.warn("[SMS] Skipped: No phone number provided.");
      return { success: true }; // gracefully skip
    }

    // Generate message
    let message = "";
    switch (eventType) {
      case "ENTRY_ASSIGNED":
        message = `Welcome to ${metadata.placeName || "our parking"}. You are assigned to slot ${metadata.slotId}.`;
        break;
      case "EXIT_COMPLETED":
        message = `Thank you for parking with us. Session completed. Duration: ${metadata.durationMinutes || 0} min.`;
        break;
      case "MANUAL_OVERRIDE":
        message = `Admin notice: Your vehicle (${metadata.vehicleNumber}) was manually ${metadata.action} (Reason: ${metadata.reason}).`;
        break;
      case "CAMERA_OFFLINE":
        message = `System Alert: Camera ${metadata.cameraId} has gone offline.`;
        break;
      default:
        console.warn(`[SMS] Unknown event type: ${eventType}`);
        return { success: true };
    }

    const db = await getDatabase();
    
    // Check if SMS is enabled globally
    const settings = await db.collection("app_settings").findOne({ id: "sms_config" });
    if (!settings || settings.smsEnabled !== true) {
      console.log(`[SMS] System disabled. Skipped message to ${phoneNumber}`);
      return { success: true }; // gracefully skip
    }

    // Insert into sms_queue persistently
    await db.collection("sms_queue").insertOne({
      _id: new ObjectId(),
      phoneNumber,
      message,
      eventType,
      status: "pending",
      retryCount: 0,
      createdAt: new Date(),
      lastAttempt: null,
      nextAttempt: new Date(), // Immediate
      provider: settings.provider || "MSG91",
      error: null
    });

    return { success: true };
  } catch (err) {
    // Crucial: We must NEVER throw here. We swallow the error to not block operations.
    console.error("[SMS] Failed to enqueue notification:", err);
    return { success: true }; 
  }
}

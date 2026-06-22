// ---------------------------------------------------------------------------
// Audit Logger
// Writes structured audit records to the `audit_logs` MongoDB collection.
// All business-critical actions must be logged here, server-side.
//
// Schema:
//   actorId     — userId, "camera-service", or "system"
//   actorRole   — "admin" | "superadmin" | "user" | "camera" | "system"
//   action      — machine-readable action constant (see AuditAction)
//   entityType  — the resource type affected
//   entityId    — the resource's id field
//   metadata    — arbitrary structured data relevant to this event
//   timestamp   — server-side UTC timestamp
// ---------------------------------------------------------------------------

import { getDatabase } from "@/lib/mongo-db";

export type AuditAction =
  | "PARKING_PLACE_CREATED"
  | "SLOT_CREATED"
  | "SLOT_DELETED"
  | "SLOT_ASSIGNED"
  | "SLOT_RELEASED"
  | "VEHICLE_REGISTERED"
  | "VEHICLE_APPROVED"
  | "VEHICLE_REJECTED"
  | "VEHICLE_SUSPENDED"
  | "VEHICLE_EXIT"
  | "SESSION_COMPLETED"
  | "PAYMENT_CREATED"
  | "USER_ROLE_CHANGED"
  | "SECURITY_ACTION"
  | "CAMERA_DETECTION"
  | "ADMIN_CREATED"
  | "ADMIN_APPROVED"
  | "ADMIN_REJECTED"
  | "ADMIN_DISABLED"
  | "ADMIN_ENABLED";

export type AuditEntityType =
  | "parking_place"
  | "parking_slot"
  | "parking_session"
  | "vehicle"
  | "user"
  | "camera_event";

export interface AuditEntry {
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry to the `audit_logs` collection.
 * Non-blocking and non-fatal — a logging failure must never break the caller.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const db = await getDatabase();
    await db.collection("audit_logs").insertOne({
      ...entry,
      timestamp: new Date(),
    });
  } catch (err) {
    // Log to server console but do NOT propagate — audit failure is not a blocker
    console.error("[audit-logger] Failed to write audit log:", err, entry);
  }
}

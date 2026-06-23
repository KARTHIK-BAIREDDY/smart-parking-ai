import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongo-db";
import { requireAuth, requireUser, requireAdmin } from "@/lib/auth-server";
import { isAdminRole } from "@/lib/auth-helpers";
import { writeAuditLog } from "@/lib/audit-logger";
import { sendApprovalNotification } from "@/lib/sms/sms-service";
import { INDIAN_PLATE_REGEX, normalizeVehicleNumber } from "@/lib/vehicle-helpers";

function normalizeStatus(status: string): "approved" | "pending_verification" | "rejected" | "suspended" {
  const s = String(status).toLowerCase().trim();
  if (s === "approved" || s === "approved") return "approved";
  if (s === "rejected" || s === "rejected") return "rejected";
  if (s === "suspended" || s === "suspended") return "suspended";
  return "pending_verification";
}

function mapToLegacy(status: string): "Approved" | "Pending" | "Rejected" | "Suspended" {
  const norm = normalizeStatus(status);
  if (norm === "approved") return "Approved";
  if (norm === "rejected") return "Rejected";
  if (norm === "suspended") return "Suspended";
  return "Pending";
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();

    // Admins can see all vehicles with user details
    if (isAdminRole(auth.user.role)) {
      const vehicles = await db.collection("vehicles").aggregate([
        {
          $lookup: {
            from: "users",
            let: { vUserId: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ["$id", "$$vUserId"] },
                      { $eq: [{ $toString: "$_id" }, "$$vUserId"] }
                    ]
                  }
                }
              }
            ],
            as: "ownerDetails",
          },
        },
        {
          $unwind: { path: "$ownerDetails", preserveNullAndEmptyArrays: true },
        },
        { $sort: { createdAt: -1 } },
      ]).toArray();

      const cleanedVehicles = vehicles.map((v) => ({
        ...v,
        // Map status for UI backwards compatibility
        status: mapToLegacy(v.status || v.approvalStatus),
        verificationStatus: v.status || "pending_verification",
        ownerName: v.ownerDetails?.name || v.ownerDetails?.fullName || v.ownerDetails?.username || v.ownerDetails?.profile?.name || "Unknown",
        ownerMobile: v.ownerDetails?.phone || v.ownerDetails?.mobile || v.ownerDetails?.phoneNumber || "Unknown",
        ownerDetails: undefined,
      }));

      return NextResponse.json(cleanedVehicles);
    }

    // Normal users only see their own vehicles
    const vehicles = await db
      .collection("vehicles")
      .find({ userId: auth.user.userId })
      .sort({ createdAt: -1 })
      .toArray();

    const cleanedVehicles = vehicles.map((v) => ({
      ...v,
      status: mapToLegacy(v.status || v.approvalStatus),
      verificationStatus: v.status || "pending_verification",
    }));

    return NextResponse.json(cleanedVehicles);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Users register their own vehicles — requireUser ensures role === "user"
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { vehicleNumber, vehicleType } = body;

    if (!vehicleNumber || !vehicleType) {
      return NextResponse.json(
        { error: "vehicleNumber and vehicleType are required." },
        { status: 400 }
      );
    }

    const normalizedPlate = normalizeVehicleNumber(vehicleNumber);

    if (!INDIAN_PLATE_REGEX.test(normalizedPlate)) {
      return NextResponse.json(
        { error: "Invalid Indian vehicle number format (e.g. MH01AB1234)." },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check for duplicates across entire system
    const existing = await db
      .collection("vehicles")
      .findOne({ vehicleNumber: normalizedPlate });
    if (existing) {
      return NextResponse.json(
        { error: "This vehicle is already registered in the system." },
        { status: 409 }
      );
    }

    const vehicleId = `vehicle-${Date.now()}`;
    const initialStatus = "pending_verification";

    const result = await db.collection("vehicles").insertOne({
      id: vehicleId,
      userId: auth.user.userId,
      vehicleNumber: normalizedPlate,
      vehicleType,
      status: initialStatus,
      approvalStatus: initialStatus, // back-compat field
      createdAt: new Date(),
      statusHistory: [
        {
          status: initialStatus,
          changedAt: new Date(),
          changedBy: auth.user.userId,
          notes: "Initial registration",
        }
      ],
    });

    writeAuditLog({
      actorId: auth.user.userId,
      actorRole: auth.user.role,
      action: "VEHICLE_REGISTERED",
      entityType: "vehicle",
      entityId: vehicleId,
      metadata: { vehicleNumber: normalizedPlate, vehicleType, status: initialStatus },
    }).catch(() => {});

    // Create in-app notification for the registering user
    try {
      const { notificationService } = require("@/lib/notification-service");
      notificationService.createNotification(
        auth.user.userId,
        "Vehicle Registered",
        `Your vehicle ${normalizedPlate} has been submitted for verification. You will be notified once it is reviewed.`,
        "info"
      );
    } catch (notifErr) {
      console.error("[vehicles] Registration notification failed:", notifErr);
    }

    return NextResponse.json(
      { success: true, insertedId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  // Only admins can approve / reject / suspend vehicles
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { vehicleId, status, reviewNotes = "" } = body;

    if (!vehicleId || !status) {
      return NextResponse.json({ error: "vehicleId and status are required." }, { status: 400 });
    }

    const normalizedNewStatus = normalizeStatus(status);
    const validStatuses = ["approved", "rejected", "suspended"];
    
    if (!validStatuses.includes(normalizedNewStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    const vehicle = await db.collection("vehicles").findOne({ id: vehicleId });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {
      status: normalizedNewStatus,
      approvalStatus: normalizedNewStatus, // for legacy code compatibility
      reviewedBy: auth.user.userId,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes.trim(),
    };

    await db.collection("vehicles").updateOne(
      { id: vehicleId },
      { 
        $set: updatePayload,
        $push: {
          statusHistory: {
            status: normalizedNewStatus,
            changedAt: new Date(),
            changedBy: auth.user.userId,
            notes: reviewNotes.trim() || `Status updated to ${normalizedNewStatus}`,
          }
        } as any
      }
    );

    let action: "VEHICLE_APPROVED" | "VEHICLE_REJECTED" | "VEHICLE_SUSPENDED";
    if (normalizedNewStatus === "approved") {
      action = "VEHICLE_APPROVED";
    } else if (normalizedNewStatus === "rejected") {
      action = "VEHICLE_REJECTED";
    } else {
      action = "VEHICLE_SUSPENDED";
    }

    writeAuditLog({
      actorId: auth.user.userId,
      actorRole: auth.user.role,
      action,
      entityType: "vehicle",
      entityId: vehicleId,
      metadata: { newStatus: normalizedNewStatus, reviewNotes },
    }).catch(() => {});

    // Notify the vehicle owner via SMS and in-app notification (non-blocking, non-fatal)
    if (vehicle.userId) {
      // Create in-app notification
      try {
        const { notificationService } = require("@/lib/notification-service");
        const notifType = normalizedNewStatus === "approved" ? "success"
          : normalizedNewStatus === "suspended" ? "warning"
          : "security";
        const notifTitle = normalizedNewStatus === "approved"
          ? "Vehicle Approved"
          : normalizedNewStatus === "rejected"
          ? "Vehicle Rejected"
          : "Vehicle Suspended";
        const notifMessage = normalizedNewStatus === "approved"
          ? `Your vehicle ${vehicle.vehicleNumber} has been approved. You can now use regular parking slots.`
          : normalizedNewStatus === "rejected"
          ? `Your vehicle ${vehicle.vehicleNumber} registration has been rejected.${reviewNotes ? ` Reason: ${reviewNotes.trim()}` : ""}`
          : `Your vehicle ${vehicle.vehicleNumber} has been suspended.${reviewNotes ? ` Reason: ${reviewNotes.trim()}` : ""}`;
        notificationService.createNotification(vehicle.userId, notifTitle, notifMessage, notifType);
      } catch (notifErr) {
        console.error("[vehicles] In-app notification failed:", notifErr);
      }

      // Send SMS notification
      try {
        const owner = await db.collection("users").findOne({ _id: new ObjectId(vehicle.userId) });
        if (owner?.phone || owner?.mobile) {
          sendApprovalNotification({
            mobile: owner.phone || owner.mobile,
            vehicleNumber: vehicle.vehicleNumber,
            status: normalizedNewStatus,
            reviewNotes: reviewNotes.trim() || undefined,
          }).catch(() => {});
        }
      } catch (smsErr) {
        console.error("[vehicles] SMS approval notification failed:", smsErr);
      }
    }

    return NextResponse.json({ success: true, status: normalizedNewStatus });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
export async function DELETE(request: Request) { const auth = await requireAuth(); if (auth instanceof NextResponse) return auth; try { const url = new URL(request.url); const vehicleId = url.searchParams.get("id"); if (!vehicleId) return NextResponse.json({ error: "Missing vehicle id" }, { status: 400 }); const db = await getDatabase(); const vehicle = await db.collection("vehicles").findOne({ id: vehicleId }); if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 }); if (vehicle.userId !== auth.user.userId && !isAdminRole(auth.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 }); await db.collection("vehicles").deleteOne({ id: vehicleId }); return NextResponse.json({ success: true }); } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }); } }

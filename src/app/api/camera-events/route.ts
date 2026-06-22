import { logger } from "@/lib/logger";
import { rateLimiter } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";
import { requireCameraOrAdmin } from "@/lib/camera-auth";
import { writeAuditLog } from "@/lib/audit-logger";
import { CameraDetectionService } from "@/lib/camera/camera-service";
import { verifyVehicleInImage } from "@/lib/camera/server-detection";
import { POST as assignPost } from "@/app/api/slots/assign/route";
import { POST as exitPost } from "@/app/api/slots/exit/route";

// ---------------------------------------------------------------------------
// GET /api/camera-events
//
// Admin-only endpoint to retrieve and filter raw camera detection events.
// Authentication: active admin session.
// Query params: plateNumber, cameraId, eventType, dateFrom, dateTo, page, limit
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    const plateNumber = searchParams.get("plateNumber");
    if (plateNumber) {
      query.plateNumber = plateNumber.toUpperCase().replace(/\s+/g, "");
    }

    const cameraId = searchParams.get("cameraId");
    if (cameraId) {
      query.cameraId = cameraId;
    }

    const eventType = searchParams.get("eventType");
    if (eventType) {
      query.eventType = eventType;
    }

    // Optional date range filter on timestamp
    const dateFrom = searchParams.get("dateFrom");
    const dateTo   = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
      if (dateTo)   query.timestamp.$lte = new Date(dateTo);
    }

    const db = await getDatabase();
    const [events, total] = await Promise.all([
      db
        .collection("camera_events")
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("camera_events").countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch(err: any) {
    logger.error("GET /api/camera-events ERROR:", err as Error, { component: "CameraEventsAPI" });
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/camera-events
//
// Standalone camera event ingestion — log a raw detection WITHOUT triggering
// the slot-assignment pipeline. Use this for:
//   • Low-confidence reads that should be recorded but not acted on
//   • Exit-camera detections at unmanned gates
//   • Any detection where manual admin review is required
//
// Authentication: x-camera-key header OR active admin session.
//
// Body:
//   cameraId      (string, required)  — camera device identifier
//   plateNumber   (string, required)  — raw plate text as detected
//   confidence    (number, 0–100)     — OCR/ANPR confidence score
//   eventType     (string)            — "entry" | "exit" | "unknown"
//   parkingPlaceId (string, optional) — where the event occurred
//   imagePath     (string, optional)  — stored frame path
//
// Returns the inserted camera_event id.
// ---------------------------------------------------------------------------

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
      cameraId,
      plateNumber = "",
      confidence = 0,
      eventType = "unknown",
      parkingPlaceId = null,
      imagePath = null,
      vehicleType = "Car",
    } = body as {
      cameraId: string;
      plateNumber?: string;
      confidence?: number;
      eventType?: "entry" | "exit" | "unknown";
      parkingPlaceId?: string | null;
      imagePath?: string | null;
      vehicleType?: string;
    };

    // ── Validate required fields ─────────────────────────────────────────────
    if (!cameraId) {
      return NextResponse.json(
        { success: false, error: "cameraId is required" },
        { status: 400 }
      );
    }

    const validEventTypes = ["entry", "exit", "unknown"];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { success: false, error: `eventType must be one of: ${validEventTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Confidence must be 0–100
    const clampedConfidence = Math.max(0, Math.min(100, Number(confidence) || 0));
    const normalizedPlate = plateNumber ? plateNumber.toUpperCase().replace(/\s+/g, "") : "";

    // ── Server-Side TensorFlow Validation ────────────────────────────────────
    if (!imagePath) {
      return NextResponse.json(
        { success: false, error: "Image evidence is required." },
        { status: 403 }
      );
    }
    const verificationResult = await verifyVehicleInImage(imagePath);
    if (!verificationResult.success) {
      return NextResponse.json(
        { success: false, error: verificationResult.error || "No vehicle detected" },
        { status: 403 }
      );
    }
    
    // We optionally use the validated class from TFJS if vehicleType wasn't explicitly normalized
    const validatedVehicleType = vehicleType || verificationResult.detectedClass || "Car";

    // ── Process through Camera Detection Service ──────────────────────────────
    const processResult = await CameraDetectionService.processDetection({
      cameraId,
      plateNumber: normalizedPlate,
      confidence: clampedConfidence,
      eventType: eventType as "entry" | "exit",
      imagePath: imagePath || undefined,
      parkingPlaceId: parkingPlaceId || "unknown",
      vehicleType: validatedVehicleType,
    });

    if (processResult.action === "debounced") {
      return NextResponse.json(
        {
          success: true,
          action: "debounced",
          plateNumber: normalizedPlate,
        },
        { status: 200 }
      );
    }

    // ── Trigger Assignment or Exit Workflow ───────────────────────────────────
    let actionResult = null;
    
    if (processResult.action === "processed" && eventType !== "unknown") {
      const internalBody = JSON.stringify({
        vehicleId: processResult.plateNumber, // Use the generated tracking ID if empty
        placeId: parkingPlaceId,
        confidence: clampedConfidence,
        cameraId,
        imagePath,
        vehicleType: validatedVehicleType
      });

      const internalReq = new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: internalBody
      });

      // Internal call to route handlers
      const res = eventType === "entry" 
        ? await assignPost(internalReq) 
        : await exitPost(internalReq);
        
      actionResult = await res.json();
      
      if (!res.ok) {
        return NextResponse.json(actionResult, { status: res.status });
      }
    }

    return NextResponse.json(
      {
        success: true,
        cameraEventId: processResult.cameraEventId,
        plateNumber: processResult.plateNumber,
        confidence: clampedConfidence,
        eventType,
        actionResult,
      },
      { status: 201 }
    );
  } catch(err: any) {
    logger.error("POST /api/camera-events ERROR:", err as Error, { component: "CameraEventsAPI" });
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

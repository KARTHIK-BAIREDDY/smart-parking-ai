import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";
import { writeAuditLog } from "@/lib/audit-logger";

// ---------------------------------------------------------------------------
// POST /api/vehicles/verify/vahan
//
// VAHAN (Vehicle Registration Database) integration stub.
// Authentication: active admin session.
//
// Current behaviour:
//   • Returns the locally-stored vehicle record if found.
//   • When VAHAN_API_KEY is configured this route is designed to call the
//     National Register of Motor Vehicles API — implementation is a guided
//     stub with clearly marked TODO blocks.
//
// Future VAHAN fields to cross-verify:
//   - Registered owner name
//   - Chassis / engine number
//   - RC (Registration Certificate) validity date
//   - Fitness certificate expiry
//   - Insurance status
//   - Blacklist / hypothecation status
//
// To enable live VAHAN lookups:
//   1. Obtain an API key from the VAHAN portal / your NIC representative.
//   2. Add VAHAN_API_KEY and VAHAN_API_URL to your .env.local.
//   3. Replace the TODO block below with actual API call logic.
// ---------------------------------------------------------------------------

export interface VahanVerifyResponse {
  success: true;
  vehicleNumber: string;
  vahanIntegrationReady: boolean;
  localRecord: {
    status: string;
    vehicleType: string;
    userId: string | null;
    createdAt: string;
  } | null;
  vahanData: {
    ownerName?: string;
    registrationDate?: string;
    rcExpiry?: string;
    fitnessExpiry?: string;
    insuranceExpiry?: string;
    isBlacklisted?: boolean;
    rawResponse?: Record<string, unknown>;
  } | null;
  ownershipMismatch: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Placeholder for the real VAHAN API call.
// Replace this entire function body when the VAHAN API key is available.
// ---------------------------------------------------------------------------
async function callVahanApi(
  vehicleNumber: string,
  apiKey: string,
  apiUrl: string
): Promise<VahanVerifyResponse["vahanData"]> {
  // TODO: Implement real VAHAN API integration
  //
  // Example VAHAN API flow:
  //   const response = await fetch(`${apiUrl}/vehicle-details`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "x-api-key": apiKey,
  //     },
  //     body: JSON.stringify({ vehicleNumber }),
  //   });
  //   if (!response.ok) throw new Error(`VAHAN API error: ${response.status}`);
  //   const data = await response.json();
  //   return {
  //     ownerName: data.owner_name,
  //     registrationDate: data.reg_date,
  //     rcExpiry: data.rc_expiry,
  //     fitnessExpiry: data.fitness_expiry,
  //     insuranceExpiry: data.insurance_expiry,
  //     isBlacklisted: data.blacklist_status === "Y",
  //     rawResponse: data,
  //   };

  // Current: stub returns null to indicate the key is present but integration
  // is not yet implemented. Remove this line and uncomment above when ready.
  void vehicleNumber;
  void apiKey;
  void apiUrl;
  return null;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { vehicleNumber } = body as { vehicleNumber: string };

    if (!vehicleNumber) {
      return NextResponse.json(
        { success: false, error: "vehicleNumber is required" },
        { status: 400 }
      );
    }

    const normalizedPlate = vehicleNumber.toUpperCase().replace(/\s+/g, "");

    const db = await getDatabase();

    // ── Step 1: Local DB lookup ──────────────────────────────────────────────
    const vehicleRecord = await db
      .collection("vehicles")
      .findOne({ vehicleNumber: normalizedPlate });

    // ── Step 2: Check VAHAN integration readiness ────────────────────────────
    const vahanApiKey = process.env.VAHAN_API_KEY;
    const vahanApiUrl = process.env.VAHAN_API_URL ?? "https://api.vahan.parivahan.gov.in/vahan4dashboard/vahan/dashboard";
    const vahanIntegrationReady = Boolean(vahanApiKey);

    let vahanData: VahanVerifyResponse["vahanData"] = null;
    let ownershipMismatch = false;

    // ── Step 3: VAHAN API call (gated on env key) ────────────────────────────
    if (vahanIntegrationReady && vahanApiKey) {
      try {
        vahanData = await callVahanApi(normalizedPlate, vahanApiKey, vahanApiUrl);

        // Cross-check owner name if both VAHAN and local record are available
        // TODO: once callVahanApi is implemented, compare vahanData.ownerName
        // against the user.name from the local record to flag potential fraud.
        if (vahanData && vehicleRecord?.userId) {
          const localOwner = await db
            .collection("users")
            .findOne({ _id: new ObjectId(vehicleRecord.userId) }, { projection: { name: 1 } });

          if (localOwner?.name && vahanData.ownerName) {
            const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");
            ownershipMismatch = normalize(localOwner.name) !== normalize(vahanData.ownerName);
          }
        }
      } catch (vahanErr) {
        console.error("[vahan] API call failed:", vahanErr);
        // Non-fatal — fall back to local record
      }
    }

    // ── Audit ────────────────────────────────────────────────────────────────
    writeAuditLog({
      actorId: auth.user.userId,
      actorRole: auth.user.role,
      action: "SECURITY_ACTION",
      entityType: "vehicle",
      entityId: vehicleRecord?.id ?? normalizedPlate,
      metadata: {
        action: "VAHAN_LOOKUP",
        vehicleNumber: normalizedPlate,
        vahanIntegrationReady,
        vahanDataReceived: vahanData !== null,
        ownershipMismatch,
      },
    }).catch(() => {});

    // ── Build response ───────────────────────────────────────────────────────
    const localRecord = vehicleRecord
      ? {
          status: vehicleRecord.status ?? vehicleRecord.approvalStatus ?? "pending_verification",
          vehicleType: vehicleRecord.vehicleType,
          userId: vehicleRecord.userId ?? null,
          createdAt: vehicleRecord.createdAt
            ? new Date(vehicleRecord.createdAt).toISOString()
            : "",
        }
      : null;

    let message: string;
    if (!vahanIntegrationReady) {
      message = localRecord
        ? "Local record found. VAHAN_API_KEY not configured — manual admin approval is required."
        : "Vehicle not in local registry. VAHAN_API_KEY not configured.";
    } else if (vahanData === null) {
      message = "VAHAN_API_KEY is configured but the integration is not yet fully implemented. See TODO in /api/vehicles/verify/vahan/route.ts.";
    } else if (ownershipMismatch) {
      message = "⚠️ VAHAN owner name does not match the local registered user. Manual review required.";
    } else {
      message = "VAHAN verification successful. Owner details match local record.";
    }

    const response: VahanVerifyResponse = {
      success: true,
      vehicleNumber: normalizedPlate,
      vahanIntegrationReady,
      localRecord,
      vahanData,
      ownershipMismatch,
      message,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/vehicles/verify/vahan ERROR:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

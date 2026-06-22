import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";

// ---------------------------------------------------------------------------
// POST /api/vehicles/verify
//
// Vehicle ownership verification endpoint — VAHAN integration stub.
// Authentication: active admin session.
//
// Current behaviour: returns the locally-stored vehicle registration status.
// Future: when VAHAN_API_KEY is configured, this will call the National
//         Register of Motor Vehicles API to cross-verify:
//           - registered owner name
//           - chassis/engine number
//           - RC validity date
//           - fitness certificate
//           - insurance status
//           - blacklist status
//
// Source field values:
//   "local"   — vehicle found in local DB, unverified externally
//   "vahan"   — verified against VAHAN (future)
//   "pending" — vehicle not found locally
// ---------------------------------------------------------------------------

export interface VerifyResponse {
  success: true;
  vehicleNumber: string;
  verified: boolean;
  source: "local" | "vahan" | "pending";
  vahanIntegrationReady: boolean;
  localRecord?: {
    status: string;
    vehicleType: string;
    userId: string | null;
    createdAt: string;
  };
  vahanData?: null; // populated when VAHAN integration is live
  message: string;
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

    // ── Step 1: Look up in local DB ──────────────────────────────────────────
    const vehicleRecord = await db
      .collection("vehicles")
      .findOne({ vehicleNumber: normalizedPlate });

    // ── Step 2: Check VAHAN integration readiness ────────────────────────────
    const vahanApiKey = process.env.VAHAN_API_KEY;
    const vahanIntegrationReady = Boolean(vahanApiKey);

    if (!vehicleRecord) {
      return NextResponse.json({
        success: true,
        vehicleNumber: normalizedPlate,
        verified: false,
        source: "pending" as const,
        vahanIntegrationReady,
        localRecord: null,
        vahanData: null,
        message: vahanIntegrationReady
          ? "Vehicle not in local registry. VAHAN check ready — call /api/vehicles/verify/vahan to query national DB."
          : "Vehicle not in local registry. VAHAN integration not yet configured (VAHAN_API_KEY missing).",
      });
    }

    // ── Step 3: VAHAN integration (future) ───────────────────────────────────
    //
    // When VAHAN_API_KEY is present, replace this block with a real API call:
    //
    //   const vahanResult = await callVahanApi(normalizedPlate, vahanApiKey);
    //   if (vahanResult.owner !== localOwnerName) {
    //     // Flag ownership mismatch for admin review
    //   }
    //
    // For now, return local record only.

    const response: VerifyResponse = {
      success: true,
      vehicleNumber: normalizedPlate,
      verified: vehicleRecord.status === "approved",
      source: "local",
      vahanIntegrationReady,
      localRecord: {
        status: vehicleRecord.status ?? vehicleRecord.approvalStatus ?? "pending_verification",
        vehicleType: vehicleRecord.vehicleType,
        userId: vehicleRecord.userId ?? null,
        createdAt: vehicleRecord.createdAt
          ? new Date(vehicleRecord.createdAt).toISOString()
          : "",
      },
      vahanData: null,
      message: vahanIntegrationReady
        ? "Local record found. VAHAN cross-verification available — configure VAHAN_API_KEY to enable automatic national-registry checks."
        : "Local record found. VAHAN integration not yet configured (VAHAN_API_KEY missing). Manual admin approval required.",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/vehicles/verify ERROR:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

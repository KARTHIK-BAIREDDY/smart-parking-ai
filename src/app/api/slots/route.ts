import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");

    if (!placeId) {
      return NextResponse.json({ error: "placeId is required" }, { status: 400 });
    }

    const database = await getDatabase();
    const slots = await database
      .collection("parking_slots")
      .find({ parkingPlaceId: placeId })
      .sort({ slotId: 1 })
      .toArray();

    return NextResponse.json(slots);
  } catch (error) {
    console.error("GET /api/slots ERROR:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { placeId, slotId, status, vehicleId, vehicleType } = body;

    const database = await getDatabase();

    const query: { slotId: string; parkingPlaceId?: string } = { slotId };
    if (placeId) query.parkingPlaceId = placeId;

    const slot = await database.collection("parking_slots").findOne(query);
    if (!slot) {
      return NextResponse.json({ success: false, error: "Slot not found" }, { status: 404 });
    }

    // Build update payload for the slot document only.
    // NOTE: parking_sessions are created by POST /api/slots/assign — NOT here.
    // The vehicles collection stores ownership records only.
    const updateData: {
      status: string;
      vehicleId?: string | null;
      vehicleType?: string | null;
      entryTime?: Date | null;
    } = { status };

    if (status === "occupied") {
      updateData.vehicleId = vehicleId || null;
      updateData.vehicleType = vehicleType || null;
      updateData.entryTime = new Date();
    } else {
      // Slot is being freed — clear occupancy fields
      updateData.vehicleId = null;
      updateData.vehicleType = null;
      updateData.entryTime = null;
    }

    await database
      .collection("parking_slots")
      .updateOne({ _id: slot._id }, { $set: updateData });

    const updatedSlot = await database
      .collection("parking_slots")
      .findOne({ _id: slot._id });

    return NextResponse.json({ success: true, slot: updatedSlot });
  } catch (error) {
    console.error("PUT /api/slots ERROR:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}


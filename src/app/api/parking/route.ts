import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";
import { writeAuditLog } from "@/lib/audit-logger";

export async function GET() {
  try {
    const db = await getDatabase();
    const places = await db.collection("parking_places").find({}).toArray();
    return NextResponse.json(places);
  } catch (error) {
    console.error("GET /api/parking ERROR:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const db = await getDatabase();

    const rows = Math.max(1, Number(body.rows) || 1);
    const subrows = Math.max(1, Number(body.subrows) || 1);
    const slotsPerSubrow = Math.max(1, Number(body.slotsPerSubrow) || 1);

    const placeId = `parking-${Date.now()}`;

    const parkingPlace = {
      id: placeId,
      name: body.name || "",
      code: body.code || "",
      country: body.country || "",
      state: body.state || "",
      district: body.district || "",
      area: body.area || "",
      institutionName: body.institutionName || "",
      rows,
      subrows,
      slotsPerSubrow,
      createdAt: new Date(),
    };

    const placeResult = await db.collection("parking_places").insertOne(parkingPlace);

    const slots: {
      parkingPlaceId: string;
      slotId: string;
      row: string;
      subrow: string;
      number: number;
      status: string;
      slotType: "regular" | "visitor" | "reserved" | "disabled";
      vehicleId: null;
      entryTime: null;
      createdAt: Date;
    }[] = [];

    for (let r = 1; r <= rows; r++) {
      const rowLabel = String.fromCharCode(64 + r);
      for (let sr = 1; sr <= subrows; sr++) {
        const subrowLabel = `${rowLabel}${sr}`;
        for (let s = 1; s <= slotsPerSubrow; s++) {
          const slotId = `${subrowLabel}-${s}`;

          let slotType: "regular" | "visitor" | "reserved" | "disabled" = "regular";
          if (s === 1) slotType = "disabled";
          else if (s === 2) slotType = "reserved";
          else if (s === 3 || s === 4) slotType = "visitor";

          slots.push({
            parkingPlaceId: placeId,
            slotId,
            row: rowLabel,
            subrow: subrowLabel,
            number: s,
            status: "available",
            slotType,
            vehicleId: null,
            entryTime: null,
            createdAt: new Date(),
          });
        }
      }
    }

    if (slots.length === 0) {
      return NextResponse.json(
        { success: false, error: "Slot generation produced 0 slots" },
        { status: 500 }
      );
    }

    const slotResult = await db.collection("parking_slots").insertMany(slots);

    // Audit: parking place creation
    writeAuditLog({
      actorId: auth.user.userId,
      actorRole: auth.user.role,
      action: "PARKING_PLACE_CREATED",
      entityType: "parking_place",
      entityId: placeId,
      metadata: {
        name: body.name,
        rows,
        subrows,
        slotsPerSubrow,
        slotsCreated: slotResult.insertedCount,
      },
    }).catch(() => {});

    // Audit: slot creation
    writeAuditLog({
      actorId: auth.user.userId,
      actorRole: auth.user.role,
      action: "SLOT_CREATED",
      entityType: "parking_slot",
      entityId: placeId,
      metadata: { count: slotResult.insertedCount, parkingPlaceId: placeId },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        insertedId: placeResult.insertedId,
        placeId,
        slotsCreated: slotResult.insertedCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/parking ERROR:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();
    const logs = await db
      .collection("security_logs")
      .find({})
      .sort({ timestamp: -1 })
      .toArray();
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const db = await getDatabase();
    const log = {
      action: body.action,
      details: body.details,
      timestamp: new Date(),
      vehicleType: body.vehicleType || null,
      slotId: body.slotId || null,
      parkingPlaceId: body.parkingPlaceId || null,
      recordedBy: auth.user.userId,
    };
    const result = await db.collection("security_logs").insertOne(log);
    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

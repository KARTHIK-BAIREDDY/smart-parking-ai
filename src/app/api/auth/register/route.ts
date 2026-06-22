import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { INDIAN_PLATE_REGEX, normalizeVehicleNumber } from "@/lib/vehicle-helpers";
import { normalizePhoneNumber } from "@/lib/phone-helpers";

/** Public user registration — always creates role: "user". Admin signup is not allowed. */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.role && body.role !== "user") {
      return NextResponse.json(
        { error: "Public registration cannot assign elevated roles." },
        { status: 403 }
      );
    }

    const { name, email, mobile, vehicleNumber, vehicleType } = body;

    if (!name || !email || !mobile) {
      return NextResponse.json(
        { error: "Name, email, and mobile are required." },
        { status: 400 }
      );
    }

    const normalizedMobile = normalizePhoneNumber(mobile);
    if (normalizedMobile.length !== 10) {
      return NextResponse.json(
        { error: "Valid 10-digit mobile number is required." },
        { status: 400 }
      );
    }

    let normalizedPlate = "";
    if (vehicleNumber && vehicleType) {
      normalizedPlate = normalizeVehicleNumber(vehicleNumber);
      if (!INDIAN_PLATE_REGEX.test(normalizedPlate)) {
        return NextResponse.json(
          { error: "Invalid Indian vehicle number format (e.g. MH01AB1234)." },
          { status: 400 }
        );
      }
    }

    const db = await getDatabase();
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.collection("users").findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const existingPhone = await db.collection("users").findOne({ phoneNumber: normalizedMobile });
    if (existingPhone) {
      return NextResponse.json(
        { error: "An account already exists with this phone number." },
        { status: 409 }
      );
    }

    if (vehicleNumber && vehicleType) {
      const existingVehicle = await db.collection("vehicles").findOne({ vehicleNumber: normalizedPlate });
      if (existingVehicle) {
      }
    }

    const userId = `user-${Date.now()}`;

    await db.collection("users").insertOne({
      id: userId,
      role: "user",
      name: name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      phoneNumber: normalizedMobile, // ensure phoneNumber is set for unique index
      phone: normalizedMobile,
      createdAt: new Date(),
    });

    if (vehicleNumber && vehicleType) {
      try {
        await db.collection("vehicles").insertOne({
          id: `vehicle-${Date.now()}`,
          userId,
          vehicleNumber: normalizedPlate,
          vehicleType,
          status: "pending_verification",
          approvalStatus: "pending_verification",
          createdAt: new Date(),
        });
      } catch (insertError: any) {
        if (insertError.code === 11000) {
          return NextResponse.json(
            { error: "This vehicle is already registered in the system." },
            { status: 409 }
          );
        }
        throw insertError;
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/auth/register ERROR:", error);
    if (error.code === 11000) {
       return NextResponse.json(
         { error: "A duplicate record exists in the database." },
         { status: 409 }
       );
    }
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

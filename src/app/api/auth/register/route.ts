import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { hashPassword } from "@/lib/auth-helpers";
import { normalizePhoneNumber } from "@/lib/phone-helpers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, mobile, password } = body;

    const normalizedMobile = normalizePhoneNumber(mobile);

    // Validate Mobile
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      return NextResponse.json(
        { error: "Invalid mobile number. Must be 10 digits starting with 6, 7, 8, or 9." },
        { status: 400 }
      );
    }

    // Validate Password
    if (!/^\d{6}$/.test(password)) {
      return NextResponse.json(
        { error: "Password must be exactly 6 numeric digits." },
        { status: 400 }
      );
    }

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if mobile already exists
    const existingUser = await db.collection("users").findOne({
      $or: [
        { phoneNumber: normalizedMobile },
        { mobile: normalizedMobile }
      ],
      role: "user"
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Account already exists. Please login." },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new user
    await db.collection("users").insertOne({
      name: name.trim(),
      mobile: normalizedMobile,
      phoneNumber: normalizedMobile,
      passwordHash,
      role: "user",
      createdAt: new Date(),
      active: true,
    } as any);

    return NextResponse.json({ success: true, message: "Account created successfully." });

  } catch (error) {
    console.error("POST /api/auth/register ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}

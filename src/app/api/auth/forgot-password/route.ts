import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { hashPassword } from "@/lib/auth-helpers";
import { normalizePhoneNumber } from "@/lib/phone-helpers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, newPassword } = body;

    const normalizedMobile = normalizePhoneNumber(mobile);

    // Validate Mobile
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      return NextResponse.json(
        { error: "Invalid mobile number. Must be 10 digits starting with 6, 7, 8, or 9." },
        { status: 400 }
      );
    }

    // Validate Password
    if (!/^\d{6}$/.test(newPassword)) {
      return NextResponse.json(
        { error: "Password must be exactly 6 numeric digits." },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if mobile exists
    const user = await db.collection("users").findOne({
      $or: [
        { phoneNumber: normalizedMobile },
        { mobile: normalizedMobile }
      ],
      role: "user"
    });

    if (!user) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, message: "Password updated successfully. Please login." });

  } catch (error) {
    console.error("POST /api/auth/forgot-password ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update password. Please try again." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { otpService } from "@/lib/otp-service";
import { normalizePhoneNumber } from "@/lib/phone-helpers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const normalizedMobile = normalizePhoneNumber(body.mobile);

    if (normalizedMobile.length !== 10) {
      return NextResponse.json(
        { error: "Valid 10-digit mobile number is required." },
        { status: 400 }
      );
    }

    const { success, otp } = await otpService.sendOTP(normalizedMobile);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to dispatch OTP SMS." },
        { status: 500 }
      );
    }

    const responseBody: Record<string, any> = {
      success: true,
      message: "OTP sent successfully",
    };

    if (
      process.env.ENABLE_DEV_OTP === "true" &&
      process.env.NODE_ENV !== "production"
    ) {
      responseBody.devOtp = otp;
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("POST /api/auth/otp/send ERROR:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}

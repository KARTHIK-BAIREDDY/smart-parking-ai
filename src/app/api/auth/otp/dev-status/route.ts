import { NextResponse } from "next/server";

export async function GET() {
  const enabled =
    process.env.ENABLE_DEV_OTP === "true" &&
    process.env.NODE_ENV !== "production";
  return NextResponse.json({ enabled });
}

import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || null,
  });
}

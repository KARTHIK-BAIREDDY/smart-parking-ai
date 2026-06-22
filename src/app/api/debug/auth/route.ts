import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  return NextResponse.json({
    email: session?.user?.email,
    role: session?.user?.role,
    userId: session?.user?.userId,
    provider: session?.user?.provider
  });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { notificationService } from "@/lib/notification-service";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { title, message, type = "info" } = body as {
      title: string;
      message: string;
      type?: "info" | "success" | "warning" | "security";
    };

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Title and message are required" },
        { status: 400 }
      );
    }

    const validTypes = ["info", "success", "warning", "security"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const success = await notificationService.sendAnnouncement(title, message, type);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to broadcast announcement." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Announcement broadcasted successfully to all users." },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/announcements ERROR:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { notificationService } from "@/lib/notification-service";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const userId = auth.user.userId;
    const notifications = await notificationService.getNotifications(userId);
    const unreadCount = await notificationService.getUnreadCount(userId);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/notifications ERROR:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const userId = auth.user.userId;
    const body = await request.json();
    const { notificationId, markAll } = body as {
      notificationId?: string;
      markAll?: boolean;
    };

    if (markAll) {
      await notificationService.markAllAsRead(userId);
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: "notificationId or markAll: true is required" },
        { status: 400 }
      );
    }

    const success = await notificationService.markAsRead(notificationId, userId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Notification not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Notification marked as read." });
  } catch (error) {
    console.error("PUT /api/notifications ERROR:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

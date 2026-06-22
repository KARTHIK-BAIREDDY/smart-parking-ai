import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";
import { writeAuditLog } from "@/lib/audit-logger";
import { enqueueNotification } from "@/lib/sms/notification-service";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();
    
    // Get Settings
    const settings = await db.collection("app_settings").findOne({ id: "sms_config" }) || 
      { smsEnabled: false, provider: "MSG91" };

    // Get Queue Counts
    const counts = await db.collection("sms_queue").aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray();

    const queueCounts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dead: 0
    };

    for (const c of counts) {
      if (queueCounts.hasOwnProperty(c._id)) {
        (queueCounts as any)[c._id] = c.count;
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        smsEnabled: settings.smsEnabled,
        provider: settings.provider
      },
      queueCounts
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { action, settings, testPhoneNumber } = body;
    const db = await getDatabase();

    if (action === "update") {
      await db.collection("app_settings").updateOne(
        { id: "sms_config" },
        { $set: { smsEnabled: settings.smsEnabled, provider: settings.provider } },
        { upsert: true }
      );

      await writeAuditLog({
        actorId: auth.user?.userId || "admin",
        actorRole: auth.user?.role || "admin",
        action: "UPDATE_SMS_SETTINGS" as any,
        entityType: "app_settings" as any,
        entityId: "sms_config",
        metadata: settings
      });

      return NextResponse.json({ success: true, message: "Settings updated" });
    }

    if (action === "test") {
      if (!testPhoneNumber) {
        return NextResponse.json({ success: false, error: "Test phone number is required" }, { status: 400 });
      }

      await enqueueNotification({
        phoneNumber: testPhoneNumber,
        eventType: "MANUAL_OVERRIDE",
        metadata: {
          vehicleNumber: "TEST-000",
          action: "sent a test message" as any,
          reason: "Admin dashboard test"
        }
      });

      return NextResponse.json({ success: true, message: "Test message queued" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

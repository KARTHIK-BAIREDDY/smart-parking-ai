import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireSuperAdmin } from "@/lib/auth-server";
import { hashPassword } from "@/lib/auth-helpers";
import { insertAuditLog } from "@/lib/audit";
import { ObjectId } from "mongodb";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { action, password } = await req.json();
    const db = await getDatabase();
    const { id } = await context.params;
    const userId = new ObjectId(id);

    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.role === "super_admin") {
      return NextResponse.json({ error: "Cannot modify super_admin" }, { status: 403 });
    }

    if (action === "reset_password") {
      if (!password || password.length < 6) return NextResponse.json({ error: "Invalid password" }, { status: 400 });
      const passwordHash = await hashPassword(password);
      await db.collection("users").updateOne({ _id: userId }, { $set: { passwordHash } });
      await insertAuditLog({
        action: "ADMIN_PASSWORD_RESET",
        userId: auth.user.userId,
        details: `Reset password for admin: ${user.username}`,
      });
    } else if (action === "disable") {
      await db.collection("users").updateOne({ _id: userId }, { $set: { active: false } });
      await insertAuditLog({
        action: "ADMIN_DISABLED",
        userId: auth.user.userId,
        details: `Disabled admin: ${user.username}`,
      });
    } else if (action === "enable") {
      await db.collection("users").updateOne({ _id: userId }, { $set: { active: true } });
      await insertAuditLog({
        action: "ADMIN_ENABLED",
        userId: auth.user.userId,
        details: `Enabled admin: ${user.username}`,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/admin/users/[id] ERROR:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();
    const { id } = await context.params;
    const userId = new ObjectId(id);

    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.role === "super_admin") {
      return NextResponse.json({ error: "Cannot delete super_admin" }, { status: 403 });
    }

    await db.collection("users").deleteOne({ _id: userId });
    await insertAuditLog({
      action: "ADMIN_DELETED",
      userId: auth.user.userId,
      details: `Deleted admin: ${user.username}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] ERROR:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

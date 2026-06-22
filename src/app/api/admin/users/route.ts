import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireSuperAdmin } from "@/lib/auth-server";
import { hashPassword } from "@/lib/auth-helpers";
import { insertAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();
    const admins = await db
      .collection("users")
      .find({ role: { $in: ["admin", "super_admin", "operator"] } }, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(admins);
  } catch (error) {
    console.error("GET /api/admin/users ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { username, password, role } = await req.json();

    if (!username || !/^[a-zA-Z0-9_@.+-]{3,50}$/.test(username)) {
      return NextResponse.json({ error: "Username must be 3-50 characters and can include letters, numbers, _, @, ., +, or -" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const assignedRole = role === "operator" ? "operator" : "admin";

    const db = await getDatabase();
    const existing = await db.collection("users").findOne({ username });
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newAdmin = {
      username,
      passwordHash,
      role: assignedRole,
      active: true,
      createdAt: new Date(),
    };

    await db.collection("users").insertOne(newAdmin as any);

    await insertAuditLog({
      action: "ADMIN_CREATED",
      userId: auth.user.userId,
      details: `Created admin account for username: ${username}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/users ERROR:", error);
    return NextResponse.json({ error: "Failed to create admin." }, { status: 500 });
  }
}

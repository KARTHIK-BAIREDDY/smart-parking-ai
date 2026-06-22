/* eslint-disable */
import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getSessionUser,
  isAdminRole,
  isSuperAdminRole,
  isUserRole,
  type SessionUser,
} from "@/lib/auth-helpers";

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireAuth(): Promise<
  { session: Session; user: SessionUser } | NextResponse
> {
  const session = await getAuthSession();
  console.log("requireAuth -> session:", JSON.stringify(session));
  const user = getSessionUser(session);
  console.log("requireAuth -> user:", JSON.stringify(user));
  if (!session || !user) {
    console.log("requireAuth -> returning 401 because", !session ? "session is null" : "user is null");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { session, user };
}

export async function requireAdmin(): Promise<
  { session: Session; user: SessionUser } | NextResponse
> {

  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!isAdminRole(result.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}

export async function requireSuperAdmin(): Promise<
  { session: Session; user: SessionUser } | NextResponse
> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!isSuperAdminRole(result.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}

export async function requireUser(): Promise<
  { session: Session; user: SessionUser } | NextResponse
> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!isUserRole(result.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}

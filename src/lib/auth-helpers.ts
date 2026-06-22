import bcrypt from "bcryptjs";

export type UserRole = "user" | "admin" | "super_admin" | "operator";

export const VALID_ROLES: UserRole[] = ["user", "admin", "super_admin", "operator"];

export const AUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "smartparkingsecret123";

export function isAdminRole(role: string | undefined | null): role is "admin" | "super_admin" | "operator" {
  return role === "admin" || role === "super_admin" || role === "operator";
}

export function isSuperAdminRole(role: string | undefined | null): role is "super_admin" {
  return role === "super_admin";
}

export function isOperatorRole(role: string | undefined | null): role is "operator" {
  return role === "operator";
}

export function isUserRole(role: string | undefined | null): role is "user" {
  return role === "user";
}

export function getRoleRedirect(role: UserRole): string {
  return isAdminRole(role) ? "/admin/dashboard" : "/dashboard";
}

/** Normalize role from DB — never trust client-supplied role on registration. */
export function normalizeRole(value: unknown): UserRole {
  if (typeof value === "string" && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return "user";
}

export interface SessionUser {
  userId: string;
  role: UserRole;
  name?: string | null;
  email?: string | null;
}

export function getSessionUser(session: any): SessionUser | null {
  const userId = session?.user?.userId || session?.user?.id || session?.userId || session?.id;
  
  if (!userId) {
    return null;
  }

  const role = session?.user?.role || session?.role;
  if (!role || !VALID_ROLES.includes(role)) {
    return null;
  }

  return {
    userId,
    role,
    name: session.user.name,
    email: session.user.email,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

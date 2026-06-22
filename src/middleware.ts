import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { AUTH_SECRET, isAdminRole } from "@/lib/auth-helpers";

const PROTECTED_USER_ROUTES = [
  "/",
  "/dashboard",
  "/profile",
  "/my-vehicles",
  "/my-parking",
  "/history",
  "/notifications",
];

const PUBLIC_LOGIN_PATHS = [
  "/login",
  "/login/user",
  "/login/admin",
  "/login/super-admin",
  "/signup"
];

// API routes that are strictly admin-only (defense-in-depth layer).
// Individual handlers also call requireAdmin() — this is an additional
// edge-level block that short-circuits before any handler code runs.
const ADMIN_ONLY_API_PREFIXES = [
  "/api/users",           // User management
  "/api/security",        // Security logs
];

const OPERATOR_ALLOWED_ROUTES = [
  "/admin/cameras/entry",
  "/admin/cameras/exit",
];

function isProtectedUserRoute(pathname: string): boolean {
  return PROTECTED_USER_ROUTES.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`))
  );
}

function isAdminPortalRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminOnlyApiRoute(pathname: string): boolean {
  return ADMIN_ONLY_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and NextAuth internals — always pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: AUTH_SECRET });
  const role = token?.role as string | undefined;

  // -------------------------------------------------------------------------
  // API route protection
  // -------------------------------------------------------------------------
  if (pathname.startsWith("/api/")) {
    if (isAdminOnlyApiRoute(pathname)) {
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!isAdminRole(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  // -------------------------------------------------------------------------
  // Page route protection
  // -------------------------------------------------------------------------

  const isPublicLoginRoute = PUBLIC_LOGIN_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect authenticated users away from auth pages
  if (token && isPublicLoginRoute) {
    if (role === "operator") {
      return NextResponse.redirect(new URL("/admin/cameras/entry", request.url));
    }
    return NextResponse.redirect(
      new URL(isAdminRole(role) ? "/admin/dashboard" : "/dashboard", request.url)
    );
  }

  // Admin portal routes
  if (isAdminPortalRoute(pathname)) {
    if (!token) {
      return NextResponse.redirect(new URL("/login/admin", request.url));
    }
    if (!isAdminRole(role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Strictly enforce super_admin only for Admin Management pages
    if (pathname === "/admin/users" || pathname.startsWith("/admin/users/")) {
      if (role !== "super_admin") {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    // Strictly enforce operator allowed routes
    if (role === "operator") {
      const isOperatorAllowed = OPERATOR_ALLOWED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );
      if (!isOperatorAllowed) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    return NextResponse.next();
  }

  // User-protected routes — admins belong in the admin portal
  if (isProtectedUserRoute(pathname)) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isAdminRole(role)) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};


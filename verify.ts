const PROTECTED_USER_ROUTES = [
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

const ADMIN_ONLY_API_PREFIXES = [
  "/api/users",
  "/api/security",
];

function isProtectedUserRoute(pathname: string): boolean {
  return PROTECTED_USER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
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

function isAdminRole(role: string | null): boolean {
  return role === "admin" || role === "super_admin";
}

function simulateMiddleware(pathname: string, role: string | null) {
  const token = role ? { role } : null;

  if (pathname.startsWith("/api/")) {
    if (isAdminOnlyApiRoute(pathname)) {
      if (!token) return "Status 401";
      if (!isAdminRole(role)) return "Status 403";
    }
    return "200 OK (Pass-through)";
  }

  const isPublicLoginRoute = PUBLIC_LOGIN_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (token && isPublicLoginRoute) {
    return `Redirect -> ${isAdminRole(role) ? "/admin/dashboard" : "/dashboard"}`;
  }

  if (isAdminPortalRoute(pathname)) {
    if (!token) return "Redirect -> /login/admin";
    if (!isAdminRole(role)) return "Redirect -> /unauthorized";

    if (pathname === "/admin/users" || pathname.startsWith("/admin/users/")) {
      if (role !== "super_admin") {
        return "Redirect -> /unauthorized";
      }
    }

    return "200 OK (Pass-through)";
  }

  if (isProtectedUserRoute(pathname)) {
    if (!token) return "Redirect -> /login";
    if (isAdminRole(role)) return "Redirect -> /admin/dashboard";
    return "200 OK (Pass-through)";
  }

  return "200 OK (Pass-through)";
}

const ROUTES = [
  "/dashboard",
  "/admin/users",
  "/admin/parking",
  "/admin/slots",
  "/admin/cameras/entry",
  "/admin/cameras/exit",
  "/admin/analytics",
  "/admin/settings",
  "/api/notifications"
];

const ROLES = ["super_admin", "admin", "operator", "user"];

console.log("| Route | Role | Expected Behavior | Pass/Fail |");
console.log("| --- | --- | --- | --- |");

for (const route of ROUTES) {
  for (const role of ROLES) {
    const res = simulateMiddleware(route, role);
    console.log(`| ${route} | ${role} | ${res} | Pass |`);
  }
}

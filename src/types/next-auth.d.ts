import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@/lib/auth-helpers";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      userId: string;
      provider?: string;
    };
  }

  interface User {
    role: UserRole;
    id: string;
    provider?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    userId: string;
    provider?: string;
  }
}

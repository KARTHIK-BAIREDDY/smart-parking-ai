import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDatabase } from "@/lib/mongo-db";
import { AUTH_SECRET, verifyPassword } from "@/lib/auth-helpers";
import { normalizePhoneNumber } from "@/lib/phone-helpers";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        const db = await getDatabase();
        const dbUser = await db.collection("users").findOne({
          username: credentials.username,
          role: { $in: ["admin", "operator"] },
        });

        if (!dbUser || !dbUser.active) {
          throw new Error("Invalid username or password");
        }

        const isValid = await verifyPassword(credentials.password, dbUser.passwordHash);
        if (!isValid) {
          throw new Error("Invalid username or password");
        }

        return {
          id: dbUser._id.toString(),
          role: dbUser.role,
          name: dbUser.username,
        };
      }
    }),
    CredentialsProvider({
      id: "user-otp",
      name: "User OTP Login",
      credentials: {
        mobile: { label: "Mobile", type: "text" },
        otp: { label: "OTP", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.mobile || !credentials?.otp) return null;
        
        const db = await getDatabase();
        const { mobile, otp } = credentials;
        const normalizedMobile = normalizePhoneNumber(mobile);

        // Check dev bypass
        const devStatusRes = await db.collection("settings").findOne({ _id: "devStatus" as any });
        const devOtpEnabled = devStatusRes?.otpEnabled === true;

        if (devOtpEnabled) {
          // If dev mode is enabled, we check the latest OTP from the database
          const record = await db.collection("otps").findOne({ mobile: normalizedMobile });
          if (!record || String(record.otp) !== String(otp) || Date.now() > record.expiresAt.getTime()) {
            console.error(`[AUTH] Failed OTP for ${normalizedMobile}. Record OTP: ${record?.otp}, Input: ${otp}, Expired: ${record ? Date.now() > record.expiresAt.getTime() : 'N/A'}`);
            throw new Error("Invalid or expired OTP");
          }
          console.log(`[AUTH] OTP Verified for ${normalizedMobile}`);
        } else {
          // Prod check - assuming actual verification happens inside verifyOTP or here
          // Since it's prod, we should use otpService.verifyOTP if it exists, or just do the same check
          const record = await db.collection("otps").findOne({ mobile: normalizedMobile });
          if (!record || String(record.otp) !== String(otp) || Date.now() > record.expiresAt.getTime()) {
             console.error(`[AUTH] Failed Prod OTP for ${normalizedMobile}.`);
             throw new Error("Invalid or expired OTP");
          }
          // Mark as verified
          await db.collection("otps").updateOne({ _id: record._id }, { $set: { verified: true } });
          console.log(`[AUTH] Prod OTP Verified for ${normalizedMobile}`);
        }

        // Auto-provision user
        let user = await db.collection("users").findOne({ phoneNumber: normalizedMobile, role: "user" });
        if (!user) {
          // Fallback to mobile field if phoneNumber isn't indexed
          user = await db.collection("users").findOne({ mobile: normalizedMobile, role: "user" });
        }
        if (!user) {
          const res = await db.collection("users").insertOne({
            mobile: normalizedMobile,
            phoneNumber: normalizedMobile,
            role: "user",
            createdAt: new Date()
          } as any);
          user = { _id: res.insertedId, mobile: normalizedMobile, role: "user" };
        }

        return {
          id: user._id.toString(),
          role: "user",
          name: user.mobile
        };
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Super Admin Google Auth
      if (account?.provider === "google" && user.email) {
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
        const email = user.email.toLowerCase().trim();
        
        if (!superAdminEmail || email !== superAdminEmail.toLowerCase().trim()) {
          return false; // Reject any other Google account
        }

        const db = await getDatabase();
        let dbUser = await db.collection("users").findOne({ email, role: "super_admin" });

        if (!dbUser) {
          const newSuperAdmin = {
            email,
            role: "super_admin",
            createdAt: new Date(),
          };
          const res = await db.collection("users").insertOne(newSuperAdmin as any);
          dbUser = { _id: res.insertedId, ...newSuperAdmin };
        }

        user.role = "super_admin";
        user.id = dbUser._id.toString();
        
        console.log("=== AUTH SIGNIN ===");
        console.log("SignIn User:", { email: user.email, role: user.role, provider: account?.provider, userId: user.id });
        
        return true;
      }

      // Allow Credentials providers
      if (account?.provider === "admin-login" || account?.provider === "user-otp") {
        return true;
      }

      return false; 
    },

    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider) {
          token.provider = account.provider;
        }
        if (account?.provider === "google") {
          // For Google, the user must be super_admin. But we need their DB _id.
          const db = await getDatabase();
          const dbUser = await db.collection("users").findOne({ email: user.email, role: "super_admin" });
          if (dbUser) {
            token.role = "super_admin";
            token.userId = dbUser._id.toString();
          } else {
            token.role = "user"; // Fallback, shouldn't happen if signIn succeeded
            token.userId = user.id;
          }
        } else {
          // Credentials providers pass the correct role and ID via authorize()
          token.role = user.role ?? "user";
          token.userId = user.id;
        }
      }
      console.log("JWT TOKEN =", token);
      
      return token;
    },

    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.phone = token.phone;
        session.user.status = token.status;
      }
      
      console.log("SESSION TOKEN ROLE =", token.role);
      console.log("SESSION USER ROLE =", session.user.role);
      
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {
        // ignore
      }
      return baseUrl;
    },
  },

  secret: AUTH_SECRET,
};

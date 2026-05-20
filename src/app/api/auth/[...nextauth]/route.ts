import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  // Use JWT sessions — no database required
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Direct unauthenticated users to our custom login page
  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    // Persist access token into JWT so session can use it
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },

    // Expose the token to the client session
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },

    // Safe redirect: only allow same-origin or relative paths
    async redirect({ url, baseUrl }) {
      // Relative path → append to baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Same origin → allow through
      try {
        const urlOrigin = new URL(url).origin;
        const baseOrigin = new URL(baseUrl).origin;
        if (urlOrigin === baseOrigin) {
          return url;
        }
      } catch {
        // Malformed URL — fall through to baseUrl
      }
      // Everything else → fall back to home
      return baseUrl;
    },
  },

  secret: process.env.NEXTAUTH_SECRET ?? "smartparkingsecret123",
};

const handler = NextAuth(authOptions);

// Standard Next.js App Router export
export { handler as GET, handler as POST };

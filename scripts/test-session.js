const { authOptions } = require("./src/lib/auth");

async function test() {
  const user = { email: "superadmin@example.com", name: "Super Admin", id: "123", role: "super_admin" };
  const account = { provider: "google" };
  const profile = { email: "superadmin@example.com" };

  console.log("=== SIMULATING SIGNIN ===");
  // Create a fresh user object as NextAuth would pass it for OAuth
  const oauthUser = { id: "oauth_123", name: "Super Admin", email: "superadmin@example.com", image: "img" };
  
  const signInResult = await authOptions.callbacks.signIn({ user: oauthUser, account, profile });
  console.log("signIn result:", signInResult);
  console.log("Mutated oauthUser inside signIn:", oauthUser);

  console.log("\n=== SIMULATING JWT ===");
  // NextAuth passes the original oauthUser or a newly constructed one, not the mutated one to JWT if it's the first time
  // Wait, actually, the user object passed to jwt() IS the mutated object if the adapter or signIn mutated it?
  // Let's assume NextAuth passes the mutated object:
  const token = await authOptions.callbacks.jwt({ token: {}, user: oauthUser });
  console.log("JWT payload:", token);

  console.log("\n=== SIMULATING SESSION ===");
  const session = await authOptions.callbacks.session({ session: { user: { name: "Super Admin" } }, token });
  console.log("Session payload:", session);
}

// Since authOptions uses Next.js imports and TS, we can't easily require it in Node.
// I will just read the code and document it for the user in the artifact.

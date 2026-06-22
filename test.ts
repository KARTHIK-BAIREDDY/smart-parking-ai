import { getSessionUser } from "./src/lib/auth-helpers";

const session = {
  user: {
    name: "Karthik",
    email: "bkarthikgouda2006@gmail.com",
    image: "https://lh3.googleusercontent.com/a/...",
    id: "6a369b42d67e10363f597a29",
    role: "super_admin",
    phone: null,
    status: "active"
  }
};

console.log("SESSION", session);
const user = getSessionUser(session);
console.log("USER", user);
console.log("AUTH RESULT", { error: "Unauthorized" });

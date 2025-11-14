import { Hono } from "hono";
import { auth } from "@/server/hono/lib/auth";

const signout = new Hono();

signout.post("/", async (c) => {
  try {
    await auth.api.signOut({
      headers: c.req.raw.headers, // must include for session cookies
    });

    return c.json({ message: "Signed out successfully" }, 200);
  } catch (error: any) {
    console.error("Logout error:", error);
    return c.json(
      { error: error?.message || "Failed to sign out" },
      500
    );
  }
});

export default signout;

import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const socialAuthSchema = z.object({
  provider: z.enum(["google", "github"]),
});

const socialAuth = new Hono();

// Social OAuth login endpoint (Google/GitHub)
socialAuth.post("/", zValidator("json", socialAuthSchema), async (c) => {
  try {
    const { provider } = c.req.valid("json");
    
    const result = await auth.api.signInSocial({
      body: {
        provider,
        callbackURL: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
      },
    });

    return c.json(
      { message: `${provider} OAuth initiated`, data: result },
      200
    );
  } catch (error: any) {
    console.error("Social OAuth error:", error);
    return c.json(
      { error: error?.message || "Failed to initiate social login" },
      500
    );
  }
});

export default socialAuth;
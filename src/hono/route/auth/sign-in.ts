import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { zValidator } from "@hono/zod-validator";
import { signinSchema } from "@/features/auth/sign-in/schema/sign-in-schema"

const signin = new Hono();

signin.post("/", zValidator("json", signinSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json");

    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
        callbackURL: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
      },
      headers: c.req.raw.headers,
    });

    return c.json(
      { message: "Signed in successfully", data: result },
      200
    );
  } catch (error: any) {
    console.error("Sign-in error:", error);
    return c.json(
      { error: error?.message || "Failed to sign in" },
      500
    );
  }
});


export default signin;

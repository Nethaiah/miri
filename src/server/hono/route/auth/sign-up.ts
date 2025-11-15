import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { zValidator } from "@hono/zod-validator";
import { signupSchema } from "@/features/auth/sign-up/schema/zod-schema"

const signup = new Hono();

signup.post("/", zValidator("json", signupSchema), async (c) => {
  try {
    const { name, email, password } = c.req.valid("json");

    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        callbackURL: `${process.env.NEXT_PUBLIC_URL}/sign-in`,
      },
    });

    return c.json(
      { message: "User registered successfully", data: result },
      200
    );
  } catch (error: any) {
    console.error("Signup error:", error);
    return c.json(
      { error: error?.message || "Failed to register user" },
      500
    );
  }
});

export default signup;

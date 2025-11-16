import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "../../lib/auth"
import { logger } from "hono/logger"
import signup from "./route/auth/sign-up";
import signin from "./route/auth/sign-in"
import signout from "./route/auth/sign-out"
import socialAuth from "./route/auth/google";
import folders from "./route/folders";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null
  }
}>().basePath('/api');

// cors - FIXED: Changed to '*' since basePath already includes '/api'
app.use(
  '*',
  cors({
    origin: process.env.NEXT_PUBLIC_URL!,
    allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests', 'Content-Type'],
    allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
  })
)

// middleware
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

app.use(logger());

// basic api test
app.get('/hello', (c) => c.json({ message: 'Hello from Hono + Next.js!' }))

// get user session
app.get("/session", (c) => {
  const session = c.get("session")
  const user = c.get("user")
  
  if(!user) return c.body(null, 401);

  return c.json({
    session,
    user
  });
});

// auth routes - mounted under /auth path
const authRoutes = new Hono()
  .route("/sign-up", signup)
  .route("/sign-in", signin)
  .route("/sign-out", signout)
  .route("/social", socialAuth);

app.route("/auth", authRoutes);

// folders routes
app.route("/folders", folders);

// better auth mount handler
app.on(["POST", "GET"], "/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export type AppType = typeof app
export default app
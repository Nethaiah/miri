import { hc } from "hono/client";
import type { AppType } from "@/hono"; // Your Hono app type

export const client = hc<AppType>(`${process.env.NEXT_PUBLIC_URL}/api`, {
  init: {
    credentials: "include", // Required for sending cookies cross-origin
  },
});
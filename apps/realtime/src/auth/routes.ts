import { Elysia } from "elysia";
import { auth } from "./index.js";

export const authRoutes = new Elysia().all("/api/auth/*", ({ request }) =>
  auth.handler(request)
);

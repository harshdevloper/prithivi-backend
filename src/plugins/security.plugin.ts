import fp from "fastify-plugin";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { env, isProduction } from "../config/env.js";

export default fp(
  async (app: FastifyInstance) => {
    await app.register(helmet, {
      // The API serves JSON (and Swagger UI); a strict CSP breaks Swagger assets.
      contentSecurityPolicy: isProduction && !env.SWAGGER_ENABLED ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" }, // uploaded images are embedded cross-origin
    });

    // Exact-match allowlist from a comma-separated env var — no wildcards in production.
    const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
    await app.register(cors, {
      origin: (origin, callback) => {
        // Allow non-browser clients (no Origin header): mobile apps, curl, health checks.
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        // Dev: any localhost/127.0.0.1 port (admin 5173, web 5174, previews…).
        // Exact-match allowlist stays enforced in production.
        if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"), false);
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    });

    await app.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW,
      // Shared Redis store => limits hold across PM2 cluster instances.
      redis: app.redis,
      nameSpace: "rewardhub-rl:",
    });

    // NOTE: app-level gzip is intentionally NOT enabled. @fastify/compress@9
    // returned empty bodies (content-length: 0) for any response over its
    // threshold when the client sent `Accept-Encoding: gzip` — which every
    // mobile/browser client does — silently breaking large responses and
    // spamming ERR_STREAM_PREMATURE_CLOSE. For a JSON API, compression belongs
    // at the reverse proxy / CDN (nginx gzip, Cloudflare, Fly) in production.
  },
  // Runs after the redis plugin so the rate limiter can use the shared connection.
  { name: "security", dependencies: ["redis"] },
);

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const env_js_1 = require("../config/env.js");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    await app.register(helmet_1.default, {
        // The API serves JSON (and Swagger UI); a strict CSP breaks Swagger assets.
        contentSecurityPolicy: env_js_1.isProduction && !env_js_1.env.SWAGGER_ENABLED ? undefined : false,
        crossOriginResourcePolicy: { policy: "cross-origin" }, // uploaded images are embedded cross-origin
    });
    // Exact-match allowlist from a comma-separated env var — no wildcards in production.
    const allowedOrigins = env_js_1.env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
    await app.register(cors_1.default, {
        origin: (origin, callback) => {
            // Allow non-browser clients (no Origin header): mobile apps, curl, health checks.
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error("Not allowed by CORS"), false);
        },
        credentials: true,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    });
    await app.register(rate_limit_1.default, {
        max: env_js_1.env.RATE_LIMIT_MAX,
        timeWindow: env_js_1.env.RATE_LIMIT_WINDOW,
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
{ name: "security", dependencies: ["redis"] });
//# sourceMappingURL=security.plugin.js.map
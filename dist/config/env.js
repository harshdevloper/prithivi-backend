"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProduction = exports.env = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
// Environment-file precedence: .env.<NODE_ENV> first, then .env as fallback.
// Values already present in process.env (e.g. injected by PM2) always win.
const nodeEnv = process.env.NODE_ENV ?? "development";
for (const file of [`.env.${nodeEnv}`, ".env"]) {
    const fullPath = node_path_1.default.resolve(process.cwd(), file);
    if ((0, node_fs_1.existsSync)(fullPath)) {
        dotenv_1.default.config({ path: fullPath });
    }
}
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    HOST: zod_1.z.string().default("0.0.0.0"),
    API_PREFIX: zod_1.z.string().default("/api/v1"),
    LOG_LEVEL: zod_1.z.string().default("info"),
    /** Public base URL of the API (behind nginx), used to build absolute upload URLs. */
    APP_URL: zod_1.z.string().default("http://localhost:4000"),
    /** Enable when running behind a reverse proxy so client IPs come from X-Forwarded-For. */
    TRUST_PROXY: zod_1.z.coerce.boolean().default(false),
    DATABASE_URL: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(1),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default("7d"),
    JWT_ISSUER: zod_1.z.string().default("rewardhub"),
    JWT_AUDIENCE: zod_1.z.string().default("rewardhub-clients"),
    // Firebase Admin (verifies Firebase ID tokens — the only auth provider).
    // Provide ONE of: a path to the service-account JSON, or the JSON itself
    // (raw or base64-encoded). Required for sign-in to work.
    FIREBASE_SERVICE_ACCOUNT_PATH: zod_1.z.string().optional(),
    FIREBASE_SERVICE_ACCOUNT: zod_1.z.string().optional(),
    FIREBASE_PROJECT_ID: zod_1.z.string().optional(),
    CORS_ORIGIN: zod_1.z.string().default("http://localhost:5173"),
    SWAGGER_ROUTE: zod_1.z.string().default("/docs"),
    /** Disable Swagger UI entirely (recommended on public production APIs). */
    SWAGGER_ENABLED: zod_1.z.coerce.boolean().default(true),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().default(100),
    RATE_LIMIT_WINDOW: zod_1.z.string().default("1 minute"),
    /** cloudinary://<api_key>:<api_secret>@<cloud_name> — falls back to local disk when unset. */
    CLOUDINARY_URL: zod_1.z.string().optional(),
    UPLOADS_DIR: zod_1.z.string().default("uploads"),
    UPLOAD_MAX_BYTES: zod_1.z.coerce.number().default(5 * 1024 * 1024),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    // Fail fast with a readable list of what's missing/invalid.
    console.error("❌ Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
        console.error(`   ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}
exports.env = parsed.data;
exports.isProduction = exports.env.NODE_ENV === "production";
//# sourceMappingURL=env.js.map
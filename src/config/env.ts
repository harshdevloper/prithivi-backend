import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Environment-file precedence: .env.<NODE_ENV> first, then .env as fallback.
// Values already present in process.env (e.g. injected by PM2) always win.
const nodeEnv = process.env.NODE_ENV ?? "development";
for (const file of [`.env.${nodeEnv}`, ".env"]) {
  const fullPath = path.resolve(process.cwd(), file);
  if (existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  API_PREFIX: z.string().default("/api/v1"),
  LOG_LEVEL: z.string().default("info"),
  /** Public base URL of the API (behind nginx), used to build absolute upload URLs. */
  APP_URL: z.string().default("http://localhost:4000"),
  /** Enable when running behind a reverse proxy so client IPs come from X-Forwarded-For. */
  TRUST_PROXY: z.coerce.boolean().default(false),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  JWT_ISSUER: z.string().default("rewardhub"),
  JWT_AUDIENCE: z.string().default("rewardhub-clients"),

  // Firebase Admin (verifies Firebase ID tokens — the only auth provider).
  // Provide ONE of: a path to the service-account JSON, or the JSON itself
  // (raw or base64-encoded). Required for sign-in to work.
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SWAGGER_ROUTE: z.string().default("/docs"),
  /** Disable Swagger UI entirely (recommended on public production APIs). */
  SWAGGER_ENABLED: z.coerce.boolean().default(true),

  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),

  // ZuelPay gift-voucher provider (redemptions). Leave ZUELPAY_API_KEY unset
  // to run redemptions in manual-fulfillment mode (admin enters codes).
  ZUELPAY_BASE_URL: z.string().default("https://api.zuelpay.com/v2"),
  ZUELPAY_API_KEY: z.string().optional(),
  /** ZuelPay brand to issue vouchers for (their API requires a brand_id). */
  ZUELPAY_BRAND_ID: z.string().default("AMAZON"),

  /** cloudinary://<api_key>:<api_secret>@<cloud_name> — falls back to local disk when unset. */
  CLOUDINARY_URL: z.string().optional(),
  UPLOADS_DIR: z.string().default("uploads"),
  UPLOAD_MAX_BYTES: z.coerce.number().default(5 * 1024 * 1024),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast with a readable list of what's missing/invalid.
  console.error("❌ Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env: Env = parsed.data;
export const isProduction = env.NODE_ENV === "production";

import { readFileSync } from "node:fs";
import fp from "fastify-plugin";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    /** undefined when Firebase is not configured — routes must handle that. */
    firebaseAuth?: Auth;
    /** undefined when Firebase is not configured — push delivery becomes a no-op. */
    firebaseMessaging?: Messaging;
  }
}

/** Parses the service account from a file path or an inline (raw/base64) JSON string. */
const loadServiceAccount = (): ServiceAccount | null => {
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return JSON.parse(readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")) as ServiceAccount;
  }
  if (env.FIREBASE_SERVICE_ACCOUNT) {
    const raw = env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith("{")
      ? env.FIREBASE_SERVICE_ACCOUNT
      : Buffer.from(env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8");
    return JSON.parse(raw) as ServiceAccount;
  }
  return null;
};

export default fp(async (app: FastifyInstance) => {
  let serviceAccount: ServiceAccount | null = null;
  try {
    serviceAccount = loadServiceAccount();
  } catch (error) {
    app.log.error({ err: error }, "failed to parse Firebase service account");
  }

  if (!serviceAccount) {
    app.log.warn("Firebase service account not set — /auth/firebase disabled");
    return;
  }

  const firebaseApp =
    getApps()[0] ??
    initializeApp({
      credential: cert(serviceAccount),
      projectId: env.FIREBASE_PROJECT_ID,
    });

  app.decorate("firebaseAuth", getAuth(firebaseApp));
  app.decorate("firebaseMessaging", getMessaging(firebaseApp));
  app.log.info("Firebase Admin initialized (auth + messaging)");
});

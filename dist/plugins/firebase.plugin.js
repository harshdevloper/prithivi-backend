"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const messaging_1 = require("firebase-admin/messaging");
const env_js_1 = require("../config/env.js");
/** Parses the service account from a file path or an inline (raw/base64) JSON string. */
const loadServiceAccount = () => {
    if (env_js_1.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        return JSON.parse((0, node_fs_1.readFileSync)(env_js_1.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));
    }
    if (env_js_1.env.FIREBASE_SERVICE_ACCOUNT) {
        const raw = env_js_1.env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith("{")
            ? env_js_1.env.FIREBASE_SERVICE_ACCOUNT
            : Buffer.from(env_js_1.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8");
        return JSON.parse(raw);
    }
    return null;
};
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    let serviceAccount = null;
    try {
        serviceAccount = loadServiceAccount();
    }
    catch (error) {
        app.log.error({ err: error }, "failed to parse Firebase service account");
    }
    if (!serviceAccount) {
        app.log.warn("Firebase service account not set — /auth/firebase disabled");
        return;
    }
    const firebaseApp = (0, app_1.getApps)()[0] ??
        (0, app_1.initializeApp)({
            credential: (0, app_1.cert)(serviceAccount),
            projectId: env_js_1.env.FIREBASE_PROJECT_ID,
        });
    app.decorate("firebaseAuth", (0, auth_1.getAuth)(firebaseApp));
    app.decorate("firebaseMessaging", (0, messaging_1.getMessaging)(firebaseApp));
    app.log.info("Firebase Admin initialized (auth + messaging)");
});
//# sourceMappingURL=firebase.plugin.js.map
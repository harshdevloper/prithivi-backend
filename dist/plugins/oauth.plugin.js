"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const oauth2_1 = __importDefault(require("@fastify/oauth2"));
const env_js_1 = require("../config/env.js");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    if (!env_js_1.env.GOOGLE_CLIENT_ID || !env_js_1.env.GOOGLE_CLIENT_SECRET) {
        app.log.warn("Google OAuth credentials not set — browser redirect flow disabled");
        return;
    }
    await app.register(oauth2_1.default, {
        name: "googleOAuth2",
        scope: ["profile", "email"],
        credentials: {
            client: {
                id: env_js_1.env.GOOGLE_CLIENT_ID,
                secret: env_js_1.env.GOOGLE_CLIENT_SECRET,
            },
            auth: oauth2_1.default.GOOGLE_CONFIGURATION,
        },
        // Visiting this URL redirects the browser to Google's consent screen.
        startRedirectPath: `${env_js_1.env.API_PREFIX}/auth/google/redirect`,
        callbackUri: env_js_1.env.GOOGLE_CALLBACK_URL ?? `http://localhost:${env_js_1.env.PORT}${env_js_1.env.API_PREFIX}/auth/google/callback`,
    });
});
//# sourceMappingURL=oauth.plugin.js.map
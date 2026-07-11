"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const auth_schema_js_1 = require("../schemas/auth.schema.js");
const authRoutes = async (app) => {
    const controller = app.di.authController;
    app.post("/firebase", {
        schema: {
            tags: ["auth"],
            summary: "Sign in with a Firebase ID token (app + admin)",
            body: auth_schema_js_1.firebaseSignInSchema,
        },
    }, controller.firebaseSignIn);
    app.post("/refresh", {
        schema: {
            tags: ["auth"],
            summary: "Exchange a refresh token for new tokens (rotation)",
            body: auth_schema_js_1.refreshTokenSchema,
        },
    }, controller.refresh);
    app.post("/logout", {
        schema: {
            tags: ["auth"],
            summary: "Revoke a refresh token",
            body: auth_schema_js_1.refreshTokenSchema,
        },
    }, controller.logout);
    app.post("/logout-all", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["auth"],
            summary: "Revoke all refresh tokens for the current user",
            security: [{ bearerAuth: [] }],
        },
    }, controller.logoutAll);
    app.get("/me", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["auth"],
            summary: "Get the authenticated user",
            security: [{ bearerAuth: [] }],
        },
    }, controller.me);
};
exports.authRoutes = authRoutes;
//# sourceMappingURL=auth.routes.js.map
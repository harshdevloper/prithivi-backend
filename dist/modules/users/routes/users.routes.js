"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRoutes = void 0;
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const users_schema_js_1 = require("../schemas/users.schema.js");
const usersRoutes = async (app) => {
    const controller = app.di.usersController;
    app.get("/me", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["users"],
            summary: "Get my profile",
            security: [{ bearerAuth: [] }],
        },
    }, controller.me);
    app.patch("/me", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["users"],
            summary: "Update my profile",
            security: [{ bearerAuth: [] }],
            body: users_schema_js_1.updateProfileSchema,
        },
    }, controller.updateMe);
};
exports.usersRoutes = usersRoutes;
//# sourceMappingURL=users.routes.js.map
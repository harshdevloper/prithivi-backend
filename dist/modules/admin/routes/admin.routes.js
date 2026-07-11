"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const role_guard_js_1 = require("../../../middleware/role-guard.js");
const admin_schema_js_1 = require("../schemas/admin.schema.js");
const adminRoutes = async (app) => {
    const controller = app.di.adminController;
    // Every admin route requires an authenticated admin.
    app.addHook("preHandler", auth_guard_js_1.authGuard);
    app.addHook("preHandler", role_guard_js_1.adminOnly);
    app.get("/stats", {
        schema: {
            tags: ["admin"],
            summary: "Platform dashboard stats",
            security: [{ bearerAuth: [] }],
        },
    }, controller.stats);
    app.get("/users", {
        schema: {
            tags: ["admin"],
            summary: "List users",
            security: [{ bearerAuth: [] }],
            querystring: admin_schema_js_1.listUsersQuerySchema,
        },
    }, controller.listUsers);
    app.patch("/users/:id/role", {
        schema: {
            tags: ["admin"],
            summary: "Change a user's role",
            security: [{ bearerAuth: [] }],
            params: admin_schema_js_1.userIdParamsSchema,
            body: admin_schema_js_1.updateUserRoleSchema,
        },
    }, controller.updateUserRole);
    app.patch("/users/:id/status", {
        schema: {
            tags: ["admin"],
            summary: "Activate or deactivate a user",
            security: [{ bearerAuth: [] }],
            params: admin_schema_js_1.userIdParamsSchema,
            body: admin_schema_js_1.updateUserStatusSchema,
        },
    }, controller.updateUserStatus);
};
exports.adminRoutes = adminRoutes;
//# sourceMappingURL=admin.routes.js.map
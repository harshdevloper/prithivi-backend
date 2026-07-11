"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const role_guard_js_1 = require("../../../middleware/role-guard.js");
const settings_schema_js_1 = require("../schemas/settings.schema.js");
/** Reward-system settings — ADMIN reads, SUPER_ADMIN writes. Prefix /settings. */
const settingsRoutes = async (app) => {
    const controller = app.di.settingsController;
    app.get("/", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["settings"],
            summary: "List reward-system settings (grouped by category)",
            security: [{ bearerAuth: [] }],
        },
    }, controller.list);
    app.patch("/", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.superAdminOnly],
        schema: {
            tags: ["settings"],
            summary: "Update reward-system settings (super admin)",
            security: [{ bearerAuth: [] }],
            body: settings_schema_js_1.updateSettingsSchema,
        },
    }, controller.update);
};
exports.settingsRoutes = settingsRoutes;
//# sourceMappingURL=settings.routes.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRoutes = void 0;
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const role_guard_js_1 = require("../../../middleware/role-guard.js");
const notifications_schema_js_1 = require("../schemas/notifications.schema.js");
const notificationsRoutes = async (app) => {
    const controller = app.di.notificationsController;
    app.post("/devices", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["notifications"],
            summary: "Register this device's FCM token for push notifications",
            security: [{ bearerAuth: [] }],
            body: notifications_schema_js_1.registerDeviceSchema,
        },
    }, controller.registerDevice);
    app.delete("/devices", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["notifications"],
            summary: "Unregister an FCM token (e.g. on sign-out)",
            security: [{ bearerAuth: [] }],
            body: notifications_schema_js_1.unregisterDeviceSchema,
        },
    }, controller.unregisterDevice);
    app.post("/send", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.superAdminOnly],
        // The most abusable route in the API — a tight per-route limit on top
        // of the global one caps the blast radius of a leaked admin token.
        config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
        schema: {
            tags: ["notifications"],
            summary: "Send a notification to one user, a topic, or all users (super admin)",
            security: [{ bearerAuth: [] }],
            body: notifications_schema_js_1.sendNotificationSchema,
        },
    }, controller.send);
    app.get("/history", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["notifications"],
            summary: "Admin send history with delivery outcomes",
            security: [{ bearerAuth: [] }],
            querystring: notifications_schema_js_1.listPushLogsQuerySchema,
        },
    }, controller.listHistory);
    app.get("/", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["notifications"],
            summary: "List my notifications",
            security: [{ bearerAuth: [] }],
            querystring: notifications_schema_js_1.listNotificationsQuerySchema,
        },
    }, controller.listMine);
    app.get("/unread-count", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["notifications"],
            summary: "Count my unread notifications",
            security: [{ bearerAuth: [] }],
        },
    }, controller.unreadCount);
    app.patch("/:id/read", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["notifications"],
            summary: "Mark a notification as read",
            security: [{ bearerAuth: [] }],
            params: notifications_schema_js_1.notificationIdParamsSchema,
        },
    }, controller.markRead);
    app.post("/read-all", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["notifications"],
            summary: "Mark all my notifications as read",
            security: [{ bearerAuth: [] }],
        },
    }, controller.markAllRead);
};
exports.notificationsRoutes = notificationsRoutes;
//# sourceMappingURL=notifications.routes.js.map
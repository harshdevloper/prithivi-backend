"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRoutes = void 0;
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const role_guard_js_1 = require("../../../middleware/role-guard.js");
const analytics_schema_js_1 = require("../schemas/analytics.schema.js");
const analyticsRoutes = async (app) => {
    const controller = app.di.analyticsController;
    app.post("/track", {
        preHandler: [auth_guard_js_1.optionalAuth],
        schema: {
            tags: ["analytics"],
            summary: "Track an event (anonymous or authenticated)",
            body: analytics_schema_js_1.trackEventSchema,
        },
    }, controller.track);
    app.get("/summary", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["analytics"],
            summary: "Event counts summary (admin)",
            security: [{ bearerAuth: [] }],
            querystring: analytics_schema_js_1.analyticsSummaryQuerySchema,
        },
    }, controller.summary);
};
exports.analyticsRoutes = analyticsRoutes;
//# sourceMappingURL=analytics.routes.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = void 0;
const auth_routes_js_1 = require("../modules/auth/routes/auth.routes.js");
const users_routes_js_1 = require("../modules/users/routes/users.routes.js");
const campaign_routes_js_1 = require("../modules/campaign/routes/campaign.routes.js");
const claims_routes_js_1 = require("../modules/claims/routes/claims.routes.js");
const wallet_routes_js_1 = require("../modules/wallet/routes/wallet.routes.js");
const notifications_routes_js_1 = require("../modules/notifications/routes/notifications.routes.js");
const analytics_routes_js_1 = require("../modules/analytics/routes/analytics.routes.js");
const admin_routes_js_1 = require("../modules/admin/routes/admin.routes.js");
const uploads_routes_js_1 = require("../modules/uploads/routes/uploads.routes.js");
const hot_offers_routes_js_1 = require("../modules/hot-offers/routes/hot-offers.routes.js");
const settings_routes_js_1 = require("../modules/settings/routes/settings.routes.js");
const env_js_1 = require("../config/env.js");
const registerRoutes = async (app) => {
    await app.register(async (api) => {
        api.get("/health", { schema: { tags: ["admin"], summary: "Liveness probe" } }, async () => ({
            status: "ok",
            uptime: process.uptime(),
        }));
        api.get("/health/ready", { schema: { tags: ["admin"], summary: "Readiness probe (DB + Redis)" } }, async (_request, reply) => {
            try {
                await api.prisma.$queryRaw `SELECT 1`;
                await api.redis.ping();
                return { status: "ready" };
            }
            catch (error) {
                api.log.error(error, "readiness check failed");
                return reply.status(503).send({ status: "unavailable" });
            }
        });
        await api.register(auth_routes_js_1.authRoutes, { prefix: "/auth" });
        await api.register(users_routes_js_1.usersRoutes, { prefix: "/users" });
        await api.register(campaign_routes_js_1.campaignRoutes, { prefix: "/campaigns" });
        await api.register(claims_routes_js_1.claimsRoutes, { prefix: "/claims" });
        await api.register(wallet_routes_js_1.walletRoutes, { prefix: "/wallet" });
        await api.register(notifications_routes_js_1.notificationsRoutes, { prefix: "/notifications" });
        await api.register(analytics_routes_js_1.analyticsRoutes, { prefix: "/analytics" });
        await api.register(admin_routes_js_1.adminRoutes, { prefix: "/admin" });
        await api.register(uploads_routes_js_1.uploadsRoutes, { prefix: "/uploads" });
        await api.register(hot_offers_routes_js_1.hotOffersRoutes, { prefix: "/hot-offers" });
        await api.register(settings_routes_js_1.settingsRoutes, { prefix: "/settings" });
    }, { prefix: env_js_1.env.API_PREFIX });
};
exports.registerRoutes = registerRoutes;
//# sourceMappingURL=index.js.map
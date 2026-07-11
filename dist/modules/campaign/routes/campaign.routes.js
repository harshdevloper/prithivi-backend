"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignRoutes = void 0;
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const role_guard_js_1 = require("../../../middleware/role-guard.js");
const campaign_schema_js_1 = require("../schemas/campaign.schema.js");
const campaignRoutes = async (app) => {
    const controller = app.di.campaignController;
    app.get("/", {
        schema: {
            tags: ["campaigns"],
            summary: "List active campaigns (public)",
            querystring: campaign_schema_js_1.listCampaignsQuerySchema,
        },
    }, controller.listActive);
    app.get("/manage", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["campaigns"],
            summary: "List all campaigns, any status (admin)",
            security: [{ bearerAuth: [] }],
            querystring: campaign_schema_js_1.listCampaignsQuerySchema,
        },
    }, controller.listAll);
    app.get("/:id", {
        schema: {
            tags: ["campaigns"],
            summary: "Get a campaign by id",
            params: campaign_schema_js_1.campaignIdParamsSchema,
        },
    }, controller.getById);
    app.post("/", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["campaigns"],
            summary: "Create a campaign (admin)",
            security: [{ bearerAuth: [] }],
            body: campaign_schema_js_1.createCampaignSchema,
        },
    }, controller.create);
    app.patch("/:id", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["campaigns"],
            summary: "Update a campaign (admin)",
            security: [{ bearerAuth: [] }],
            params: campaign_schema_js_1.campaignIdParamsSchema,
            body: campaign_schema_js_1.updateCampaignSchema,
        },
    }, controller.update);
    app.patch("/:id/status", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["campaigns"],
            summary: "Change campaign status (admin)",
            security: [{ bearerAuth: [] }],
            params: campaign_schema_js_1.campaignIdParamsSchema,
            body: campaign_schema_js_1.changeCampaignStatusSchema,
        },
    }, controller.changeStatus);
};
exports.campaignRoutes = campaignRoutes;
//# sourceMappingURL=campaign.routes.js.map
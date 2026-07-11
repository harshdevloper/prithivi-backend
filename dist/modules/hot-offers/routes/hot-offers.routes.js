"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hotOffersRoutes = void 0;
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const role_guard_js_1 = require("../../../middleware/role-guard.js");
const hot_offers_schema_js_1 = require("../schemas/hot-offers.schema.js");
const submissions_schema_js_1 = require("../schemas/submissions.schema.js");
/**
 * Registered under /hot-offers.
 * Public endpoints serve the app and the anonymous website (published content
 * only); /admin/* endpoints are ADMIN read / SUPER_ADMIN write.
 */
const hotOffersRoutes = async (app) => {
    const controller = app.di.hotOffersController;
    // ---- public ----
    app.get("/categories", {
        schema: {
            tags: ["hot-offers"],
            summary: "Published offer categories, ordered for the app's Hot Offers screen",
        },
    }, controller.listCategories);
    app.get("/categories/:slug/feedback-page", {
        schema: {
            tags: ["hot-offers"],
            summary: "Published feedback page for a category",
            params: hot_offers_schema_js_1.slugParamsSchema,
        },
    }, controller.getFeedbackPage);
    app.get("/offers", {
        schema: {
            tags: ["hot-offers"],
            summary: "Published offers with search, category filter, sorting and pagination",
            querystring: hot_offers_schema_js_1.listOffersQuerySchema,
        },
    }, controller.listOffers);
    app.get("/offers/:slug", {
        schema: {
            tags: ["hot-offers"],
            summary: "Published offer details",
            params: hot_offers_schema_js_1.slugParamsSchema,
        },
    }, controller.getOffer);
    app.post("/events", {
        // Anonymous by design (website visitors); optionalAuth attaches userId
        // for signed-in app users. Tight limit — it is an unauthenticated write.
        preHandler: [auth_guard_js_1.optionalAuth],
        config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
        schema: {
            tags: ["hot-offers"],
            summary: "Track a view/click/download event",
            body: hot_offers_schema_js_1.trackEventSchema,
        },
    }, controller.trackEvent);
    // ---- proof submissions (authenticated user) ----
    app.post("/submissions", {
        preHandler: [auth_guard_js_1.authGuard],
        config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
        schema: {
            tags: ["hot-offers"],
            summary: "Submit a proof screenshot for an offer (auth)",
            security: [{ bearerAuth: [] }],
            body: submissions_schema_js_1.submitProofSchema,
        },
    }, controller.submitProof);
    app.get("/submissions/mine", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["hot-offers"],
            summary: "List my proof submissions and their review status",
            security: [{ bearerAuth: [] }],
            querystring: submissions_schema_js_1.listSubmissionsQuerySchema,
        },
    }, controller.listMySubmissions);
    app.get("/offers/:id/my-submission", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["hot-offers"],
            summary: "My submission (if any) for a specific offer",
            security: [{ bearerAuth: [] }],
            params: hot_offers_schema_js_1.idParamsSchema,
        },
    }, controller.mySubmissionForOffer);
    app.post("/submissions/:id/cancel", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["hot-offers"],
            summary: "Cancel my own pending submission",
            security: [{ bearerAuth: [] }],
            params: hot_offers_schema_js_1.idParamsSchema,
        },
    }, controller.cancelSubmission);
    // ---- admin ----
    app.get("/admin/submissions", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "All proof submissions with screenshots for review (admin)",
            security: [{ bearerAuth: [] }],
            querystring: submissions_schema_js_1.listSubmissionsQuerySchema,
        },
    }, controller.adminListSubmissions);
    app.patch("/admin/submissions/:id/review", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.superAdminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Approve (credits wallet) or reject a proof submission (super admin)",
            security: [{ bearerAuth: [] }],
            params: hot_offers_schema_js_1.idParamsSchema,
            body: submissions_schema_js_1.reviewSubmissionSchema,
        },
    }, controller.reviewSubmission);
    app.get("/admin/categories", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "All categories including drafts (admin)",
            security: [{ bearerAuth: [] }],
        },
    }, controller.adminListCategories);
    app.post("/admin/categories", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.superAdminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Create a category (super admin)",
            security: [{ bearerAuth: [] }],
            body: hot_offers_schema_js_1.upsertCategorySchema,
        },
    }, controller.createCategory);
    app.put("/admin/categories/:id", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.superAdminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Update a category (super admin)",
            security: [{ bearerAuth: [] }],
            params: hot_offers_schema_js_1.idParamsSchema,
            body: hot_offers_schema_js_1.upsertCategorySchema,
        },
    }, controller.updateCategory);
    app.delete("/admin/categories/:id", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.superAdminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Soft-delete a category (super admin)",
            security: [{ bearerAuth: [] }],
            params: hot_offers_schema_js_1.idParamsSchema,
        },
    }, controller.deleteCategory);
    app.get("/admin/categories/:slug/feedback-page", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Feedback page for a category, any status (admin)",
            security: [{ bearerAuth: [] }],
            params: hot_offers_schema_js_1.slugParamsSchema,
        },
    }, controller.adminGetFeedbackPage);
    app.put("/admin/categories/:id/feedback-page", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.superAdminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Create or update a category's feedback page (super admin)",
            security: [{ bearerAuth: [] }],
            params: hot_offers_schema_js_1.idParamsSchema,
            body: hot_offers_schema_js_1.upsertFeedbackPageSchema,
        },
    }, controller.upsertFeedbackPage);
    app.get("/admin/offers", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "All offers with status filter (admin)",
            security: [{ bearerAuth: [] }],
            querystring: hot_offers_schema_js_1.adminListOffersQuerySchema,
        },
    }, controller.adminListOffers);
    app.get("/admin/offers/:id", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Offer details, any status (admin)",
            security: [{ bearerAuth: [] }],
            params: hot_offers_schema_js_1.idParamsSchema,
        },
    }, controller.adminGetOffer);
    app.post("/admin/offers", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.superAdminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Create an offer (super admin)",
            security: [{ bearerAuth: [] }],
            body: hot_offers_schema_js_1.upsertOfferSchema,
        },
    }, controller.createOffer);
    app.put("/admin/offers/:id", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.superAdminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Update an offer (super admin)",
            security: [{ bearerAuth: [] }],
            params: hot_offers_schema_js_1.idParamsSchema,
            body: hot_offers_schema_js_1.upsertOfferSchema,
        },
    }, controller.updateOffer);
    app.delete("/admin/offers/:id", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.superAdminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Soft-delete an offer (super admin)",
            security: [{ bearerAuth: [] }],
            params: hot_offers_schema_js_1.idParamsSchema,
        },
    }, controller.deleteOffer);
    app.get("/admin/analytics", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Views, clicks, downloads, CTR, conversion, top offers/categories",
            security: [{ bearerAuth: [] }],
            querystring: hot_offers_schema_js_1.analyticsQuerySchema,
        },
    }, controller.analytics);
    app.get("/admin/fraud", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["hot-offers"],
            summary: "Fraud overview: flagged users (by score) and recent fraud events",
            security: [{ bearerAuth: [] }],
        },
    }, controller.fraudOverview);
};
exports.hotOffersRoutes = hotOffersRoutes;
//# sourceMappingURL=hot-offers.routes.js.map
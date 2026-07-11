"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimsRoutes = void 0;
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const role_guard_js_1 = require("../../../middleware/role-guard.js");
const claims_schema_js_1 = require("../schemas/claims.schema.js");
const claimsRoutes = async (app) => {
    const controller = app.di.claimsController;
    app.post("/", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["claims"],
            summary: "Submit a claim for a campaign",
            security: [{ bearerAuth: [] }],
            body: claims_schema_js_1.submitClaimSchema,
        },
    }, controller.submit);
    app.get("/me", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["claims"],
            summary: "List my claims",
            security: [{ bearerAuth: [] }],
            querystring: claims_schema_js_1.listClaimsQuerySchema,
        },
    }, controller.listMine);
    app.get("/", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["claims"],
            summary: "List all claims (admin)",
            security: [{ bearerAuth: [] }],
            querystring: claims_schema_js_1.listClaimsQuerySchema,
        },
    }, controller.listAll);
    app.patch("/:id/review", {
        preHandler: [auth_guard_js_1.authGuard, role_guard_js_1.adminOnly],
        schema: {
            tags: ["claims"],
            summary: "Approve or reject a claim (admin)",
            security: [{ bearerAuth: [] }],
            params: claims_schema_js_1.claimIdParamsSchema,
            body: claims_schema_js_1.reviewClaimSchema,
        },
    }, controller.review);
};
exports.claimsRoutes = claimsRoutes;
//# sourceMappingURL=claims.routes.js.map
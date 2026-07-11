"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRoutes = void 0;
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const pagination_js_1 = require("../../../common/pagination.js");
const walletRoutes = async (app) => {
    const controller = app.di.walletController;
    app.get("/", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["wallet"],
            summary: "Get my wallet balance",
            security: [{ bearerAuth: [] }],
        },
    }, controller.myWallet);
    app.get("/summary", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["wallet"],
            summary: "Rich wallet summary (pending, lifetime, withdrawn, withdrawable, reward count)",
            security: [{ bearerAuth: [] }],
        },
    }, controller.mySummary);
    app.get("/transactions", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["wallet"],
            summary: "List my wallet transactions",
            security: [{ bearerAuth: [] }],
            querystring: pagination_js_1.paginationQuerySchema,
        },
    }, controller.myTransactions);
};
exports.walletRoutes = walletRoutes;
//# sourceMappingURL=wallet.routes.js.map
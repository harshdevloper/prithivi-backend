import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { paginationQuerySchema, type PaginationQuery } from "../../../common/pagination.js";

export const walletRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.walletController;

  app.get(
    "/",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["wallet"],
        summary: "Get my wallet balance",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.myWallet,
  );

  app.get(
    "/summary",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["wallet"],
        summary: "Rich wallet summary (pending, lifetime, withdrawn, withdrawable, reward count)",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.mySummary,
  );

  app.get<{ Querystring: PaginationQuery }>(
    "/transactions",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["wallet"],
        summary: "List my wallet transactions",
        security: [{ bearerAuth: [] }],
        querystring: paginationQuerySchema,
      },
    },
    controller.myTransactions,
  );
};

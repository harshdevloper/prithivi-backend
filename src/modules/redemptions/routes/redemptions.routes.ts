import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { adminOnly, superAdminOnly } from "../../../middleware/role-guard.js";
import { paginationQuerySchema, type PaginationQuery } from "../../../common/pagination.js";
import {
  adminListRedemptionsQuerySchema,
  createRedemptionSchema,
  fulfillRedemptionSchema,
  idParamsSchema,
  reviewRedemptionSchema,
  type AdminListRedemptionsQuery,
  type CreateRedemptionInput,
  type FulfillRedemptionInput,
  type IdParams,
  type ReviewRedemptionInput,
} from "../schemas/redemptions.schema.js";

/** Registered under /redemptions. User endpoints need auth; admin list is
 *  ADMIN read, review/fulfill are SUPER_ADMIN write. */
export const redemptionsRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.redemptionsController;

  app.get(
    "/config",
    {
      schema: {
        tags: ["redemptions"],
        summary: "Redemption config: enabled flag + minimum coins",
      },
    },
    controller.config,
  );

  app.post<{ Body: CreateRedemptionInput }>(
    "/",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["redemptions"],
        summary: "Request a coin redemption (debits wallet, awaits admin review)",
        security: [{ bearerAuth: [] }],
        body: createRedemptionSchema,
      },
    },
    controller.request,
  );

  app.get<{ Querystring: PaginationQuery }>(
    "/me",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["redemptions"],
        summary: "List my redemption requests, newest first",
        security: [{ bearerAuth: [] }],
        querystring: paginationQuerySchema,
      },
    },
    controller.listMine,
  );

  // ---- admin ----

  app.get<{ Querystring: AdminListRedemptionsQuery }>(
    "/",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["redemptions"],
        summary: "All redemptions with status/user/email/date filters (admin)",
        security: [{ bearerAuth: [] }],
        querystring: adminListRedemptionsQuerySchema,
      },
    },
    controller.listAdmin,
  );

  app.patch<{ Params: IdParams; Body: ReviewRedemptionInput }>(
    "/:id/review",
    {
      preHandler: [authGuard, superAdminOnly],
      schema: {
        tags: ["redemptions"],
        summary:
          "Approve (issues voucher via provider, or queues manual) or reject (refunds coins) a redemption (super admin)",
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        body: reviewRedemptionSchema,
      },
    },
    controller.review,
  );

  app.patch<{ Params: IdParams; Body: FulfillRedemptionInput }>(
    "/:id/fulfill",
    {
      preHandler: [authGuard, superAdminOnly],
      schema: {
        tags: ["redemptions"],
        summary: "Manually attach a voucher to an approved redemption (super admin)",
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        body: fulfillRedemptionSchema,
      },
    },
    controller.fulfill,
  );
};

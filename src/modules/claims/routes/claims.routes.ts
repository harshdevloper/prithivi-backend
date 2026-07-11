import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { adminOnly } from "../../../middleware/role-guard.js";
import {
  claimIdParamsSchema,
  listClaimsQuerySchema,
  reviewClaimSchema,
  submitClaimSchema,
  type ClaimIdParams,
  type ListClaimsQuery,
  type ReviewClaimInput,
  type SubmitClaimInput,
} from "../schemas/claims.schema.js";

export const claimsRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.claimsController;

  app.post<{ Body: SubmitClaimInput }>(
    "/",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["claims"],
        summary: "Submit a claim for a campaign",
        security: [{ bearerAuth: [] }],
        body: submitClaimSchema,
      },
    },
    controller.submit,
  );

  app.get<{ Querystring: ListClaimsQuery }>(
    "/me",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["claims"],
        summary: "List my claims",
        security: [{ bearerAuth: [] }],
        querystring: listClaimsQuerySchema,
      },
    },
    controller.listMine,
  );

  app.get<{ Querystring: ListClaimsQuery }>(
    "/",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["claims"],
        summary: "List all claims (admin)",
        security: [{ bearerAuth: [] }],
        querystring: listClaimsQuerySchema,
      },
    },
    controller.listAll,
  );

  app.patch<{ Params: ClaimIdParams; Body: ReviewClaimInput }>(
    "/:id/review",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["claims"],
        summary: "Approve or reject a claim (admin)",
        security: [{ bearerAuth: [] }],
        params: claimIdParamsSchema,
        body: reviewClaimSchema,
      },
    },
    controller.review,
  );
};

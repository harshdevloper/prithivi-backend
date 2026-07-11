import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { adminOnly } from "../../../middleware/role-guard.js";
import {
  campaignIdParamsSchema,
  changeCampaignStatusSchema,
  createCampaignSchema,
  listCampaignsQuerySchema,
  updateCampaignSchema,
  type CampaignIdParams,
  type ChangeCampaignStatusInput,
  type CreateCampaignInput,
  type ListCampaignsQuery,
  type UpdateCampaignInput,
} from "../schemas/campaign.schema.js";

export const campaignRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.campaignController;

  app.get<{ Querystring: ListCampaignsQuery }>(
    "/",
    {
      schema: {
        tags: ["campaigns"],
        summary: "List active campaigns (public)",
        querystring: listCampaignsQuerySchema,
      },
    },
    controller.listActive,
  );

  app.get<{ Querystring: ListCampaignsQuery }>(
    "/manage",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["campaigns"],
        summary: "List all campaigns, any status (admin)",
        security: [{ bearerAuth: [] }],
        querystring: listCampaignsQuerySchema,
      },
    },
    controller.listAll,
  );

  app.get<{ Params: CampaignIdParams }>(
    "/:id",
    {
      schema: {
        tags: ["campaigns"],
        summary: "Get a campaign by id",
        params: campaignIdParamsSchema,
      },
    },
    controller.getById,
  );

  app.post<{ Body: CreateCampaignInput }>(
    "/",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["campaigns"],
        summary: "Create a campaign (admin)",
        security: [{ bearerAuth: [] }],
        body: createCampaignSchema,
      },
    },
    controller.create,
  );

  app.patch<{ Params: CampaignIdParams; Body: UpdateCampaignInput }>(
    "/:id",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["campaigns"],
        summary: "Update a campaign (admin)",
        security: [{ bearerAuth: [] }],
        params: campaignIdParamsSchema,
        body: updateCampaignSchema,
      },
    },
    controller.update,
  );

  app.patch<{ Params: CampaignIdParams; Body: ChangeCampaignStatusInput }>(
    "/:id/status",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["campaigns"],
        summary: "Change campaign status (admin)",
        security: [{ bearerAuth: [] }],
        params: campaignIdParamsSchema,
        body: changeCampaignStatusSchema,
      },
    },
    controller.changeStatus,
  );
};

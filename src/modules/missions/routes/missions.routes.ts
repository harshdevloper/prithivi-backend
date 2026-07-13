import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { adminOnly, superAdminOnly } from "../../../middleware/role-guard.js";
import {
  listCompletionsQuerySchema,
  missionIdParamsSchema,
  reviewCompletionSchema,
  updateMissionSchema,
  upsertMissionSchema,
  type ListCompletionsQuery,
  type MissionIdParams,
  type ReviewCompletionInput,
  type UpdateMissionInput,
  type UpsertMissionInput,
} from "../schemas/missions.schema.js";

/** Registered under /missions. Admin CRUD is ADMIN read / SUPER_ADMIN write. */
export const missionsRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.missionsController;

  // ---- user ----

  app.get(
    "/",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["missions"],
        summary: "Published missions with my completion status",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.listPublished,
  );

  app.get(
    "/mine",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["missions"],
        summary: "My mission submissions",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.listMine,
  );

  app.post<{ Params: MissionIdParams }>(
    "/:id/complete",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["missions"],
        summary: "Submit a mission for review (PENDING)",
        security: [{ bearerAuth: [] }],
        params: missionIdParamsSchema,
      },
    },
    controller.complete,
  );

  // ---- admin ----

  app.get(
    "/admin",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["missions"],
        summary: "List all missions (admin)",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.listAll,
  );

  app.post<{ Body: UpsertMissionInput }>(
    "/admin",
    {
      preHandler: [authGuard, superAdminOnly],
      schema: {
        tags: ["missions"],
        summary: "Create a mission (super admin)",
        security: [{ bearerAuth: [] }],
        body: upsertMissionSchema,
      },
    },
    controller.create,
  );

  app.patch<{ Params: MissionIdParams; Body: UpdateMissionInput }>(
    "/admin/:id",
    {
      preHandler: [authGuard, superAdminOnly],
      schema: {
        tags: ["missions"],
        summary: "Update a mission (super admin)",
        security: [{ bearerAuth: [] }],
        params: missionIdParamsSchema,
        body: updateMissionSchema,
      },
    },
    controller.update,
  );

  app.delete<{ Params: MissionIdParams }>(
    "/admin/:id",
    {
      preHandler: [authGuard, superAdminOnly],
      schema: {
        tags: ["missions"],
        summary: "Soft-delete a mission (super admin)",
        security: [{ bearerAuth: [] }],
        params: missionIdParamsSchema,
      },
    },
    controller.remove,
  );

  app.get<{ Querystring: ListCompletionsQuery }>(
    "/admin/completions",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["missions"],
        summary: "List mission completions (admin)",
        security: [{ bearerAuth: [] }],
        querystring: listCompletionsQuerySchema,
      },
    },
    controller.listCompletions,
  );

  app.patch<{ Params: MissionIdParams; Body: ReviewCompletionInput }>(
    "/admin/completions/:id/review",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["missions"],
        summary: "Approve or reject a mission completion (admin)",
        security: [{ bearerAuth: [] }],
        params: missionIdParamsSchema,
        body: reviewCompletionSchema,
      },
    },
    controller.review,
  );
};

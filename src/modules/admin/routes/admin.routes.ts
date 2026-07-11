import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { adminOnly } from "../../../middleware/role-guard.js";
import {
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdParamsSchema,
  type ListUsersQuery,
  type UpdateUserRoleInput,
  type UpdateUserStatusInput,
  type UserIdParams,
} from "../schemas/admin.schema.js";

export const adminRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.adminController;

  // Every admin route requires an authenticated admin.
  app.addHook("preHandler", authGuard);
  app.addHook("preHandler", adminOnly);

  app.get(
    "/stats",
    {
      schema: {
        tags: ["admin"],
        summary: "Platform dashboard stats",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.stats,
  );

  app.get<{ Querystring: ListUsersQuery }>(
    "/users",
    {
      schema: {
        tags: ["admin"],
        summary: "List users",
        security: [{ bearerAuth: [] }],
        querystring: listUsersQuerySchema,
      },
    },
    controller.listUsers,
  );

  app.patch<{ Params: UserIdParams; Body: UpdateUserRoleInput }>(
    "/users/:id/role",
    {
      schema: {
        tags: ["admin"],
        summary: "Change a user's role",
        security: [{ bearerAuth: [] }],
        params: userIdParamsSchema,
        body: updateUserRoleSchema,
      },
    },
    controller.updateUserRole,
  );

  app.patch<{ Params: UserIdParams; Body: UpdateUserStatusInput }>(
    "/users/:id/status",
    {
      schema: {
        tags: ["admin"],
        summary: "Activate or deactivate a user",
        security: [{ bearerAuth: [] }],
        params: userIdParamsSchema,
        body: updateUserStatusSchema,
      },
    },
    controller.updateUserStatus,
  );
};

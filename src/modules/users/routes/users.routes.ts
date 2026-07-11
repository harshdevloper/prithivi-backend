import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { updateProfileSchema, type UpdateProfileInput } from "../schemas/users.schema.js";

export const usersRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.usersController;

  app.get(
    "/me",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["users"],
        summary: "Get my profile",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.me,
  );

  app.patch<{ Body: UpdateProfileInput }>(
    "/me",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["users"],
        summary: "Update my profile",
        security: [{ bearerAuth: [] }],
        body: updateProfileSchema,
      },
    },
    controller.updateMe,
  );
};

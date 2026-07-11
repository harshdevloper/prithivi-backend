import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { adminOnly, superAdminOnly } from "../../../middleware/role-guard.js";
import {
  updateSettingsSchema,
  type UpdateSettingsInput,
} from "../schemas/settings.schema.js";

/** Reward-system settings — ADMIN reads, SUPER_ADMIN writes. Prefix /settings. */
export const settingsRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.settingsController;

  app.get(
    "/",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["settings"],
        summary: "List reward-system settings (grouped by category)",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.list,
  );

  app.patch<{ Body: UpdateSettingsInput }>(
    "/",
    {
      preHandler: [authGuard, superAdminOnly],
      schema: {
        tags: ["settings"],
        summary: "Update reward-system settings (super admin)",
        security: [{ bearerAuth: [] }],
        body: updateSettingsSchema,
      },
    },
    controller.update,
  );
};

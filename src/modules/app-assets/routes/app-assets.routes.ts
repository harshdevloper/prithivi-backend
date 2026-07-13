import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { adminOnly, superAdminOnly } from "../../../middleware/role-guard.js";
import {
  putAssetSchema,
  slotKeyParamsSchema,
  type PutAssetInput,
  type SlotKeyParams,
} from "../registry.js";

/** In-app graphic slot overrides — public reads, SUPER_ADMIN writes. Prefix /app-assets. */
export const appAssetsRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.appAssetsController;

  app.get(
    "/",
    {
      schema: {
        tags: ["app-assets"],
        summary: "List all graphic slots with override URLs (public, cacheable)",
      },
    },
    controller.listPublic,
  );

  app.get(
    "/admin",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["app-assets"],
        summary: "List graphic slots with override metadata (admin)",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.listAdmin,
  );

  app.put<{ Params: SlotKeyParams; Body: PutAssetInput }>(
    "/admin/:key",
    {
      preHandler: [authGuard, superAdminOnly],
      schema: {
        tags: ["app-assets"],
        summary: "Set a graphic slot override (super admin)",
        security: [{ bearerAuth: [] }],
        params: slotKeyParamsSchema,
        body: putAssetSchema,
      },
    },
    controller.upsert,
  );

  app.delete<{ Params: SlotKeyParams }>(
    "/admin/:key",
    {
      preHandler: [authGuard, superAdminOnly],
      schema: {
        tags: ["app-assets"],
        summary: "Remove a graphic slot override, reverting to the bundled default (super admin)",
        security: [{ bearerAuth: [] }],
        params: slotKeyParamsSchema,
      },
    },
    controller.remove,
  );
};

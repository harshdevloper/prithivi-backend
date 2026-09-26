import type { FastifyInstance } from "fastify";
import { success } from "../../common/response.js";
import { authGuard } from "../../middleware/auth-guard.js";
import { adminOnly } from "../../middleware/role-guard.js";
import {
  cpxListQuerySchema,
  cpxPostbackQuerySchema,
  type CpxListQuery,
  type CpxPostbackQuery,
} from "./cpx.service.js";

/** Registered under /cpx. */
export const cpxRoutes = async (app: FastifyInstance): Promise<void> => {
  const service = app.di.cpxService;

  app.get(
    "/wall",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["cpx"],
        summary: "Signed CPX Research survey-wall URL (null when surveys are off)",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "private, no-store");
      return success(await service.wall(request.user.sub));
    },
  );

  // Server-to-server from CPX; authenticated by the md5 hash, not a JWT.
  app.get<{ Querystring: CpxPostbackQuery }>(
    "/postback",
    {
      config: { rateLimit: { max: 600, timeWindow: "1 minute" } },
      schema: {
        tags: ["cpx"],
        summary: "CPX Research postback (credit / reversal)",
        querystring: cpxPostbackQuerySchema,
      },
    },
    async (request, reply) => {
      const result = await service.postback(request.query);
      request.log.info({ transId: request.query.trans_id, result }, "cpx postback");
      reply.type("text/plain").send(result);
    },
  );

  app.get<{ Querystring: CpxListQuery }>(
    "/admin/transactions",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["cpx"],
        summary: "CPX survey transactions (admin)",
        security: [{ bearerAuth: [] }],
        querystring: cpxListQuerySchema,
      },
    },
    async (request) => {
      const { items, meta } = await service.list(request.query);
      return success(items, meta);
    },
  );
};

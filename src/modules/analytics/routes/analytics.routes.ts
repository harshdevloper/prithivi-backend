import type { FastifyInstance } from "fastify";
import { authGuard, optionalAuth } from "../../../middleware/auth-guard.js";
import { adminOnly } from "../../../middleware/role-guard.js";
import {
  analyticsSummaryQuerySchema,
  trackEventSchema,
  type AnalyticsSummaryQuery,
  type TrackEventInput,
} from "../schemas/analytics.schema.js";

export const analyticsRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.analyticsController;

  app.post<{ Body: TrackEventInput }>(
    "/track",
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ["analytics"],
        summary: "Track an event (anonymous or authenticated)",
        body: trackEventSchema,
      },
    },
    controller.track,
  );

  app.get<{ Querystring: AnalyticsSummaryQuery }>(
    "/summary",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["analytics"],
        summary: "Event counts summary (admin)",
        security: [{ bearerAuth: [] }],
        querystring: analyticsSummaryQuerySchema,
      },
    },
    controller.summary,
  );
};

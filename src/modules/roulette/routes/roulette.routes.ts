import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { adminOnly, superAdminOnly } from "../../../middleware/role-guard.js";
import {
  activateProfileSchema,
  analyticsQuerySchema,
  createProfileSchema,
  estimateRtpSchema,
  historyQuerySchema,
  playSchema,
  profileIdParamsSchema,
  roundIdParamsSchema,
  roundsQuerySchema,
  type ActivateProfileInput,
  type CreateProfileInput,
  type EstimateRtpInput,
  type HistoryQuery,
  type PlayInput,
  type ProfileIdParams,
  type RoundIdParams,
  type RoundsQuery,
} from "../schemas/roulette.schema.js";

/** Registered under /game. User surface: /game/roulette/*, admin: /game/roulette/admin/*. */
export const rouletteRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.rouletteController;

  // ---- user ----
  app.get(
    "/roulette/config",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["roulette"],
        summary: "Game config + payouts + wheel + my live status",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getConfig,
  );

  app.get(
    "/roulette/status",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["roulette"],
        summary: "My wallet balance, free games left, daily usage, cooldown",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getStatus,
  );

  app.post<{ Body: PlayInput }>(
    "/roulette/play",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["roulette"],
        summary: "Place a bet; server decides the winning number and settles atomically",
        security: [{ bearerAuth: [] }],
        body: playSchema,
      },
    },
    controller.play,
  );

  app.get<{ Querystring: HistoryQuery }>(
    "/roulette/history",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["roulette"],
        summary: "My paginated round history",
        security: [{ bearerAuth: [] }],
        querystring: historyQuerySchema,
      },
    },
    controller.history,
  );

  app.get(
    "/roulette/recent-results",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["roulette"],
        summary: "Recent winning numbers (for the results strip)",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.recentResults,
  );

  app.get<{ Params: RoundIdParams }>(
    "/roulette/verify-round/:id",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["roulette"],
        summary: "Provably-fair verification of one of my rounds",
        security: [{ bearerAuth: [] }],
        params: roundIdParamsSchema,
      },
    },
    controller.verifyRound,
  );

  // ---- admin (reads = admin, probability writes = super-admin) ----
  app.get(
    "/roulette/admin/probability-profiles",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["roulette-admin"],
        summary: "List probability/RTP profiles",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.adminListProfiles,
  );

  app.post<{ Body: CreateProfileInput }>(
    "/roulette/admin/probability-profiles",
    {
      preHandler: [authGuard, superAdminOnly],
      schema: {
        tags: ["roulette-admin"],
        summary: "Create a probability profile (draft; not active until activated)",
        security: [{ bearerAuth: [] }],
        body: createProfileSchema,
      },
    },
    controller.adminCreateProfile,
  );

  app.post<{ Params: ProfileIdParams; Body: ActivateProfileInput }>(
    "/roulette/admin/probability-profiles/:id/activate",
    {
      preHandler: [authGuard, superAdminOnly],
      schema: {
        tags: ["roulette-admin"],
        summary: "Activate a profile (affects future rounds only; audited with reason)",
        security: [{ bearerAuth: [] }],
        params: profileIdParamsSchema,
        body: activateProfileSchema,
      },
    },
    controller.adminActivateProfile,
  );

  app.post<{ Body: EstimateRtpInput }>(
    "/roulette/admin/estimate-rtp",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["roulette-admin"],
        summary: "Preview estimated RTP + warnings for a proposed weighting",
        security: [{ bearerAuth: [] }],
        body: estimateRtpSchema,
      },
    },
    controller.adminPreviewRtp,
  );

  app.get<{ Querystring: RoundsQuery }>(
    "/roulette/admin/rounds",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["roulette-admin"],
        summary: "Filterable, paginated round history",
        security: [{ bearerAuth: [] }],
        querystring: roundsQuerySchema,
      },
    },
    controller.adminListRounds,
  );

  app.get<{ Params: RoundIdParams }>(
    "/roulette/admin/rounds/:id",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["roulette-admin"],
        summary: "Round detail incl. revealed server seed",
        security: [{ bearerAuth: [] }],
        params: roundIdParamsSchema,
      },
    },
    controller.adminGetRound,
  );

  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/roulette/admin/analytics",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["roulette-admin"],
        summary: "Aggregate analytics (totals, distributions, daily, top wins)",
        security: [{ bearerAuth: [] }],
        querystring: analyticsQuerySchema,
      },
    },
    controller.adminAnalytics,
  );

  app.get<{ Querystring: HistoryQuery }>(
    "/roulette/admin/audit-logs",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["roulette-admin"],
        summary: "Roulette-related audit log entries",
        security: [{ bearerAuth: [] }],
        querystring: historyQuerySchema,
      },
    },
    controller.adminAuditLogs,
  );
};

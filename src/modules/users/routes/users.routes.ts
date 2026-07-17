import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import {
  applyReferralSchema,
  updateProfileSchema,
  type ApplyReferralInput,
  type UpdateProfileInput,
} from "../schemas/users.schema.js";

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

  app.get(
    "/me/progress",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["users"],
        summary: "My coins, level and rank (computed from admin-configured curve)",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.progress,
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

  app.post<{ Body: ApplyReferralInput }>(
    "/me/referral",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["users"],
        summary: "Apply a referral code (once per account)",
        security: [{ bearerAuth: [] }],
        body: applyReferralSchema,
      },
    },
    controller.applyReferral,
  );

  app.get(
    "/me/referrals",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["users"],
        summary: "My referral stats: friends joined, coins earned, code applied",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.referralStats,
  );
};

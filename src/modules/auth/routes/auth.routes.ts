import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import {
  firebaseSignInSchema,
  refreshTokenSchema,
  type FirebaseSignInInput,
  type RefreshTokenInput,
} from "../schemas/auth.schema.js";

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.authController;

  app.post<{ Body: FirebaseSignInInput }>(
    "/firebase",
    {
      schema: {
        tags: ["auth"],
        summary: "Sign in with a Firebase ID token (app + admin)",
        body: firebaseSignInSchema,
      },
    },
    controller.firebaseSignIn,
  );

  app.post<{ Body: RefreshTokenInput }>(
    "/refresh",
    {
      schema: {
        tags: ["auth"],
        summary: "Exchange a refresh token for new tokens (rotation)",
        body: refreshTokenSchema,
      },
    },
    controller.refresh,
  );

  app.post<{ Body: RefreshTokenInput }>(
    "/logout",
    {
      schema: {
        tags: ["auth"],
        summary: "Revoke a refresh token",
        body: refreshTokenSchema,
      },
    },
    controller.logout,
  );

  app.post(
    "/logout-all",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["auth"],
        summary: "Revoke all refresh tokens for the current user",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.logoutAll,
  );

  app.get(
    "/me",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["auth"],
        summary: "Get the authenticated user",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.me,
  );
};

import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import {
  matchIdParamsSchema,
  moveSchema,
  startMatchSchema,
  type MatchIdParams,
  type MoveInput,
  type StartMatchInput,
} from "../schemas/game.schema.js";

/** Registered under /game. */
export const gameRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.gameController;

  app.get(
    "/ttt/config",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["game"],
        summary: "Tic-tac-toe config + my daily usage",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getConfig,
  );

  app.post<{ Body: StartMatchInput }>(
    "/ttt/match",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["game"],
        summary: "Start a tic-tac-toe match (user is X, moves first)",
        security: [{ bearerAuth: [] }],
        body: startMatchSchema,
      },
    },
    controller.startMatch,
  );

  app.post<{ Params: MatchIdParams; Body: MoveInput }>(
    "/ttt/match/:id/move",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["game"],
        summary: "Play a cell; the AI replies in the same response",
        security: [{ bearerAuth: [] }],
        params: matchIdParamsSchema,
        body: moveSchema,
      },
    },
    controller.move,
  );
};

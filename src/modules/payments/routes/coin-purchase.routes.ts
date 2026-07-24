import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import {
  createCoinPurchaseOrderSchema,
  type CreateCoinPurchaseOrderInput,
  verifyCoinPurchaseSchema,
  type VerifyCoinPurchaseInput,
} from "../schemas/coin-purchase.schema.js";

export const coinPurchaseRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.coinPurchaseController;

  app.get(
    "/config",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        tags: ["wallet"],
        summary: "Get the admin-configured Add Coins package",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.config,
  );

  app.post<{ Body: CreateCoinPurchaseOrderInput }>(
    "/orders",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["wallet"],
        summary: "Create a server-priced Razorpay coin order",
        security: [{ bearerAuth: [] }],
        body: createCoinPurchaseOrderSchema,
      },
    },
    controller.createOrder,
  );

  app.post<{ Body: VerifyCoinPurchaseInput }>(
    "/verify",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        tags: ["wallet"],
        summary: "Verify Razorpay payment and credit coins idempotently",
        security: [{ bearerAuth: [] }],
        body: verifyCoinPurchaseSchema,
      },
    },
    controller.verify,
  );

  app.post(
    "/reconcile",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 6, timeWindow: "1 minute" } },
      schema: {
        tags: ["wallet"],
        summary: "Recover captured coin payments after an interrupted checkout",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.reconcile,
  );
};

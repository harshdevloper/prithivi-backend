import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app: FastifyInstance) => {
  const prisma = new PrismaClient();

  // NOTE: no eager `await prisma.$connect()` here. Prisma connects lazily on
  // the first query, so boot stays fast and — importantly — the server does
  // NOT crash when Neon (serverless) is cold and takes >10s to wake. A cold
  // connection would otherwise blow Fastify's plugin-timeout and kill boot.
  // Warm the pool in the background so the first real request is faster.
  void prisma.$connect().catch((error) => {
    app.log.warn({ err: error }, "initial Prisma connect failed (will retry lazily on first query)");
  });

  app.decorate("prisma", prisma);

  app.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
});

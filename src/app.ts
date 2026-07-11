import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { env } from "./config/env.js";
import { HEADERS } from "./config/constants.js";
import { loggerConfig } from "./config/logger.js";
import {
  prismaPlugin,
  redisPlugin,
  jwtPlugin,
  swaggerPlugin,
  securityPlugin,
  staticPlugin,
  auditPlugin,
  firebasePlugin,
} from "./plugins/index.js";
import { errorHandler } from "./middleware/index.js";
import { registerRoutes } from "./routes/index.js";
import { buildContainer } from "./container.js";

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: loggerConfig,
    trustProxy: env.TRUST_PROXY,
    // Honor an inbound X-Request-Id (nginx / upstream), else generate one.
    requestIdHeader: HEADERS.REQUEST_ID,
    genReqId: () => randomUUID(),
    bodyLimit: 1 * 1024 * 1024, // JSON bodies; file uploads use multipart limits
    // Generous so a slow plugin (e.g. a cold serverless DB/Redis) can't blow the
    // default 10s startup timeout and crash boot.
    pluginTimeout: 60_000,
  });

  // Zod-powered request validation and response serialization.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  // Echo the request id so clients/nginx can correlate logs.
  app.addHook("onSend", (request, reply, _payload, done) => {
    reply.header(HEADERS.REQUEST_ID, request.id);
    done();
  });

  // Infra first (redis before security: the rate limiter uses the shared connection).
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(securityPlugin);
  await app.register(swaggerPlugin);
  await app.register(jwtPlugin);
  await app.register(firebasePlugin);
  await app.register(staticPlugin);
  await app.register(auditPlugin);

  // Composition root — repositories, services, controllers, queues.
  const container = buildContainer(app);
  app.decorate("di", container);
  app.addHook("onClose", async () => {
    await Promise.all([container.notificationQueue.close(), container.analyticsQueue.close()]);
  });

  await registerRoutes(app);

  return app;
};

export type { FastifyInstance };
export { env };

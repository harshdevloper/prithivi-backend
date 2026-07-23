import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export default fp(async (app: FastifyInstance) => {
  if (!env.SWAGGER_ENABLED) {
    app.log.info("Swagger UI disabled (SWAGGER_ENABLED=false)");
    return;
  }

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Money Marathon API",
        description: "Money Marathon backend API documentation",
        version: "0.1.0",
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      tags: [
        { name: "auth", description: "Authentication" },
        { name: "users", description: "User profile" },
        { name: "campaigns", description: "Reward campaigns" },
        { name: "claims", description: "Reward claims" },
        { name: "wallet", description: "Wallet & transactions" },
        { name: "notifications", description: "User notifications" },
        { name: "analytics", description: "Event analytics" },
        { name: "admin", description: "Admin operations" },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: env.SWAGGER_ROUTE,
  });
});

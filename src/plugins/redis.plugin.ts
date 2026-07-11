import fp from "fastify-plugin";
import type Redis from "ioredis";
import type { FastifyInstance } from "fastify";
import { createRedisConnection } from "../config/redis.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(
  async (app: FastifyInstance) => {
    const redis = createRedisConnection();

    app.decorate("redis", redis);

    app.addHook("onClose", async (instance) => {
      await instance.redis.quit();
    });
  },
  { name: "redis" },
);

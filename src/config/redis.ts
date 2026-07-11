import Redis from "ioredis";
import { env } from "./env.js";

export const createRedisConnection = (): Redis =>
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

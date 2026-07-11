import { Queue, Worker, type Processor } from "bullmq";
import { createRedisConnection } from "../config/redis.js";

export const createQueue = (name: string): Queue =>
  new Queue(name, { connection: createRedisConnection() });

export const createWorker = (name: string, processor: Processor): Worker =>
  new Worker(name, processor, { connection: createRedisConnection() });

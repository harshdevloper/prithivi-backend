"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorker = exports.createQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_js_1 = require("../config/redis.js");
const createQueue = (name) => new bullmq_1.Queue(name, { connection: (0, redis_js_1.createRedisConnection)() });
exports.createQueue = createQueue;
const createWorker = (name, processor) => new bullmq_1.Worker(name, processor, { connection: (0, redis_js_1.createRedisConnection)() });
exports.createWorker = createWorker;
//# sourceMappingURL=queue.js.map
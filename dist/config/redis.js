"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisConnection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_js_1 = require("./env.js");
const createRedisConnection = () => new ioredis_1.default(env_js_1.env.REDIS_URL, {
    maxRetriesPerRequest: null,
});
exports.createRedisConnection = createRedisConnection;
//# sourceMappingURL=redis.js.map
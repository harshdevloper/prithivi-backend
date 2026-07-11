"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const redis_js_1 = require("../config/redis.js");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const redis = (0, redis_js_1.createRedisConnection)();
    app.decorate("redis", redis);
    app.addHook("onClose", async (instance) => {
        await instance.redis.quit();
    });
}, { name: "redis" });
//# sourceMappingURL=redis.plugin.js.map
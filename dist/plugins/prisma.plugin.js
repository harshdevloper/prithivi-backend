"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const client_1 = require("@prisma/client");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const prisma = new client_1.PrismaClient();
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
//# sourceMappingURL=prisma.plugin.js.map
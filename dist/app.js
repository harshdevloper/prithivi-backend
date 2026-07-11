"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.buildApp = void 0;
const node_crypto_1 = require("node:crypto");
const fastify_1 = __importDefault(require("fastify"));
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const env_js_1 = require("./config/env.js");
Object.defineProperty(exports, "env", { enumerable: true, get: function () { return env_js_1.env; } });
const constants_js_1 = require("./config/constants.js");
const logger_js_1 = require("./config/logger.js");
const index_js_1 = require("./plugins/index.js");
const index_js_2 = require("./middleware/index.js");
const index_js_3 = require("./routes/index.js");
const container_js_1 = require("./container.js");
const buildApp = async () => {
    const app = (0, fastify_1.default)({
        logger: logger_js_1.loggerConfig,
        trustProxy: env_js_1.env.TRUST_PROXY,
        // Honor an inbound X-Request-Id (nginx / upstream), else generate one.
        requestIdHeader: constants_js_1.HEADERS.REQUEST_ID,
        genReqId: () => (0, node_crypto_1.randomUUID)(),
        bodyLimit: 1 * 1024 * 1024, // JSON bodies; file uploads use multipart limits
        // Generous so a slow plugin (e.g. a cold serverless DB/Redis) can't blow the
        // default 10s startup timeout and crash boot.
        pluginTimeout: 60_000,
    });
    // Zod-powered request validation and response serialization.
    app.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
    app.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
    app.setErrorHandler(index_js_2.errorHandler);
    // Echo the request id so clients/nginx can correlate logs.
    app.addHook("onSend", (request, reply, _payload, done) => {
        reply.header(constants_js_1.HEADERS.REQUEST_ID, request.id);
        done();
    });
    // Infra first (redis before security: the rate limiter uses the shared connection).
    await app.register(index_js_1.prismaPlugin);
    await app.register(index_js_1.redisPlugin);
    await app.register(index_js_1.securityPlugin);
    await app.register(index_js_1.swaggerPlugin);
    await app.register(index_js_1.jwtPlugin);
    await app.register(index_js_1.firebasePlugin);
    await app.register(index_js_1.staticPlugin);
    await app.register(index_js_1.auditPlugin);
    // Composition root — repositories, services, controllers, queues.
    const container = (0, container_js_1.buildContainer)(app);
    app.decorate("di", container);
    app.addHook("onClose", async () => {
        await Promise.all([container.notificationQueue.close(), container.analyticsQueue.close()]);
    });
    await (0, index_js_3.registerRoutes)(app);
    return app;
};
exports.buildApp = buildApp;
//# sourceMappingURL=app.js.map
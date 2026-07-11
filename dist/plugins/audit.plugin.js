"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const queue_js_1 = require("../utils/queue.js");
const constants_js_1 = require("../config/constants.js");
/**
 * Audit trail as a cross-cutting concern: every authenticated mutating request
 * is enqueued (fire-and-forget) and persisted by the BullMQ audit worker —
 * zero changes to business services, no latency added to responses.
 */
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const queue = (0, queue_js_1.createQueue)(constants_js_1.QUEUES.AUDIT);
    app.decorate("auditQueue", queue);
    app.addHook("onResponse", (request, reply, done) => {
        const method = request.method.toUpperCase();
        const url = request.routeOptions.url ?? request.url;
        const isMutating = constants_js_1.AUDIT.METHODS.includes(method);
        const isExcluded = constants_js_1.AUDIT.EXCLUDED_PATH_FRAGMENTS.some((fragment) => url.includes(fragment));
        const user = request.user;
        if (isMutating && !isExcluded && user?.sub) {
            const job = {
                userId: user.sub,
                userEmail: user.email,
                action: `${method} ${url}`,
                method,
                path: request.url,
                statusCode: reply.statusCode,
                ip: request.ip,
                userAgent: request.headers["user-agent"],
            };
            queue
                .add("audit", job, { removeOnComplete: 1_000, removeOnFail: 1_000, attempts: 2 })
                .catch((error) => app.log.warn({ err: error }, "failed to enqueue audit entry"));
        }
        done();
    });
    app.addHook("onClose", async () => {
        await queue.close();
    });
});
//# sourceMappingURL=audit.plugin.js.map
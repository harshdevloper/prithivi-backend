import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type { Queue } from "bullmq";
import { createQueue } from "../utils/queue.js";
import { AUDIT, QUEUES } from "../config/constants.js";

export interface AuditJob {
  userId?: string;
  userEmail?: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  ip?: string;
  userAgent?: string;
}

declare module "fastify" {
  interface FastifyInstance {
    auditQueue: Queue;
  }
}

/**
 * Audit trail as a cross-cutting concern: every authenticated mutating request
 * is enqueued (fire-and-forget) and persisted by the BullMQ audit worker —
 * zero changes to business services, no latency added to responses.
 */
export default fp(async (app: FastifyInstance) => {
  const queue = createQueue(QUEUES.AUDIT);
  app.decorate("auditQueue", queue);

  app.addHook("onResponse", (request, reply, done) => {
    const method = request.method.toUpperCase();
    const url = request.routeOptions.url ?? request.url;

    const isMutating = (AUDIT.METHODS as readonly string[]).includes(method);
    const isExcluded = AUDIT.EXCLUDED_PATH_FRAGMENTS.some((fragment) => url.includes(fragment));
    const user = request.user as { sub?: string; email?: string } | undefined;

    if (isMutating && !isExcluded && user?.sub) {
      const job: AuditJob = {
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

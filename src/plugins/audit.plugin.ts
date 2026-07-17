import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { AUDIT } from "../config/constants.js";

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

/**
 * Audit trail as a cross-cutting concern: every authenticated mutating request
 * is persisted fire-and-forget straight to Postgres (the Redis queue that used
 * to buffer these was removed) — zero changes to business services, no latency
 * added to responses.
 */
export default fp(async (app: FastifyInstance) => {
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
      app.prisma.auditLog
        .create({ data: job })
        .catch((error) => app.log.warn({ err: error }, "failed to persist audit entry"));
    }
    done();
  });
});

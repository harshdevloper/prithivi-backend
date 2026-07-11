import type { FastifyInstance } from "fastify";
import type { Worker } from "bullmq";
import type { MulticastMessage } from "firebase-admin/messaging";
import { createWorker } from "../utils/queue.js";
import {
  BROADCAST_TOPIC,
  NOTIFICATIONS_QUEUE,
  type NotificationJob,
} from "../modules/notifications/queues/notification.queue.js";
import { ANALYTICS_QUEUE, type AnalyticsJob } from "../modules/analytics/queues/analytics.queue.js";
import { QUEUES } from "../config/constants.js";
import type { AuditJob } from "../plugins/audit.plugin.js";
import type { Prisma } from "@prisma/client";

/** Codes that mean the token is dead and should be pruned. */
const STALE_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/** FCM hard limit on tokens per sendEachForMulticast call. */
const MULTICAST_CHUNK = 500;

/** Must match the channel the Flutter app creates and its manifest meta-data. */
const ANDROID_CHANNEL_ID = "rewardhub_default";

type MessageBase = Omit<MulticastMessage, "tokens">;

/** Everything the app needs on tap rides in `data` — FCM requires string values. */
const buildDataPayload = (job: NotificationJob): Record<string, string> => ({
  type: job.type,
  ...(job.route ? { route: job.route } : {}),
  ...(job.imageUrl ? { imageUrl: job.imageUrl } : {}),
  ...(job.data ?? {}),
});

/** Shared message body for both token multicast and topic sends. */
const buildMessageBase = (job: NotificationJob): MessageBase =>
  job.silent
    ? {
        // Data-only: no `notification` key so no banner is shown; high priority
        // so Android delivers promptly; content-available wakes the iOS app.
        data: buildDataPayload(job),
        android: { priority: "high" },
        apns: { payload: { aps: { "content-available": 1 } } },
      }
    : {
        data: buildDataPayload(job),
        notification: {
          title: job.title,
          body: job.body,
          ...(job.imageUrl ? { imageUrl: job.imageUrl } : {}),
        },
        android: {
          priority: "high",
          notification: { channelId: ANDROID_CHANNEL_ID },
        },
        apns: {
          payload: { aps: { "mutable-content": 1 } },
          ...(job.imageUrl ? { fcmOptions: { imageUrl: job.imageUrl } } : {}),
        },
      };

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

/** Fields shared by every inbox row this job creates. */
const inboxData = (job: NotificationJob) => ({
  type: job.type,
  title: job.title,
  body: job.body,
  imageUrl: job.imageUrl ?? null,
  route: job.route ?? null,
  data: (job.data ?? undefined) as Prisma.InputJsonValue | undefined,
});

/** Push to one user's registered devices; prunes tokens FCM reports as dead. */
const pushToUser = async (
  app: FastifyInstance,
  job: NotificationJob,
): Promise<{ success: number; failure: number }> => {
  if (!app.firebaseMessaging || !job.userId) return { success: 0, failure: 0 };

  const devices = await app.prisma.deviceToken.findMany({
    where: { userId: job.userId },
    select: { token: true },
  });
  if (devices.length === 0) return { success: 0, failure: 0 };

  const base = buildMessageBase(job);
  let success = 0;
  let failure = 0;

  for (const batch of chunk(devices, MULTICAST_CHUNK)) {
    const response = await app.firebaseMessaging.sendEachForMulticast({
      tokens: batch.map((device) => device.token),
      ...base,
    });
    success += response.successCount;
    failure += response.failureCount;

    const stale = response.responses
      .map((result, index) =>
        result.error && STALE_TOKEN_CODES.has(result.error.code) ? batch[index].token : null,
      )
      .filter((token): token is string => token !== null);
    if (stale.length > 0) {
      await app.prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
      app.log.info({ pruned: stale.length }, "pruned stale FCM tokens");
    }
  }

  app.log.info({ userId: job.userId, sent: success, failed: failure }, "push sent to user devices");
  return { success, failure };
};

/**
 * Record the delivery outcome on the PushLog row (admin send history).
 * Never throws — the push already went out, and failing the job here
 * would make BullMQ retry and re-send it.
 */
const recordOutcome = async (
  app: FastifyInstance,
  pushLogId: string | undefined,
  outcome: { success: number; failure: number },
  error?: string,
): Promise<void> => {
  if (!pushLogId) return;
  const status = error
    ? "FAILED"
    : outcome.failure === 0
      ? "SENT"
      : outcome.success > 0
        ? "PARTIAL"
        : "FAILED";
  try {
    await app.prisma.pushLog.update({
      where: { id: pushLogId },
      data: {
        status,
        successCount: outcome.success,
        failureCount: outcome.failure,
        error: error ?? null,
      },
    });
  } catch (updateError) {
    app.log.error({ err: updateError, pushLogId }, "failed to record push outcome");
  }
};

export const startWorkers = (app: FastifyInstance): Worker[] => {
  const notificationWorker = createWorker(NOTIFICATIONS_QUEUE, async (job) => {
    const payload = job.data as NotificationJob;

    if (payload.audience === "topic") {
      // Arbitrary topic: push only — the server can't know the subscribers,
      // so there are no inbox rows to write and no per-device counts.
      if (!app.firebaseMessaging || !payload.topic) {
        await recordOutcome(app, payload.pushLogId, { success: 0, failure: 0 }, "Firebase messaging not configured");
        return;
      }
      await app.firebaseMessaging.send({ topic: payload.topic, ...buildMessageBase(payload) });
      // success=1 means "one topic message accepted by FCM", not a device count.
      await recordOutcome(app, payload.pushLogId, { success: 1, failure: 0 });
      app.log.info({ topic: payload.topic, type: payload.type }, "topic push delivered");
      return;
    }

    if (payload.audience === "all") {
      // 1) In-app inbox row for every active user (skipped for silent pushes —
      //    they are machine-to-machine, not inbox content).
      let users = 0;
      if (!payload.silent) {
        const rows = await app.prisma.user.findMany({
          where: { isActive: true },
          select: { id: true },
        });
        await app.prisma.notification.createMany({
          data: rows.map((user) => ({ userId: user.id, ...inboxData(payload) })),
        });
        users = rows.length;
      }

      // 2) One FCM topic message reaches every subscribed device.
      if (app.firebaseMessaging) {
        await app.firebaseMessaging.send({ topic: BROADCAST_TOPIC, ...buildMessageBase(payload) });
      }
      // success = inbox rows written; push delivery via topic has no counts.
      await recordOutcome(app, payload.pushLogId, { success: users, failure: 0 });
      app.log.info({ users, type: payload.type }, "broadcast delivered");
      return;
    }

    if (!payload.userId) {
      app.log.warn({ job: job.id }, "notification job missing userId — skipped");
      return;
    }

    if (!payload.silent) {
      await app.prisma.notification.create({
        data: { userId: payload.userId, ...inboxData(payload) },
      });
    }
    const outcome = await pushToUser(app, payload);
    await recordOutcome(app, payload.pushLogId, outcome);
  });

  // Once a job exhausts its retries, surface the failure in the send history.
  notificationWorker.on("failed", (job, error) => {
    const payload = job?.data as NotificationJob | undefined;
    if (!payload?.pushLogId) return;
    if ((job?.attemptsMade ?? 0) < (job?.opts.attempts ?? 1)) return;
    void recordOutcome(app, payload.pushLogId, { success: 0, failure: 0 }, error.message.slice(0, 500));
  });

  const analyticsWorker = createWorker(ANALYTICS_QUEUE, async (job) => {
    const data = job.data as AnalyticsJob;
    await app.prisma.analyticsEvent.create({
      data: {
        name: data.name,
        userId: data.userId,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  });

  const auditWorker = createWorker(QUEUES.AUDIT, async (job) => {
    const data = job.data as AuditJob;
    await app.prisma.auditLog.create({
      data: {
        userId: data.userId,
        userEmail: data.userEmail,
        action: data.action,
        method: data.method,
        path: data.path,
        statusCode: data.statusCode,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  });

  const workers = [notificationWorker, analyticsWorker, auditWorker];
  for (const worker of workers) {
    worker.on("failed", (job, error) => {
      app.log.error({ queue: worker.name, jobId: job?.id, err: error.message }, "queue job failed");
    });
  }

  app.log.info("BullMQ workers started (notifications, analytics, audit)");
  return workers;
};

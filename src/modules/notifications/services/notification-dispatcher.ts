import type { FastifyInstance } from "fastify";
import type { MulticastMessage } from "firebase-admin/messaging";
import type { Prisma } from "@prisma/client";
import type { NotificationJob } from "../queues/notification.queue.js";

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

/** Multicast to a token list; prunes tokens FCM reports as dead. */
const pushToTokens = async (
  app: FastifyInstance,
  job: NotificationJob,
  devices: { token: string }[],
): Promise<{ success: number; failure: number }> => {
  if (!app.firebaseMessaging || devices.length === 0) return { success: 0, failure: 0 };

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

  return { success, failure };
};

/** Push to one user's registered devices. */
const pushToUser = async (
  app: FastifyInstance,
  job: NotificationJob,
): Promise<{ success: number; failure: number }> => {
  if (!job.userId) return { success: 0, failure: 0 };
  const devices = await app.prisma.deviceToken.findMany({
    where: { userId: job.userId },
    select: { token: true },
  });
  const outcome = await pushToTokens(app, job, devices);
  app.log.info(
    { userId: job.userId, sent: outcome.success, failed: outcome.failure },
    "push sent to user devices",
  );
  return outcome;
};

/**
 * Record the delivery outcome on the PushLog row (admin send history).
 * Never throws — the push already went out.
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

/**
 * Delivers a notification in-process: inbox rows + FCM push + PushLog
 * outcome. Replaces the former BullMQ worker so the backend runs without
 * Redis. Throws on hard failures — callers that must never fail their own
 * flow (business-logic side effects) go through dispatchAndForget instead.
 */
export const dispatchNotification = async (
  app: FastifyInstance,
  payload: NotificationJob,
): Promise<void> => {
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

    // 2) Direct multicast to every registered device.
    const devices = await app.prisma.deviceToken.findMany({ select: { token: true } });
    const outcome = await pushToTokens(app, payload, devices);
    await recordOutcome(app, payload.pushLogId, outcome);
    app.log.info(
      { users, devices: devices.length, sent: outcome.success, failed: outcome.failure },
      "broadcast delivered",
    );
    return;
  }

  if (!payload.userId) {
    app.log.warn("notification job missing userId — skipped");
    return;
  }

  if (!payload.silent) {
    await app.prisma.notification.create({
      data: { userId: payload.userId, ...inboxData(payload) },
    });
  }
  const outcome = await pushToUser(app, payload);
  await recordOutcome(app, payload.pushLogId, outcome);
};

/**
 * Fire-and-forget wrapper: delivery failures are logged (and recorded on the
 * PushLog when present) but never propagate into the caller's flow.
 */
export const dispatchAndForget = (app: FastifyInstance, payload: NotificationJob): void => {
  void dispatchNotification(app, payload).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    app.log.error({ err: error }, "notification dispatch failed");
    await recordOutcome(app, payload.pushLogId, { success: 0, failure: 0 }, message.slice(0, 500));
  });
};

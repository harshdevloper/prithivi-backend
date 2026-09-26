import type { FastifyInstance } from "fastify";
import type { MulticastMessage, Messaging } from "firebase-admin/messaging";
import type { Prisma } from "@prisma/client";
import type { NotificationJob } from "../queues/notification.queue.js";

/** Codes that mean the token itself is dead and should be pruned. */
const STALE_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/** Transient FCM/network failures worth another attempt. */
const RETRYABLE_CODES = new Set([
  "messaging/internal-error",
  "messaging/server-unavailable",
  "messaging/unavailable",
  "messaging/unknown-error",
  "messaging/quota-exceeded",
  "messaging/deadline-exceeded",
  "app/network-error",
  "app/network-timeout",
]);

/** FCM hard limit on tokens per sendEachForMulticast call. */
const MULTICAST_CHUNK = 500;
/** Chunks in flight at once — well under FCM's per-project rate. */
const CHUNK_CONCURRENCY = 4;
/** Per-token retry rounds after the first pass (backoff 1s, 3s, 9s). */
const RETRY_ROUNDS = 3;
/** Inbox rows per INSERT for broadcasts. */
const INBOX_CHUNK = 2_000;

/** Must match the channel the Flutter app creates and its manifest meta-data. */
const ANDROID_CHANNEL_ID = "rewardhub_default";

type MessageBase = Omit<MulticastMessage, "tokens">;

export interface PushOutcome {
  success: number;
  failure: number;
  /** Failure reasons → count, e.g. { "uninstalled device": 29 }. */
  reasons: Record<string, number>;
  pruned: number;
}

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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Fields shared by every inbox row this job creates. */
const inboxData = (job: NotificationJob) => ({
  type: job.type,
  title: job.title,
  body: job.body,
  imageUrl: job.imageUrl ?? null,
  route: job.route ?? null,
  data: (job.data ?? undefined) as Prisma.InputJsonValue | undefined,
});

type Verdict = "ok" | "stale" | "retry" | "failed";

/**
 * Classify one FCM per-token result. `invalid-argument` is only a dead token
 * when FCM says so — the same code also means "bad payload", and pruning every
 * token on a bad payload would silence the whole audience for good.
 */
export const classify = (error: { code?: string; message?: string } | undefined): Verdict => {
  if (!error) return "ok";
  const code = error.code ?? "";
  if (STALE_TOKEN_CODES.has(code)) return "stale";
  if (code === "messaging/invalid-argument" && /registration token/i.test(error.message ?? "")) {
    return "stale";
  }
  if (RETRYABLE_CODES.has(code)) return "retry";
  return "failed";
};

/** Admin-facing label for a failure code. */
const reasonLabel = (verdict: Verdict, code: string | undefined): string => {
  if (verdict === "stale") return "uninstalled device (pruned)";
  if (verdict === "retry") return "FCM unavailable";
  if (code === "messaging/third-party-auth-error") return "APNs/auth rejected";
  if (code === "messaging/mismatched-credential" || code === "messaging/sender-id-mismatch") {
    return "token from another Firebase project";
  }
  if (code === "messaging/invalid-argument") return "rejected payload";
  return (code ?? "unknown").replace(/^messaging\//, "");
};

/** One multicast call with retries for whole-request failures (network, 5xx). */
const multicastWithRetry = async (
  messaging: Messaging,
  message: MulticastMessage,
): Promise<Awaited<ReturnType<Messaging["sendEachForMulticast"]>>> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_ROUNDS; attempt++) {
    try {
      return await messaging.sendEachForMulticast(message);
    } catch (error) {
      lastError = error;
      await sleep(1_000 * 3 ** attempt);
    }
  }
  throw lastError;
};

/** Run `task` over items with bounded concurrency, preserving nothing but completion. */
const forEachLimit = async <T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> => {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const item = items[next++];
      await task(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
};

/**
 * Multicast to a token list. Dead tokens are pruned, transient failures are
 * retried per token with backoff, chunks fly with bounded concurrency, and
 * `onProgress` reports running totals so a long broadcast is visible while it
 * runs. Never throws for per-token problems; a chunk that fails outright even
 * after retries counts its tokens as failed and the rest continue.
 */
export const pushToTokens = async (
  app: Pick<FastifyInstance, "firebaseMessaging" | "prisma" | "log">,
  job: NotificationJob,
  devices: { token: string }[],
  onProgress?: (outcome: PushOutcome) => Promise<void>,
): Promise<PushOutcome> => {
  const outcome: PushOutcome = { success: 0, failure: 0, reasons: {}, pruned: 0 };
  const messaging = app.firebaseMessaging;
  if (!messaging || devices.length === 0) return outcome;

  const base = buildMessageBase(job);
  const fail = (reason: string, count = 1): void => {
    outcome.failure += count;
    outcome.reasons[reason] = (outcome.reasons[reason] ?? 0) + count;
  };

  let pending = devices.map((device) => device.token);
  for (let round = 0; round <= RETRY_ROUNDS && pending.length > 0; round++) {
    if (round > 0) await sleep(1_000 * 3 ** (round - 1));
    const retryNext: string[] = [];
    const stale: string[] = [];
    const lastRound = round === RETRY_ROUNDS;

    await forEachLimit(chunk(pending, MULTICAST_CHUNK), CHUNK_CONCURRENCY, async (tokens) => {
      let response: Awaited<ReturnType<Messaging["sendEachForMulticast"]>>;
      try {
        response = await multicastWithRetry(messaging, { tokens, ...base });
      } catch (error) {
        app.log.error({ err: error, tokens: tokens.length }, "FCM multicast failed");
        fail("FCM unavailable", tokens.length);
        return;
      }
      response.responses.forEach((result, index) => {
        const verdict = classify(result.error);
        if (verdict === "ok") outcome.success += 1;
        else if (verdict === "stale") stale.push(tokens[index]);
        else if (verdict === "retry" && !lastRound) retryNext.push(tokens[index]);
        else fail(reasonLabel(verdict, result.error?.code));
      });
      if (onProgress) await onProgress({ ...outcome, failure: outcome.failure + stale.length });
    });

    if (stale.length > 0) {
      await app.prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
      outcome.pruned += stale.length;
      fail("uninstalled device (pruned)", stale.length);
      app.log.info({ pruned: stale.length }, "pruned stale FCM tokens");
    }
    pending = retryNext;
  }

  return outcome;
};

/** "31 failed: 29 uninstalled device (pruned), 2 FCM unavailable" — or null when clean. */
export const summarize = (outcome: PushOutcome): string | null => {
  if (outcome.failure === 0) return null;
  const parts = Object.entries(outcome.reasons)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([reason, count]) => `${count} ${reason}`);
  return `${outcome.failure} failed: ${parts.join(", ")}`.slice(0, 500);
};

/**
 * Record the delivery outcome on the PushLog row (admin send history).
 * Never throws — the push already went out.
 */
const recordOutcome = async (
  app: Pick<FastifyInstance, "prisma" | "log">,
  pushLogId: string | undefined,
  outcome: PushOutcome,
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
        error: error ?? summarize(outcome),
      },
    });
  } catch (updateError) {
    app.log.error({ err: updateError, pushLogId }, "failed to record push outcome");
  }
};

/** Running totals for the history table while a big broadcast is in flight. */
const progressWriter =
  (app: FastifyInstance, pushLogId: string | undefined) =>
  async (outcome: PushOutcome): Promise<void> => {
    if (!pushLogId) return;
    await app.prisma.pushLog
      .update({
        where: { id: pushLogId },
        data: { successCount: outcome.success, failureCount: outcome.failure },
      })
      .catch(() => {});
  };

/**
 * A recovered (re-dispatched) job must not write inbox rows twice. There is
 * no link column from inbox rows to the PushLog, so "already written" means
 * a row with this exact content exists from the time the send started.
 */
const inboxAlreadyWritten = async (
  app: FastifyInstance,
  job: NotificationJob,
  since: Date,
): Promise<boolean> => {
  const existing = await app.prisma.notification.findFirst({
    where: {
      type: job.type,
      title: job.title,
      body: job.body,
      createdAt: { gte: since },
      ...(job.userId ? { userId: job.userId } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
};

/** Options for a re-dispatch of a job whose first delivery was interrupted. */
export interface DispatchOptions {
  /** When set, inbox rows written at/after this time are treated as already done. */
  recoverSince?: Date;
}

/**
 * Delivers a notification in-process: inbox rows + FCM push + PushLog
 * outcome. Replaces the former BullMQ worker so the backend runs without
 * Redis. Throws on hard failures — callers that must never fail their own
 * flow (business-logic side effects) go through dispatchAndForget instead.
 */
export const dispatchNotification = async (
  app: FastifyInstance,
  payload: NotificationJob,
  options: DispatchOptions = {},
): Promise<void> => {
  const empty: PushOutcome = { success: 0, failure: 0, reasons: {}, pruned: 0 };
  const skipInbox =
    payload.silent ||
    (options.recoverSince !== undefined &&
      (await inboxAlreadyWritten(app, payload, options.recoverSince)));

  if (payload.audience === "topic") {
    // Arbitrary topic: push only — the server can't know the subscribers,
    // so there are no inbox rows to write and no per-device counts.
    if (!app.firebaseMessaging || !payload.topic) {
      await recordOutcome(app, payload.pushLogId, empty, "Firebase messaging not configured");
      return;
    }
    const message = { topic: payload.topic, ...buildMessageBase(payload) };
    let lastError: unknown;
    for (let attempt = 0; attempt < RETRY_ROUNDS; attempt++) {
      try {
        await app.firebaseMessaging.send(message);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        await sleep(1_000 * 3 ** attempt);
      }
    }
    if (lastError) throw lastError;
    // success=1 means "one topic message accepted by FCM", not a device count.
    await recordOutcome(app, payload.pushLogId, { ...empty, success: 1 });
    app.log.info({ topic: payload.topic, type: payload.type }, "topic push delivered");
    return;
  }

  if (payload.audience === "all") {
    // 1) In-app inbox row for every active user (skipped for silent pushes —
    //    they are machine-to-machine, not inbox content).
    let users = 0;
    if (!skipInbox) {
      const rows = await app.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      for (const batch of chunk(rows, INBOX_CHUNK)) {
        await app.prisma.notification.createMany({
          data: batch.map((user) => ({ userId: user.id, ...inboxData(payload) })),
        });
      }
      users = rows.length;
    }

    // 2) Direct multicast to every device of an active user.
    const devices = await app.prisma.deviceToken.findMany({
      where: { user: { isActive: true } },
      select: { token: true },
    });
    const outcome = await pushToTokens(
      app,
      payload,
      devices,
      devices.length > MULTICAST_CHUNK ? progressWriter(app, payload.pushLogId) : undefined,
    );
    await recordOutcome(app, payload.pushLogId, outcome);
    app.log.info(
      {
        users,
        devices: devices.length,
        sent: outcome.success,
        failed: outcome.failure,
        pruned: outcome.pruned,
        reasons: outcome.reasons,
      },
      "broadcast delivered",
    );
    return;
  }

  if (!payload.userId) {
    app.log.warn("notification job missing userId — skipped");
    return;
  }

  if (!skipInbox) {
    await app.prisma.notification.create({
      data: { userId: payload.userId, ...inboxData(payload) },
    });
  }
  const devices = await app.prisma.deviceToken.findMany({
    where: { userId: payload.userId },
    select: { token: true },
  });
  const outcome = await pushToTokens(app, payload, devices);
  await recordOutcome(app, payload.pushLogId, outcome);
  app.log.info(
    { userId: payload.userId, sent: outcome.success, failed: outcome.failure },
    "push sent to user devices",
  );
};

/**
 * Fire-and-forget wrapper: delivery failures are logged (and recorded on the
 * PushLog when present) but never propagate into the caller's flow.
 */
export const dispatchAndForget = (app: FastifyInstance, payload: NotificationJob): void => {
  void dispatchNotification(app, payload).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    app.log.error({ err: error }, "notification dispatch failed");
    await recordOutcome(
      app,
      payload.pushLogId,
      { success: 0, failure: 0, reasons: {}, pruned: 0 },
      message.slice(0, 500),
    );
  });
};

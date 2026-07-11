import type { Queue } from "bullmq";
import type { NotificationType } from "@prisma/client";
import { createQueue } from "../../../utils/queue.js";

export const NOTIFICATIONS_QUEUE = "notifications";

/** FCM topic every app instance subscribes to for broadcasts. */
export const BROADCAST_TOPIC = "all-users";

export interface NotificationJob {
  /**
   * "user" (default, needs userId), "all" for a broadcast to every active user,
   * or "topic" for an arbitrary FCM topic (push only — no in-app inbox rows,
   * since the server cannot know who subscribes to a topic).
   */
  audience?: "user" | "all" | "topic";
  userId?: string;
  topic?: string;
  type: NotificationType;
  title: string;
  body: string;
  /** HTTPS image rendered in the expanded notification. */
  imageUrl?: string;
  /** In-app deep link opened on tap, e.g. /campaigns/<id>. */
  route?: string;
  /** Extra payload merged into the FCM data message — values must be strings. */
  data?: Record<string, string>;
  /** Data-only push: no banner, no inbox row; the app processes it silently. */
  silent?: boolean;
  /** Set for admin sends — the worker records the delivery outcome on this row. */
  pushLogId?: string;
}

export const createNotificationQueue = (): Queue => createQueue(NOTIFICATIONS_QUEUE);

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2_000 },
  removeOnComplete: 1_000,
  removeOnFail: 5_000,
};

import type { NotificationType } from "@prisma/client";

/**
 * Shape of one notification delivery. Kept at its historical path so the many
 * business-service imports stay untouched; the BullMQ queue that used to live
 * here was removed with the Redis dependency — delivery is now in-process via
 * notification-dispatcher.ts.
 */
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
  /** Set for admin sends — delivery records the outcome on this row. */
  pushLogId?: string;
}

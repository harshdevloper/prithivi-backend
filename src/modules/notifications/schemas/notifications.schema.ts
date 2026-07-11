import { z } from "zod";
import type { Notification, Prisma, PushLog, User } from "@prisma/client";

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["SYSTEM", "CAMPAIGN", "CLAIM", "WALLET"]),
  title: z.string(),
  body: z.string(),
  imageUrl: z.string().nullable(),
  route: z.string().nullable(),
  data: z.record(z.string()).nullable(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type NotificationDto = z.infer<typeof notificationSchema>;

export const toNotificationDto = (notification: Notification): NotificationDto => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  imageUrl: notification.imageUrl ?? null,
  route: notification.route ?? null,
  data: (notification.data as Record<string, string> | null) ?? null,
  readAt: notification.readAt?.toISOString() ?? null,
  createdAt: notification.createdAt.toISOString(),
});

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const notificationIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;

export const registerDeviceSchema = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(["android", "ios", "web"]).default("android"),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const unregisterDeviceSchema = z.object({
  token: z.string().min(20).max(4096),
});
export type UnregisterDeviceInput = z.infer<typeof unregisterDeviceSchema>;

export const sendNotificationSchema = z
  .object({
    audience: z.enum(["all", "user", "topic"]).default("all"),
    userId: z.string().uuid().optional(),
    topic: z
      .string()
      .regex(/^[a-zA-Z0-9-_.~%]{1,900}$/, "Invalid FCM topic name")
      .optional(),
    type: z.enum(["SYSTEM", "CAMPAIGN", "CLAIM", "WALLET"]).default("SYSTEM"),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(1000),
    /** HTTPS image shown in the expanded notification. */
    imageUrl: z.string().url().startsWith("https://").max(2048).optional(),
    /** In-app route opened on tap — restricted to app-internal paths. */
    route: z
      .string()
      .regex(/^\/[\w\-/]*$/, "Route must be an app-internal path like /campaigns/123")
      .max(200)
      .optional(),
    /** Extra key-value payload; FCM requires string values. */
    data: z.record(z.string().max(64), z.string().max(1024)).optional(),
    /** Data-only push: no banner, no inbox row. */
    silent: z.boolean().default(false),
    /** ISO timestamp in the future — delivered later via a delayed queue job. */
    scheduledAt: z.string().datetime().optional(),
  })
  .refine((input) => input.audience !== "user" || Boolean(input.userId), {
    message: "userId is required when audience is 'user'",
    path: ["userId"],
  })
  .refine((input) => input.audience !== "topic" || Boolean(input.topic), {
    message: "topic is required when audience is 'topic'",
    path: ["topic"],
  })
  .refine((input) => !input.scheduledAt || new Date(input.scheduledAt).getTime() > Date.now(), {
    message: "scheduledAt must be in the future",
    path: ["scheduledAt"],
  });
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

// ---- admin send history ----

export const pushLogSchema = z.object({
  id: z.string().uuid(),
  audience: z.enum(["all", "user", "topic"]),
  userId: z.string().uuid().nullable(),
  topic: z.string().nullable(),
  type: z.enum(["SYSTEM", "CAMPAIGN", "CLAIM", "WALLET"]),
  title: z.string(),
  body: z.string(),
  imageUrl: z.string().nullable(),
  route: z.string().nullable(),
  silent: z.boolean(),
  scheduledAt: z.string().datetime().nullable(),
  status: z.enum(["QUEUED", "SCHEDULED", "SENT", "PARTIAL", "FAILED"]),
  successCount: z.number().int(),
  failureCount: z.number().int(),
  error: z.string().nullable(),
  sentBy: z.object({ id: z.string().uuid(), name: z.string(), email: z.string() }),
  createdAt: z.string().datetime(),
});
export type PushLogDto = z.infer<typeof pushLogSchema>;

export type PushLogWithSender = PushLog & { sentBy: Pick<User, "id" | "name" | "email"> };

export const toPushLogDto = (log: PushLogWithSender): PushLogDto => ({
  id: log.id,
  audience: log.audience as PushLogDto["audience"],
  userId: log.userId,
  topic: log.topic,
  type: log.type,
  title: log.title,
  body: log.body,
  imageUrl: log.imageUrl,
  route: log.route,
  silent: log.silent,
  scheduledAt: log.scheduledAt?.toISOString() ?? null,
  status: log.status,
  successCount: log.successCount,
  failureCount: log.failureCount,
  error: log.error,
  sentBy: { id: log.sentBy.id, name: log.sentBy.name, email: log.sentBy.email },
  createdAt: log.createdAt.toISOString(),
});

export const listPushLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListPushLogsQuery = z.infer<typeof listPushLogsQuerySchema>;

/** Persisted shape of a queued admin send. */
export type CreatePushLogInput = SendNotificationInput & { sentById: string };

export const toPushLogCreateData = (
  input: CreatePushLogInput,
): Prisma.PushLogUncheckedCreateInput => ({
  audience: input.audience,
  userId: input.audience === "user" ? input.userId : null,
  topic: input.audience === "topic" ? input.topic : null,
  type: input.type,
  title: input.title,
  body: input.body,
  imageUrl: input.imageUrl ?? null,
  route: input.route ?? null,
  data: input.data ?? undefined,
  silent: input.silent,
  scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
  status: input.scheduledAt ? "SCHEDULED" : "QUEUED",
  sentById: input.sentById,
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPushLogCreateData = exports.listPushLogsQuerySchema = exports.toPushLogDto = exports.pushLogSchema = exports.sendNotificationSchema = exports.unregisterDeviceSchema = exports.registerDeviceSchema = exports.notificationIdParamsSchema = exports.listNotificationsQuerySchema = exports.toNotificationDto = exports.notificationSchema = void 0;
const zod_1 = require("zod");
exports.notificationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(["SYSTEM", "CAMPAIGN", "CLAIM", "WALLET"]),
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    imageUrl: zod_1.z.string().nullable(),
    route: zod_1.z.string().nullable(),
    data: zod_1.z.record(zod_1.z.string()).nullable(),
    readAt: zod_1.z.string().datetime().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
const toNotificationDto = (notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    imageUrl: notification.imageUrl ?? null,
    route: notification.route ?? null,
    data: notification.data ?? null,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
});
exports.toNotificationDto = toNotificationDto;
exports.listNotificationsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    unreadOnly: zod_1.z.coerce.boolean().default(false),
});
exports.notificationIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.registerDeviceSchema = zod_1.z.object({
    token: zod_1.z.string().min(20).max(4096),
    platform: zod_1.z.enum(["android", "ios", "web"]).default("android"),
});
exports.unregisterDeviceSchema = zod_1.z.object({
    token: zod_1.z.string().min(20).max(4096),
});
exports.sendNotificationSchema = zod_1.z
    .object({
    audience: zod_1.z.enum(["all", "user", "topic"]).default("all"),
    userId: zod_1.z.string().uuid().optional(),
    topic: zod_1.z
        .string()
        .regex(/^[a-zA-Z0-9-_.~%]{1,900}$/, "Invalid FCM topic name")
        .optional(),
    type: zod_1.z.enum(["SYSTEM", "CAMPAIGN", "CLAIM", "WALLET"]).default("SYSTEM"),
    title: zod_1.z.string().min(1).max(120),
    body: zod_1.z.string().min(1).max(1000),
    /** HTTPS image shown in the expanded notification. */
    imageUrl: zod_1.z.string().url().startsWith("https://").max(2048).optional(),
    /** In-app route opened on tap — restricted to app-internal paths. */
    route: zod_1.z
        .string()
        .regex(/^\/[\w\-/]*$/, "Route must be an app-internal path like /campaigns/123")
        .max(200)
        .optional(),
    /** Extra key-value payload; FCM requires string values. */
    data: zod_1.z.record(zod_1.z.string().max(64), zod_1.z.string().max(1024)).optional(),
    /** Data-only push: no banner, no inbox row. */
    silent: zod_1.z.boolean().default(false),
    /** ISO timestamp in the future — delivered later via a delayed queue job. */
    scheduledAt: zod_1.z.string().datetime().optional(),
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
// ---- admin send history ----
exports.pushLogSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    audience: zod_1.z.enum(["all", "user", "topic"]),
    userId: zod_1.z.string().uuid().nullable(),
    topic: zod_1.z.string().nullable(),
    type: zod_1.z.enum(["SYSTEM", "CAMPAIGN", "CLAIM", "WALLET"]),
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    imageUrl: zod_1.z.string().nullable(),
    route: zod_1.z.string().nullable(),
    silent: zod_1.z.boolean(),
    scheduledAt: zod_1.z.string().datetime().nullable(),
    status: zod_1.z.enum(["QUEUED", "SCHEDULED", "SENT", "PARTIAL", "FAILED"]),
    successCount: zod_1.z.number().int(),
    failureCount: zod_1.z.number().int(),
    error: zod_1.z.string().nullable(),
    sentBy: zod_1.z.object({ id: zod_1.z.string().uuid(), name: zod_1.z.string(), email: zod_1.z.string() }),
    createdAt: zod_1.z.string().datetime(),
});
const toPushLogDto = (log) => ({
    id: log.id,
    audience: log.audience,
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
exports.toPushLogDto = toPushLogDto;
exports.listPushLogsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
const toPushLogCreateData = (input) => ({
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
exports.toPushLogCreateData = toPushLogCreateData;
//# sourceMappingURL=notifications.schema.js.map
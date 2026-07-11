"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const errors_js_1 = require("../../../common/errors.js");
const pagination_js_1 = require("../../../common/pagination.js");
const notification_queue_js_1 = require("../queues/notification.queue.js");
const notifications_schema_js_1 = require("../schemas/notifications.schema.js");
class NotificationsService {
    notifications;
    queue;
    constructor(notifications, queue) {
        this.notifications = notifications;
        this.queue = queue;
    }
    /** Fire-and-forget: delivery (DB persist + push) happens in the BullMQ worker. */
    async enqueue(job) {
        await this.queue.add("notify", job, notification_queue_js_1.DEFAULT_JOB_OPTIONS);
    }
    /**
     * Admin sender: single user, arbitrary topic, or broadcast to every active
     * user. Records a PushLog row (the send history) and supports scheduling
     * via a delayed queue job.
     */
    async send(input, sentById) {
        const log = await this.notifications.createPushLog((0, notifications_schema_js_1.toPushLogCreateData)({ ...input, sentById }));
        const delay = input.scheduledAt
            ? Math.max(0, new Date(input.scheduledAt).getTime() - Date.now())
            : 0;
        await this.queue.add("notify", {
            audience: input.audience,
            userId: input.userId,
            topic: input.topic,
            type: input.type,
            title: input.title,
            body: input.body,
            imageUrl: input.imageUrl,
            route: input.route,
            data: input.data,
            silent: input.silent,
            pushLogId: log.id,
        }, { ...notification_queue_js_1.DEFAULT_JOB_OPTIONS, delay });
        return { queued: true, id: log.id };
    }
    /** Admin send history, newest first. */
    async listHistory(query) {
        const pagination = { page: query.page, limit: query.limit };
        const [items, total] = await this.notifications.listPushLogs({
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });
        return { items: items.map(notifications_schema_js_1.toPushLogDto), meta: (0, pagination_js_1.buildMeta)(pagination, total) };
    }
    async registerDevice(userId, token, platform) {
        await this.notifications.upsertDeviceToken(userId, token, platform);
    }
    async unregisterDevice(token) {
        await this.notifications.deleteDeviceToken(token);
    }
    async listMine(userId, query) {
        const pagination = { page: query.page, limit: query.limit };
        const [items, total] = await this.notifications.listByUser(userId, {
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            unreadOnly: query.unreadOnly,
        });
        return { items: items.map(notifications_schema_js_1.toNotificationDto), meta: (0, pagination_js_1.buildMeta)(pagination, total) };
    }
    async markRead(userId, notificationId) {
        const notification = await this.notifications.findById(notificationId);
        if (!notification)
            throw new errors_js_1.NotFoundError("Notification not found");
        if (notification.userId !== userId)
            throw new errors_js_1.ForbiddenError();
        const updated = await this.notifications.markRead(notificationId);
        return (0, notifications_schema_js_1.toNotificationDto)(updated);
    }
    async markAllRead(userId) {
        const updated = await this.notifications.markAllRead(userId);
        return { updated };
    }
    async unreadCount(userId) {
        const count = await this.notifications.countUnread(userId);
        return { count };
    }
}
exports.NotificationsService = NotificationsService;
//# sourceMappingURL=notifications.service.js.map
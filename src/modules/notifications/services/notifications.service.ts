import type { FastifyInstance } from "fastify";
import { ForbiddenError, NotFoundError } from "../../../common/errors.js";
import { buildMeta, type PaginationQuery } from "../../../common/pagination.js";
import type { PageMeta } from "../../../common/response.js";
import type { NotificationsRepository } from "../repositories/notifications.repository.js";
import type { NotificationJob } from "../queues/notification.queue.js";
import { dispatchAndForget } from "./notification-dispatcher.js";
import {
  toNotificationDto,
  toPushLogCreateData,
  toPushLogDto,
  type ListNotificationsQuery,
  type ListPushLogsQuery,
  type NotificationDto,
  type PushLogDto,
  type SendNotificationInput,
} from "../schemas/notifications.schema.js";

export class NotificationsService {
  constructor(
    private readonly notifications: NotificationsRepository,
    private readonly app: FastifyInstance,
  ) {}

  /** Fire-and-forget: delivery (DB persist + push) runs in-process; failures
   *  are logged and never propagate into the calling business flow. */
  async enqueue(job: NotificationJob): Promise<void> {
    dispatchAndForget(this.app, job);
  }

  /**
   * Admin sender: single user, arbitrary topic, or broadcast to every active
   * user. Records a PushLog row (the send history). Immediate sends dispatch
   * in-process right away; scheduled sends stay SCHEDULED and the scheduler
   * poller (src/workers/index.ts) delivers them when due.
   */
  async send(input: SendNotificationInput, sentById: string): Promise<{ queued: true; id: string }> {
    const log = await this.notifications.createPushLog(toPushLogCreateData({ ...input, sentById }));

    const dueInFuture =
      input.scheduledAt !== undefined && new Date(input.scheduledAt).getTime() > Date.now();
    if (!dueInFuture) {
      dispatchAndForget(this.app, {
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
      } satisfies NotificationJob);
    }
    return { queued: true, id: log.id };
  }

  /** Admin send history, newest first. */
  async listHistory(query: ListPushLogsQuery): Promise<{ items: PushLogDto[]; meta: PageMeta }> {
    const pagination: PaginationQuery = { page: query.page, limit: query.limit };
    const [items, total] = await this.notifications.listPushLogs({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items: items.map(toPushLogDto), meta: buildMeta(pagination, total) };
  }

  async registerDevice(userId: string, token: string, platform: string): Promise<void> {
    await this.notifications.upsertDeviceToken(userId, token, platform);
  }

  async unregisterDevice(token: string): Promise<void> {
    await this.notifications.deleteDeviceToken(token);
  }

  async listMine(
    userId: string,
    query: ListNotificationsQuery,
  ): Promise<{ items: NotificationDto[]; meta: PageMeta }> {
    const pagination: PaginationQuery = { page: query.page, limit: query.limit };
    const [items, total] = await this.notifications.listByUser(userId, {
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      unreadOnly: query.unreadOnly,
    });
    return { items: items.map(toNotificationDto), meta: buildMeta(pagination, total) };
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationDto> {
    const notification = await this.notifications.findById(notificationId);
    if (!notification) throw new NotFoundError("Notification not found");
    if (notification.userId !== userId) throw new ForbiddenError();

    const updated = await this.notifications.markRead(notificationId);
    return toNotificationDto(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const updated = await this.notifications.markAllRead(userId);
    return { updated };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notifications.countUnread(userId);
    return { count };
  }
}

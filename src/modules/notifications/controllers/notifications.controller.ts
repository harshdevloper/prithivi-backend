import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { NotificationsService } from "../services/notifications.service.js";
import type {
  ListNotificationsQuery,
  ListPushLogsQuery,
  NotificationIdParams,
  RegisterDeviceInput,
  SendNotificationInput,
  UnregisterDeviceInput,
} from "../schemas/notifications.schema.js";

export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  listMine = async (
    request: FastifyRequest<{ Querystring: ListNotificationsQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.notificationsService.listMine(
      request.user.sub,
      request.query,
    );
    reply.send(success(items, meta));
  };

  markRead = async (
    request: FastifyRequest<{ Params: NotificationIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const notification = await this.notificationsService.markRead(
      request.user.sub,
      request.params.id,
    );
    reply.send(success(notification));
  };

  markAllRead = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = await this.notificationsService.markAllRead(request.user.sub);
    reply.send(success(result));
  };

  unreadCount = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = await this.notificationsService.unreadCount(request.user.sub);
    reply.send(success(result));
  };

  registerDevice = async (
    request: FastifyRequest<{ Body: RegisterDeviceInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.notificationsService.registerDevice(
      request.user.sub,
      request.body.token,
      request.body.platform,
    );
    reply.status(201).send(success({ registered: true }));
  };

  unregisterDevice = async (
    request: FastifyRequest<{ Body: UnregisterDeviceInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.notificationsService.unregisterDevice(request.body.token);
    reply.send(success({ unregistered: true }));
  };

  send = async (
    request: FastifyRequest<{ Body: SendNotificationInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.notificationsService.send(request.body, request.user.sub);
    reply.status(202).send(success(result));
  };

  listHistory = async (
    request: FastifyRequest<{ Querystring: ListPushLogsQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.notificationsService.listHistory(request.query);
    reply.send(success(items, meta));
  };
}

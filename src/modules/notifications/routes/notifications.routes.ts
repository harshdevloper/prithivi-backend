import type { FastifyInstance } from "fastify";
import { authGuard } from "../../../middleware/auth-guard.js";
import { adminOnly, superAdminOnly } from "../../../middleware/role-guard.js";
import {
  listNotificationsQuerySchema,
  listPushLogsQuerySchema,
  notificationIdParamsSchema,
  registerDeviceSchema,
  sendNotificationSchema,
  unregisterDeviceSchema,
  type ListNotificationsQuery,
  type ListPushLogsQuery,
  type NotificationIdParams,
  type RegisterDeviceInput,
  type SendNotificationInput,
  type UnregisterDeviceInput,
} from "../schemas/notifications.schema.js";

export const notificationsRoutes = async (app: FastifyInstance): Promise<void> => {
  const controller = app.di.notificationsController;

  app.post<{ Body: RegisterDeviceInput }>(
    "/devices",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["notifications"],
        summary: "Register this device's FCM token for push notifications",
        security: [{ bearerAuth: [] }],
        body: registerDeviceSchema,
      },
    },
    controller.registerDevice,
  );

  app.delete<{ Body: UnregisterDeviceInput }>(
    "/devices",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["notifications"],
        summary: "Unregister an FCM token (e.g. on sign-out)",
        security: [{ bearerAuth: [] }],
        body: unregisterDeviceSchema,
      },
    },
    controller.unregisterDevice,
  );

  app.post<{ Body: SendNotificationInput }>(
    "/send",
    {
      preHandler: [authGuard, superAdminOnly],
      // The most abusable route in the API — a tight per-route limit on top
      // of the global one caps the blast radius of a leaked admin token.
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["notifications"],
        summary: "Send a notification to one user, a topic, or all users (super admin)",
        security: [{ bearerAuth: [] }],
        body: sendNotificationSchema,
      },
    },
    controller.send,
  );

  app.get<{ Querystring: ListPushLogsQuery }>(
    "/history",
    {
      preHandler: [authGuard, adminOnly],
      schema: {
        tags: ["notifications"],
        summary: "Admin send history with delivery outcomes",
        security: [{ bearerAuth: [] }],
        querystring: listPushLogsQuerySchema,
      },
    },
    controller.listHistory,
  );

  app.get<{ Querystring: ListNotificationsQuery }>(
    "/",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["notifications"],
        summary: "List my notifications",
        security: [{ bearerAuth: [] }],
        querystring: listNotificationsQuerySchema,
      },
    },
    controller.listMine,
  );

  app.get(
    "/unread-count",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["notifications"],
        summary: "Count my unread notifications",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.unreadCount,
  );

  app.patch<{ Params: NotificationIdParams }>(
    "/:id/read",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["notifications"],
        summary: "Mark a notification as read",
        security: [{ bearerAuth: [] }],
        params: notificationIdParamsSchema,
      },
    },
    controller.markRead,
  );

  app.post(
    "/read-all",
    {
      preHandler: [authGuard],
      schema: {
        tags: ["notifications"],
        summary: "Mark all my notifications as read",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.markAllRead,
  );
};

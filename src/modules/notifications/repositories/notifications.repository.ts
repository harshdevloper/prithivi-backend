import type { Notification, Prisma, PrismaClient, PushLog } from "@prisma/client";
import type { PushLogWithSender } from "../schemas/notifications.schema.js";

export class NotificationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  listByUser(
    userId: string,
    params: { skip: number; take: number; unreadOnly?: boolean },
  ): Promise<[Notification[], number]> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(params.unreadOnly ? { readAt: null } : {}),
    };
    return Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);
  }

  markRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  // ---- device tokens (push) ----

  upsertDeviceToken(userId: string, token: string, platform: string): Promise<unknown> {
    return this.prisma.deviceToken.upsert({
      where: { token },
      // A token can move between accounts on a shared device — reassign it.
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  async deleteDeviceToken(token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
  }

  async deleteDeviceTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.prisma.deviceToken.deleteMany({ where: { token: { in: tokens } } });
  }

  async tokensForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return rows.map((row) => row.token);
  }

  async activeUserIds(): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async createForUsers(
    userIds: string[],
    data: Omit<Prisma.NotificationUncheckedCreateInput, "userId">,
  ): Promise<number> {
    if (userIds.length === 0) return 0;
    const result = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, ...data })),
    });
    return result.count;
  }

  // ---- push logs (admin send history) ----

  createPushLog(data: Prisma.PushLogUncheckedCreateInput): Promise<PushLog> {
    return this.prisma.pushLog.create({ data });
  }

  async updatePushLog(id: string, data: Prisma.PushLogUncheckedUpdateInput): Promise<void> {
    await this.prisma.pushLog.update({ where: { id }, data });
  }

  listPushLogs(params: { skip: number; take: number }): Promise<[PushLogWithSender[], number]> {
    return Promise.all([
      this.prisma.pushLog.findMany({
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        include: { sentBy: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.pushLog.count(),
    ]);
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsRepository = void 0;
class NotificationsRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data) {
        return this.prisma.notification.create({ data });
    }
    findById(id) {
        return this.prisma.notification.findUnique({ where: { id } });
    }
    listByUser(userId, params) {
        const where = {
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
    markRead(id) {
        return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    }
    async markAllRead(userId) {
        const result = await this.prisma.notification.updateMany({
            where: { userId, readAt: null },
            data: { readAt: new Date() },
        });
        return result.count;
    }
    countUnread(userId) {
        return this.prisma.notification.count({ where: { userId, readAt: null } });
    }
    // ---- device tokens (push) ----
    upsertDeviceToken(userId, token, platform) {
        return this.prisma.deviceToken.upsert({
            where: { token },
            // A token can move between accounts on a shared device — reassign it.
            update: { userId, platform },
            create: { userId, token, platform },
        });
    }
    async deleteDeviceToken(token) {
        await this.prisma.deviceToken.deleteMany({ where: { token } });
    }
    async deleteDeviceTokens(tokens) {
        if (tokens.length === 0)
            return;
        await this.prisma.deviceToken.deleteMany({ where: { token: { in: tokens } } });
    }
    async tokensForUser(userId) {
        const rows = await this.prisma.deviceToken.findMany({
            where: { userId },
            select: { token: true },
        });
        return rows.map((row) => row.token);
    }
    async activeUserIds() {
        const rows = await this.prisma.user.findMany({
            where: { isActive: true },
            select: { id: true },
        });
        return rows.map((row) => row.id);
    }
    async createForUsers(userIds, data) {
        if (userIds.length === 0)
            return 0;
        const result = await this.prisma.notification.createMany({
            data: userIds.map((userId) => ({ userId, ...data })),
        });
        return result.count;
    }
    // ---- push logs (admin send history) ----
    createPushLog(data) {
        return this.prisma.pushLog.create({ data });
    }
    async updatePushLog(id, data) {
        await this.prisma.pushLog.update({ where: { id }, data });
    }
    listPushLogs(params) {
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
exports.NotificationsRepository = NotificationsRepository;
//# sourceMappingURL=notifications.repository.js.map
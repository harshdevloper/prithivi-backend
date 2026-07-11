"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsRepository = void 0;
class AnalyticsRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    createEvent(data) {
        return this.prisma.analyticsEvent.create({
            data: {
                name: data.name,
                userId: data.userId,
                metadata: data.metadata,
            },
        });
    }
    async countsByName(from, to) {
        const grouped = await this.prisma.analyticsEvent.groupBy({
            by: ["name"],
            where: {
                createdAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                },
            },
            _count: { _all: true },
            orderBy: { _count: { name: "desc" } },
        });
        return grouped.map((row) => ({ name: row.name, count: row._count._all }));
    }
    totalEvents(from, to) {
        return this.prisma.analyticsEvent.count({
            where: {
                createdAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                },
            },
        });
    }
}
exports.AnalyticsRepository = AnalyticsRepository;
//# sourceMappingURL=analytics.repository.js.map
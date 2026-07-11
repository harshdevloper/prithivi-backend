import type { Prisma, PrismaClient } from "@prisma/client";

export interface EventCount {
  name: string;
  count: number;
}

export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createEvent(data: {
    name: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<unknown> {
    return this.prisma.analyticsEvent.create({
      data: {
        name: data.name,
        userId: data.userId,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async countsByName(from?: Date, to?: Date): Promise<EventCount[]> {
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

  totalEvents(from?: Date, to?: Date): Promise<number> {
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

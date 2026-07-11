import type { PrismaClient, Setting } from "@prisma/client";

export class SettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<Setting[]> {
    return this.prisma.setting.findMany();
  }

  /** Upsert each override in one transaction. */
  async upsertMany(
    entries: { key: string; value: string }[],
    updatedById: string | undefined,
  ): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.setting.upsert({
          where: { key: entry.key },
          create: { key: entry.key, value: entry.value, updatedById },
          update: { value: entry.value, updatedById },
        }),
      ),
    );
  }
}

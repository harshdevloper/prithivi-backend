"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsRepository = void 0;
class SettingsRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.setting.findMany();
    }
    /** Upsert each override in one transaction. */
    async upsertMany(entries, updatedById) {
        if (entries.length === 0)
            return;
        await this.prisma.$transaction(entries.map((entry) => this.prisma.setting.upsert({
            where: { key: entry.key },
            create: { key: entry.key, value: entry.value, updatedById },
            update: { value: entry.value, updatedById },
        })));
    }
}
exports.SettingsRepository = SettingsRepository;
//# sourceMappingURL=settings.repository.js.map
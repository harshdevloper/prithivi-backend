"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignRepository = void 0;
class CampaignRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data) {
        return this.prisma.campaign.create({ data });
    }
    findById(id) {
        return this.prisma.campaign.findUnique({ where: { id } });
    }
    update(id, data) {
        return this.prisma.campaign.update({ where: { id }, data });
    }
    list(params) {
        const where = params.status ? { status: params.status } : {};
        return Promise.all([
            this.prisma.campaign.findMany({
                where,
                skip: params.skip,
                take: params.take,
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.campaign.count({ where }),
        ]);
    }
    countByStatus(status) {
        return this.prisma.campaign.count({ where: { status } });
    }
}
exports.CampaignRepository = CampaignRepository;
//# sourceMappingURL=campaign.repository.js.map
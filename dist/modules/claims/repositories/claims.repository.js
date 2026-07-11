"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimsRepository = void 0;
class ClaimsRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data) {
        return this.prisma.claim.create({ data });
    }
    findById(id) {
        return this.prisma.claim.findUnique({
            where: { id },
            include: { campaign: true, user: true },
        });
    }
    findByUserAndCampaign(userId, campaignId) {
        return this.prisma.claim.findUnique({
            where: { campaignId_userId: { campaignId, userId } },
        });
    }
    listByUser(userId, params) {
        const where = {
            userId,
            ...(params.status ? { status: params.status } : {}),
        };
        return Promise.all([
            this.prisma.claim.findMany({
                where,
                skip: params.skip,
                take: params.take,
                orderBy: { createdAt: "desc" },
                include: { campaign: true, user: true },
            }),
            this.prisma.claim.count({ where }),
        ]);
    }
    list(params) {
        const where = params.status ? { status: params.status } : {};
        return Promise.all([
            this.prisma.claim.findMany({
                where,
                skip: params.skip,
                take: params.take,
                orderBy: { createdAt: "desc" },
                include: { campaign: true, user: true },
            }),
            this.prisma.claim.count({ where }),
        ]);
    }
    countByStatus(status) {
        return this.prisma.claim.count({ where: { status } });
    }
}
exports.ClaimsRepository = ClaimsRepository;
//# sourceMappingURL=claims.repository.js.map
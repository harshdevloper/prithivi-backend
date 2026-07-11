"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimsService = void 0;
const client_1 = require("@prisma/client");
const errors_js_1 = require("../../../common/errors.js");
const pagination_js_1 = require("../../../common/pagination.js");
const claims_schema_js_1 = require("../schemas/claims.schema.js");
class ClaimsService {
    prisma;
    claims;
    campaigns;
    notifications;
    constructor(
    // Injected for cross-aggregate transactions (claim + wallet must commit together).
    prisma, claims, campaigns, notifications) {
        this.prisma = prisma;
        this.claims = claims;
        this.campaigns = campaigns;
        this.notifications = notifications;
    }
    async submit(userId, input) {
        const campaign = await this.campaigns.findById(input.campaignId);
        if (!campaign)
            throw new errors_js_1.NotFoundError("Campaign not found");
        if (campaign.status !== "ACTIVE") {
            throw new errors_js_1.BadRequestError("Claims can only be submitted for active campaigns");
        }
        const now = new Date();
        if (campaign.startsAt && campaign.startsAt > now) {
            throw new errors_js_1.BadRequestError("Campaign has not started yet");
        }
        if (campaign.endsAt && campaign.endsAt < now) {
            throw new errors_js_1.BadRequestError("Campaign has already ended");
        }
        const existing = await this.claims.findByUserAndCampaign(userId, input.campaignId);
        if (existing) {
            throw new errors_js_1.ConflictError("You have already submitted a claim for this campaign");
        }
        const claim = await this.claims.create({
            campaignId: input.campaignId,
            userId,
            rewardAmount: campaign.rewardAmount,
            note: input.note,
        });
        const withRelations = await this.claims.findById(claim.id);
        return (0, claims_schema_js_1.toClaimDto)(withRelations);
    }
    async review(claimId, reviewerId, input) {
        const claim = await this.claims.findById(claimId);
        if (!claim)
            throw new errors_js_1.NotFoundError("Claim not found");
        if (claim.status !== "PENDING") {
            throw new errors_js_1.ConflictError(`Claim has already been ${claim.status.toLowerCase()}`);
        }
        if (input.action === "REJECT") {
            await this.prisma.claim.update({
                where: { id: claimId },
                data: {
                    status: "REJECTED",
                    reviewNote: input.reviewNote,
                    reviewedById: reviewerId,
                    reviewedAt: new Date(),
                },
            });
            await this.notifications.enqueue({
                userId: claim.userId,
                type: "CLAIM",
                title: "Claim rejected",
                body: `Your claim for "${claim.campaign.title}" was rejected.`,
            });
        }
        else {
            // Approve + credit the wallet atomically.
            await this.prisma.$transaction(async (tx) => {
                await tx.claim.update({
                    where: { id: claimId },
                    data: {
                        status: "APPROVED",
                        reviewNote: input.reviewNote,
                        reviewedById: reviewerId,
                        reviewedAt: new Date(),
                    },
                });
                const wallet = await tx.wallet.upsert({
                    where: { userId: claim.userId },
                    create: { userId: claim.userId },
                    update: {},
                });
                const updated = await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: claim.rewardAmount } },
                });
                await tx.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: "CREDIT",
                        amount: new client_1.Prisma.Decimal(claim.rewardAmount),
                        balanceAfter: updated.balance,
                        reference: `claim:${claim.id}`,
                        description: `Reward for campaign "${claim.campaign.title}"`,
                    },
                });
            });
            await this.notifications.enqueue({
                userId: claim.userId,
                type: "WALLET",
                title: "Reward credited",
                body: `Your claim for "${claim.campaign.title}" was approved and ${claim.rewardAmount.toFixed(2)} was credited to your wallet.`,
            });
        }
        const refreshed = await this.claims.findById(claimId);
        return (0, claims_schema_js_1.toClaimDto)(refreshed);
    }
    async listMine(userId, query) {
        const pagination = { page: query.page, limit: query.limit };
        const [claims, total] = await this.claims.listByUser(userId, {
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            status: query.status,
        });
        return { items: claims.map(claims_schema_js_1.toClaimDto), meta: (0, pagination_js_1.buildMeta)(pagination, total) };
    }
    async listAll(query) {
        const pagination = { page: query.page, limit: query.limit };
        const [claims, total] = await this.claims.list({
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            status: query.status,
        });
        return { items: claims.map(claims_schema_js_1.toClaimDto), meta: (0, pagination_js_1.buildMeta)(pagination, total) };
    }
}
exports.ClaimsService = ClaimsService;
//# sourceMappingURL=claims.service.js.map
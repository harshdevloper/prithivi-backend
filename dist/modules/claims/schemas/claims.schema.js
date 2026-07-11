"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClaimsQuerySchema = exports.claimIdParamsSchema = exports.reviewClaimSchema = exports.submitClaimSchema = exports.toClaimDto = exports.claimSchema = exports.claimStatusSchema = void 0;
const zod_1 = require("zod");
exports.claimStatusSchema = zod_1.z.enum(["PENDING", "APPROVED", "REJECTED"]);
exports.claimSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    campaignId: zod_1.z.string().uuid(),
    campaignTitle: zod_1.z.string(),
    userId: zod_1.z.string().uuid(),
    userEmail: zod_1.z.string().email(),
    status: exports.claimStatusSchema,
    rewardAmount: zod_1.z.number(),
    note: zod_1.z.string().nullable(),
    reviewNote: zod_1.z.string().nullable(),
    reviewedAt: zod_1.z.string().datetime().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
const toClaimDto = (claim) => ({
    id: claim.id,
    campaignId: claim.campaignId,
    campaignTitle: claim.campaign.title,
    userId: claim.userId,
    userEmail: claim.user.email,
    status: claim.status,
    rewardAmount: claim.rewardAmount.toNumber(),
    note: claim.note,
    reviewNote: claim.reviewNote,
    reviewedAt: claim.reviewedAt?.toISOString() ?? null,
    createdAt: claim.createdAt.toISOString(),
});
exports.toClaimDto = toClaimDto;
exports.submitClaimSchema = zod_1.z.object({
    campaignId: zod_1.z.string().uuid(),
    note: zod_1.z.string().max(2000).optional(),
});
exports.reviewClaimSchema = zod_1.z.object({
    action: zod_1.z.enum(["APPROVE", "REJECT"]),
    reviewNote: zod_1.z.string().max(2000).optional(),
});
exports.claimIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.listClaimsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: exports.claimStatusSchema.optional(),
});
//# sourceMappingURL=claims.schema.js.map
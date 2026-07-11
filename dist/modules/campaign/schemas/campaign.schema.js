"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCampaignsQuerySchema = exports.campaignIdParamsSchema = exports.changeCampaignStatusSchema = exports.updateCampaignSchema = exports.createCampaignSchema = exports.toCampaignDto = exports.campaignSchema = exports.campaignStatusSchema = void 0;
const zod_1 = require("zod");
exports.campaignStatusSchema = zod_1.z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]);
exports.campaignSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    rewardAmount: zod_1.z.number(),
    budget: zod_1.z.number().nullable(),
    status: exports.campaignStatusSchema,
    startsAt: zod_1.z.string().datetime().nullable(),
    endsAt: zod_1.z.string().datetime().nullable(),
    createdById: zod_1.z.string().uuid(),
    createdAt: zod_1.z.string().datetime(),
});
const toCampaignDto = (campaign) => ({
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    rewardAmount: campaign.rewardAmount.toNumber(),
    budget: campaign.budget?.toNumber() ?? null,
    status: campaign.status,
    startsAt: campaign.startsAt?.toISOString() ?? null,
    endsAt: campaign.endsAt?.toISOString() ?? null,
    createdById: campaign.createdById,
    createdAt: campaign.createdAt.toISOString(),
});
exports.toCampaignDto = toCampaignDto;
exports.createCampaignSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(200),
    description: zod_1.z.string().min(1).max(5000),
    rewardAmount: zod_1.z.number().positive().max(1_000_000),
    budget: zod_1.z.number().positive().optional(),
    startsAt: zod_1.z.coerce.date().optional(),
    endsAt: zod_1.z.coerce.date().optional(),
});
exports.updateCampaignSchema = exports.createCampaignSchema.partial();
exports.changeCampaignStatusSchema = zod_1.z.object({
    status: exports.campaignStatusSchema,
});
exports.campaignIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.listCampaignsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: exports.campaignStatusSchema.optional(),
});
//# sourceMappingURL=campaign.schema.js.map
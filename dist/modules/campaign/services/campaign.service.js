"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
const errors_js_1 = require("../../../common/errors.js");
const pagination_js_1 = require("../../../common/pagination.js");
const campaign_schema_js_1 = require("../schemas/campaign.schema.js");
const ALLOWED_TRANSITIONS = {
    DRAFT: ["ACTIVE"],
    ACTIVE: ["PAUSED", "ENDED"],
    PAUSED: ["ACTIVE", "ENDED"],
    ENDED: [],
};
class CampaignService {
    campaigns;
    notifications;
    constructor(campaigns, notifications) {
        this.campaigns = campaigns;
        this.notifications = notifications;
    }
    async create(createdById, input) {
        this.assertDateRange(input.startsAt, input.endsAt);
        const campaign = await this.campaigns.create({
            title: input.title,
            description: input.description,
            rewardAmount: input.rewardAmount,
            budget: input.budget,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            createdById,
        });
        return (0, campaign_schema_js_1.toCampaignDto)(campaign);
    }
    async update(id, input) {
        const existing = await this.campaigns.findById(id);
        if (!existing)
            throw new errors_js_1.NotFoundError("Campaign not found");
        this.assertDateRange(input.startsAt ?? existing.startsAt ?? undefined, input.endsAt ?? existing.endsAt ?? undefined);
        const campaign = await this.campaigns.update(id, input);
        return (0, campaign_schema_js_1.toCampaignDto)(campaign);
    }
    async changeStatus(id, status) {
        const existing = await this.campaigns.findById(id);
        if (!existing)
            throw new errors_js_1.NotFoundError("Campaign not found");
        if (existing.status !== status && !ALLOWED_TRANSITIONS[existing.status].includes(status)) {
            throw new errors_js_1.BadRequestError(`Cannot change campaign status from ${existing.status} to ${status}`);
        }
        const campaign = await this.campaigns.update(id, { status });
        // Broadcast on the transition into ACTIVE only — editing an already-active
        // campaign must not re-notify every user.
        if (existing.status !== "ACTIVE" && campaign.status === "ACTIVE") {
            await this.notifications.enqueue({
                audience: "all",
                type: "CAMPAIGN",
                title: `New campaign: ${campaign.title}`,
                body: `Earn ${campaign.rewardAmount.toFixed(2)} — tap to see details.`,
                route: `/campaigns/${campaign.id}`,
            });
        }
        return (0, campaign_schema_js_1.toCampaignDto)(campaign);
    }
    async getById(id) {
        const campaign = await this.campaigns.findById(id);
        if (!campaign)
            throw new errors_js_1.NotFoundError("Campaign not found");
        return (0, campaign_schema_js_1.toCampaignDto)(campaign);
    }
    /** Public listing — only ACTIVE campaigns are visible. */
    async listActive(query) {
        const [campaigns, total] = await this.campaigns.list({
            ...(0, pagination_js_1.toSkipTake)(query),
            status: "ACTIVE",
        });
        return { items: campaigns.map(campaign_schema_js_1.toCampaignDto), meta: (0, pagination_js_1.buildMeta)(query, total) };
    }
    /** Admin listing — any status. */
    async listAll(query, status) {
        const [campaigns, total] = await this.campaigns.list({ ...(0, pagination_js_1.toSkipTake)(query), status });
        return { items: campaigns.map(campaign_schema_js_1.toCampaignDto), meta: (0, pagination_js_1.buildMeta)(query, total) };
    }
    assertDateRange(startsAt, endsAt) {
        if (startsAt && endsAt && endsAt <= startsAt) {
            throw new errors_js_1.BadRequestError("endsAt must be after startsAt");
        }
    }
}
exports.CampaignService = CampaignService;
//# sourceMappingURL=campaign.service.js.map
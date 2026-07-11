import type { CampaignStatus } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../../../common/errors.js";
import { buildMeta, toSkipTake, type PaginationQuery } from "../../../common/pagination.js";
import type { PageMeta } from "../../../common/response.js";
import type { NotificationsService } from "../../notifications/services/notifications.service.js";
import type { CampaignRepository } from "../repositories/campaign.repository.js";
import {
  toCampaignDto,
  type CampaignDto,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from "../schemas/campaign.schema.js";

const ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["PAUSED", "ENDED"],
  PAUSED: ["ACTIVE", "ENDED"],
  ENDED: [],
};

export class CampaignService {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async create(createdById: string, input: CreateCampaignInput): Promise<CampaignDto> {
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
    return toCampaignDto(campaign);
  }

  async update(id: string, input: UpdateCampaignInput): Promise<CampaignDto> {
    const existing = await this.campaigns.findById(id);
    if (!existing) throw new NotFoundError("Campaign not found");

    this.assertDateRange(
      input.startsAt ?? existing.startsAt ?? undefined,
      input.endsAt ?? existing.endsAt ?? undefined,
    );

    const campaign = await this.campaigns.update(id, input);
    return toCampaignDto(campaign);
  }

  async changeStatus(id: string, status: CampaignStatus): Promise<CampaignDto> {
    const existing = await this.campaigns.findById(id);
    if (!existing) throw new NotFoundError("Campaign not found");

    if (existing.status !== status && !ALLOWED_TRANSITIONS[existing.status].includes(status)) {
      throw new BadRequestError(
        `Cannot change campaign status from ${existing.status} to ${status}`,
      );
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

    return toCampaignDto(campaign);
  }

  async getById(id: string): Promise<CampaignDto> {
    const campaign = await this.campaigns.findById(id);
    if (!campaign) throw new NotFoundError("Campaign not found");
    return toCampaignDto(campaign);
  }

  /** Public listing — only ACTIVE campaigns are visible. */
  async listActive(query: PaginationQuery): Promise<{ items: CampaignDto[]; meta: PageMeta }> {
    const [campaigns, total] = await this.campaigns.list({
      ...toSkipTake(query),
      status: "ACTIVE",
    });
    return { items: campaigns.map(toCampaignDto), meta: buildMeta(query, total) };
  }

  /** Admin listing — any status. */
  async listAll(
    query: PaginationQuery,
    status?: CampaignStatus,
  ): Promise<{ items: CampaignDto[]; meta: PageMeta }> {
    const [campaigns, total] = await this.campaigns.list({ ...toSkipTake(query), status });
    return { items: campaigns.map(toCampaignDto), meta: buildMeta(query, total) };
  }

  private assertDateRange(startsAt?: Date | null, endsAt?: Date | null): void {
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestError("endsAt must be after startsAt");
    }
  }
}

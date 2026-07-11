import { z } from "zod";
import type { Campaign } from "@prisma/client";

export const campaignStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]);

export const campaignSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  rewardAmount: z.number(),
  budget: z.number().nullable(),
  status: campaignStatusSchema,
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  createdById: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type CampaignDto = z.infer<typeof campaignSchema>;

export const toCampaignDto = (campaign: Campaign): CampaignDto => ({
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

export const createCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  rewardAmount: z.number().positive().max(1_000_000),
  budget: z.number().positive().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.partial();
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const changeCampaignStatusSchema = z.object({
  status: campaignStatusSchema,
});
export type ChangeCampaignStatusInput = z.infer<typeof changeCampaignStatusSchema>;

export const campaignIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type CampaignIdParams = z.infer<typeof campaignIdParamsSchema>;

export const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: campaignStatusSchema.optional(),
});
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;

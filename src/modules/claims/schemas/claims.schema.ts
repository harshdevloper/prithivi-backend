import { z } from "zod";
import type { ClaimWithRelations } from "../repositories/claims.repository.js";

export const claimStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const claimSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  campaignTitle: z.string(),
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  status: claimStatusSchema,
  rewardAmount: z.number(),
  note: z.string().nullable(),
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type ClaimDto = z.infer<typeof claimSchema>;

export const toClaimDto = (claim: ClaimWithRelations): ClaimDto => ({
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

export const submitClaimSchema = z.object({
  campaignId: z.string().uuid(),
  note: z.string().max(2000).optional(),
});
export type SubmitClaimInput = z.infer<typeof submitClaimSchema>;

export const reviewClaimSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().max(2000).optional(),
});
export type ReviewClaimInput = z.infer<typeof reviewClaimSchema>;

export const claimIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type ClaimIdParams = z.infer<typeof claimIdParamsSchema>;

export const listClaimsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: claimStatusSchema.optional(),
});
export type ListClaimsQuery = z.infer<typeof listClaimsQuerySchema>;

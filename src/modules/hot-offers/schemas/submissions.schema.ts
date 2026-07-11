import { z } from "zod";
import type { Offer, OfferSubmission, User } from "@prisma/client";

const submissionStatus = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NEED_MORE_PROOF",
  "CANCELLED",
]);

export const submitProofSchema = z.object({
  offerId: z.string().uuid(),
  screenshotUrl: z.string().url().max(2048),
  note: z.string().max(1000).optional(),
});
export type SubmitProofInput = z.infer<typeof submitProofSchema>;

export const reviewSubmissionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "NEED_MORE_PROOF"]),
  reviewNote: z.string().max(1000).optional(),
});
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

export const listSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: submissionStatus.optional(),
});
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;

// ---- fraud overview (Module 4) ----

export interface FraudOverviewDto {
  flagThreshold: number;
  flaggedUsers: {
    user: { id: string; name: string; email: string };
    score: number;
    events: number;
    flagged: boolean;
  }[];
  recentLogs: {
    id: string;
    type: string;
    score: number;
    detail: string | null;
    createdAt: string;
    user: { id: string; name: string; email: string };
  }[];
}

export const submissionSchema = z.object({
  id: z.string().uuid(),
  offerId: z.string().uuid(),
  offerTitle: z.string(),
  offerSlug: z.string(),
  offerThumbnailUrl: z.string().nullable(),
  screenshotUrl: z.string(),
  note: z.string().nullable(),
  status: submissionStatus,
  reviewNote: z.string().nullable(),
  rewardAmount: z.number(),
  reviewedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  // Present only on the admin listing.
  user: z.object({ id: z.string().uuid(), name: z.string(), email: z.string() }).optional(),
});
export type SubmissionDto = z.infer<typeof submissionSchema>;

export type SubmissionWithRelations = OfferSubmission & {
  offer: Pick<Offer, "title" | "slug" | "thumbnailUrl">;
  user?: Pick<User, "id" | "name" | "email">;
};

export const toSubmissionDto = (
  submission: SubmissionWithRelations,
  includeUser = false,
): SubmissionDto => ({
  id: submission.id,
  offerId: submission.offerId,
  offerTitle: submission.offer.title,
  offerSlug: submission.offer.slug,
  offerThumbnailUrl: submission.offer.thumbnailUrl,
  screenshotUrl: submission.screenshotUrl,
  note: submission.note,
  status: submission.status,
  reviewNote: submission.reviewNote,
  rewardAmount: Number(submission.rewardAmount),
  reviewedAt: submission.reviewedAt?.toISOString() ?? null,
  createdAt: submission.createdAt.toISOString(),
  ...(includeUser && submission.user ? { user: submission.user } : {}),
});

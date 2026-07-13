import { z } from "zod";
import type { Redemption, User } from "@prisma/client";

export const redemptionStatus = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "FULFILLED",
  "FAILED",
]);

export const idParamsSchema = z.object({ id: z.string().uuid() });
export type IdParams = z.infer<typeof idParamsSchema>;

export const createRedemptionSchema = z.object({
  coins: z.number().int().positive().max(1_000_000),
});
export type CreateRedemptionInput = z.infer<typeof createRedemptionSchema>;

export const reviewRedemptionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(1000).optional(),
});
export type ReviewRedemptionInput = z.infer<typeof reviewRedemptionSchema>;

export const fulfillRedemptionSchema = z.object({
  voucherCode: z.string().min(1).max(200),
  voucherUrl: z.string().url().max(2048).optional(),
});
export type FulfillRedemptionInput = z.infer<typeof fulfillRedemptionSchema>;

export const adminListRedemptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: redemptionStatus.optional(),
  userId: z.string().uuid().optional(),
  /** Case-insensitive match on the requesting user's email. */
  search: z.string().max(200).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AdminListRedemptionsQuery = z.infer<typeof adminListRedemptionsQuerySchema>;

// ---- DTOs ----

export interface RedemptionDto {
  id: string;
  coins: number;
  status: z.infer<typeof redemptionStatus>;
  provider: string | null;
  voucherCode: string | null;
  voucherUrl: string | null;
  note: string | null;
  reviewedAt: string | null;
  createdAt: string;
  // Admin listing only:
  providerRef?: string | null;
  failReason?: string | null;
  user?: { id: string; name: string; email: string };
}

export interface RedemptionConfigDto {
  enabled: boolean;
  minCoins: number;
}

export type RedemptionWithUser = Redemption & {
  user: Pick<User, "id" | "name" | "email">;
};

export const toRedemptionDto = (
  redemption: Redemption | RedemptionWithUser,
  admin = false,
): RedemptionDto => ({
  id: redemption.id,
  coins: Number(redemption.coins),
  status: redemption.status,
  provider: redemption.provider,
  voucherCode: redemption.voucherCode,
  voucherUrl: redemption.voucherUrl,
  note: redemption.note,
  reviewedAt: redemption.reviewedAt?.toISOString() ?? null,
  createdAt: redemption.createdAt.toISOString(),
  ...(admin
    ? {
        providerRef: redemption.providerRef,
        failReason: redemption.failReason,
        ...("user" in redemption ? { user: redemption.user } : {}),
      }
    : {}),
});

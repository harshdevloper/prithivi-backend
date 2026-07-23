import { z } from "zod";
import type { Redemption, User, VoucherOffer } from "@prisma/client";

export const redemptionStatus = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "FULFILLED",
  "FAILED",
]);

export const idParamsSchema = z.object({ id: z.string().uuid() });
export type IdParams = z.infer<typeof idParamsSchema>;

/** Either a catalog item (voucherOfferId) or a legacy free coin amount. */
export const createRedemptionSchema = z
  .object({
    coins: z.number().int().positive().max(1_000_000).optional(),
    voucherOfferId: z.string().uuid().optional(),
  })
  .refine((v) => (v.coins === undefined) !== (v.voucherOfferId === undefined), {
    message: "Provide either coins or voucherOfferId",
  });
export type CreateRedemptionInput = z.infer<typeof createRedemptionSchema>;

export const listMineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: redemptionStatus.optional(),
});
export type ListMineQuery = z.infer<typeof listMineQuerySchema>;

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

// ---- Voucher catalog ----

export const createVoucherOfferSchema = z.object({
  title: z.string().min(1).max(120),
  brand: z.string().min(1).max(60),
  description: z.string().max(500).nullish(),
  imageUrl: z.string().url().max(2048).nullish(),
  coinCost: z.number().int().positive().max(1_000_000),
  denomination: z.number().positive().max(1_000_000),
  provider: z.enum(["manual", "plum", "xoxo_code"]).default("manual"),
  providerBrandId: z.string().max(100).nullish(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(-1_000_000).max(1_000_000).default(0),
});
export type CreateVoucherOfferInput = z.infer<typeof createVoucherOfferSchema>;

export const updateVoucherOfferSchema = createVoucherOfferSchema.partial();
export type UpdateVoucherOfferInput = z.infer<typeof updateVoucherOfferSchema>;

export interface VoucherOfferDto {
  id: string;
  title: string;
  brand: string;
  description: string | null;
  imageUrl: string | null;
  coinCost: number;
  denomination: number;
  provider: string;
  providerBrandId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export const toVoucherOfferDto = (offer: VoucherOffer): VoucherOfferDto => ({
  id: offer.id,
  title: offer.title,
  brand: offer.brand,
  description: offer.description,
  imageUrl: offer.imageUrl,
  coinCost: offer.coinCost,
  denomination: Number(offer.denomination),
  provider: offer.provider,
  providerBrandId: offer.providerBrandId,
  isActive: offer.isActive,
  sortOrder: offer.sortOrder,
  createdAt: offer.createdAt.toISOString(),
});

// ---- DTOs ----

type OfferSummary = Pick<VoucherOffer, "id" | "title" | "brand" | "imageUrl" | "denomination">;

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
  /** Catalog item this redemption is for; null for legacy amount-only rows. */
  offer: { id: string; title: string; brand: string; imageUrl: string | null; denomination: number } | null;
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
  voucherOffer?: OfferSummary | null;
};

export type RedemptionWithOffer = Redemption & { voucherOffer?: OfferSummary | null };

export const toRedemptionDto = (
  redemption: RedemptionWithOffer | RedemptionWithUser,
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
  offer: redemption.voucherOffer
    ? {
        id: redemption.voucherOffer.id,
        title: redemption.voucherOffer.title,
        brand: redemption.voucherOffer.brand,
        imageUrl: redemption.voucherOffer.imageUrl,
        denomination: Number(redemption.voucherOffer.denomination),
      }
    : null,
  ...(admin
    ? {
        providerRef: redemption.providerRef,
        failReason: redemption.failReason,
        ...("user" in redemption ? { user: redemption.user } : {}),
      }
    : {}),
});

import { createHash, timingSafeEqual } from "node:crypto";
import { Prisma, type CpxStatus, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ForbiddenError, NotFoundError } from "../../common/errors.js";
import { buildMeta, paginationQuerySchema } from "../../common/pagination.js";
import type { PageMeta } from "../../common/response.js";
import type { Env } from "../../config/env.js";
import type { NotificationsService } from "../notifications/services/notifications.service.js";
import type { SettingsService } from "../settings/services/settings.service.js";

const WALL_BASE = "https://offers.cpx-research.com/index.php";

/**
 * Query CPX sends. The postback URL configured in the CPX dashboard is:
 * /cpx/postback?status={status}&trans_id={trans_id}&user_id={user_id}
 *   &amount_local={amount_local}&amount_usd={amount_usd}&offer_id={offer_ID}
 *   &type={type}&hash={secure_hash}
 */
export const cpxPostbackQuerySchema = z.object({
  status: z.coerce.number().int().refine((s) => s === 1 || s === 2, "status must be 1 or 2"),
  trans_id: z.string().min(1).max(191),
  user_id: z.string().min(1).max(191),
  amount_local: z.coerce.number().finite(),
  amount_usd: z.coerce.number().finite().optional(),
  offer_id: z.string().max(191).optional(),
  type: z.string().max(32).optional(),
  hash: z.string().min(1).max(64),
});
export type CpxPostbackQuery = z.infer<typeof cpxPostbackQuerySchema>;

export const cpxListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["COMPLETED", "REVERSED"]).optional(),
  search: z.string().trim().max(191).optional(),
});
export type CpxListQuery = z.infer<typeof cpxListQuerySchema>;

export const md5 = (value: string): string => createHash("md5").update(value).digest("hex");

const sameHex = (a: string, b: string): boolean =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

type Tx = Prisma.TransactionClient;

// ponytail: prisma used directly, same as missions — split a repository out if queries grow.
export class CpxService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly env: Env,
  ) {}

  /** Admin settings win; env is the fallback so the key can live on the server only. */
  private async config(): Promise<{ enabled: boolean; appId: string; secureHash: string }> {
    const [enabled, appId, secureHash] = await Promise.all([
      this.settings.getBoolean("cpx.enabled"),
      this.settings.getString("cpx.appId"),
      this.settings.getString("cpx.secureHash"),
    ]);
    return {
      enabled,
      appId: appId || this.env.CPX_APP_ID || "",
      secureHash: secureHash || this.env.CPX_SECURE_HASH || "",
    };
  }

  /** Signed survey-wall URL for this user, or null when surveys are off/unconfigured. */
  async wall(userId: string): Promise<{ url: string | null }> {
    const { enabled, appId, secureHash } = await this.config();
    if (!enabled || !appId || !secureHash) return { url: null };
    const params = new URLSearchParams({
      app_id: appId,
      ext_user_id: userId,
      secure_hash: md5(`${userId}-${secureHash}`),
    });
    return { url: `${WALL_BASE}?${params}` };
  }

  /** Verifies the CPX signature, then credits (status 1) or reverses (status 2). Idempotent per trans_id. */
  async postback(q: CpxPostbackQuery): Promise<string> {
    const { secureHash } = await this.config();
    if (!secureHash) throw new ForbiddenError("CPX is not configured");
    if (!sameHex(md5(`${q.trans_id}-${secureHash}`), q.hash.toLowerCase())) {
      throw new ForbiddenError("Invalid CPX hash");
    }

    const user = await this.prisma.user.findUnique({ where: { id: q.user_id }, select: { id: true } });
    if (!user) throw new NotFoundError("Unknown user");

    const coins = new Prisma.Decimal(Math.max(0, q.amount_local).toFixed(2));
    const row = {
      transId: q.trans_id,
      userId: user.id,
      coins,
      amountUsd: q.amount_usd === undefined ? null : new Prisma.Decimal(q.amount_usd.toFixed(4)),
      offerId: q.offer_id || null,
      type: q.type || null,
    };

    try {
      if (q.status === 1) {
        await this.prisma.$transaction(async (tx) => {
          await tx.cpxTransaction.create({ data: { ...row, status: "COMPLETED" } });
          if (coins.gt(0)) {
            await this.moveCoins(tx, user.id, coins, "CREDIT", q.trans_id, "Survey reward (CPX Research)");
          }
        });
        if (coins.gt(0)) {
          await this.notifications.enqueue({
            userId: user.id,
            type: "WALLET",
            title: "Survey reward credited",
            body: `${coins.toFixed(0)} coins were added to your wallet for completing a survey.`,
          });
        }
        return "credited";
      }

      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.cpxTransaction.findUnique({ where: { transId: q.trans_id } });
        if (!existing) {
          // Reversal before the credit: record it so a late completion is ignored.
          await tx.cpxTransaction.create({ data: { ...row, status: "REVERSED" } });
          return "reversed";
        }
        const flipped = await tx.cpxTransaction.updateMany({
          where: { transId: q.trans_id, status: "COMPLETED" },
          data: { status: "REVERSED" },
        });
        if (flipped.count === 0) return "duplicate";
        if (existing.coins.gt(0)) {
          // ponytail: balance may go negative if the coins were already spent — that is the debt the reversal represents.
          await this.moveCoins(tx, existing.userId, existing.coins, "DEBIT", q.trans_id, "Survey reversed (CPX Research)");
        }
        return "reversed";
      });
    } catch (error) {
      // Retried postback racing the first one: the unique transId already settled it.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return "duplicate";
      }
      throw error;
    }
  }

  private async moveCoins(
    tx: Tx,
    userId: string,
    amount: Prisma.Decimal,
    type: "CREDIT" | "DEBIT",
    transId: string,
    description: string,
  ): Promise<void> {
    const wallet = await tx.wallet.upsert({ where: { userId }, create: { userId }, update: {} });
    const after = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: type === "CREDIT" ? { increment: amount } : { decrement: amount } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount,
        balanceAfter: after.balance,
        reference: `cpx:${transId}`,
        description,
      },
    });
  }

  async list(query: CpxListQuery): Promise<{
    items: {
      id: string;
      transId: string;
      status: CpxStatus;
      coins: number;
      amountUsd: number | null;
      offerId: string | null;
      type: string | null;
      createdAt: Date;
      updatedAt: Date;
      user: { id: string; name: string | null; email: string };
    }[];
    meta: PageMeta;
  }> {
    const where: Prisma.CpxTransactionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { transId: { contains: query.search, mode: "insensitive" } },
              { user: { email: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.cpxTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.cpxTransaction.count({ where }),
    ]);
    return {
      items: rows.map(({ userId: _userId, ...r }) => ({
        ...r,
        coins: r.coins.toNumber(),
        amountUsd: r.amountUsd?.toNumber() ?? null,
      })),
      meta: buildMeta(query, total),
    };
  }
}

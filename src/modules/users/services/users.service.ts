import { Prisma, type PrismaClient } from "@prisma/client";
import { ConflictError, NotFoundError } from "../../../common/errors.js";
import type { UsersRepository } from "../repositories/users.repository.js";
import type { SettingsService } from "../../settings/services/settings.service.js";
import type { NotificationsService } from "../../notifications/services/notifications.service.js";
import {
  toPublicUser,
  type ProgressDto,
  type PublicUser,
  type UpdateProfileInput,
} from "../schemas/users.schema.js";

const DEFAULT_RANKS = [
  "Bronze Scout",
  "Silver Hunter",
  "Gold Raider",
  "Platinum Elite",
  "Diamond Legend",
  "Mythic Champion",
];

/**
 * Level/rank math driven by LIFETIME COINS (sum of wallet CREDITs).
 * Quadratic (default base 100): level = floor(sqrt(coins/base)) + 1, i.e. a
 * new user is level 1 and reaching level n+1 needs base*n*n total coins —
 * identical to the client's PlayerProgress.fromBalance. Table mode:
 * thresholds[i] is the total coins to reach level i+2 (index 0 => level 2).
 */
export function computeProgress(coins: number, curveJson: string, ranksJson: string): ProgressDto {
  const safeCoins = Math.max(0, Math.floor(coins));

  let curve: { type?: string; base?: unknown; thresholds?: unknown } = {};
  try {
    curve = JSON.parse(curveJson);
  } catch {
    /* fall through to quadratic default — a bad setting must never 500 */
  }

  let level: number;
  let currentFloor: number;
  let nextFloor: number | null;
  if (curve.type === "table" && Array.isArray(curve.thresholds) && curve.thresholds.length > 0) {
    const thresholds = curve.thresholds.map(Number).filter(Number.isFinite);
    level = 1;
    while (level - 1 < thresholds.length && safeCoins >= thresholds[level - 1]) level++;
    currentFloor = level > 1 ? thresholds[level - 2] : 0;
    nextFloor = level - 1 < thresholds.length ? thresholds[level - 1] : null; // null = maxed
  } else {
    const base =
      typeof curve.base === "number" && Number.isFinite(curve.base) && curve.base > 0
        ? curve.base
        : 100;
    level = Math.max(1, Math.floor(Math.sqrt(safeCoins / base)) + 1);
    currentFloor = (level - 1) * (level - 1) * base;
    nextFloor = level * level * base;
  }

  let ranks = DEFAULT_RANKS;
  try {
    const parsed = JSON.parse(ranksJson);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((r) => typeof r === "string")) {
      ranks = parsed;
    }
  } catch {
    /* keep defaults */
  }
  const rankIndex = Math.min(Math.floor((level - 1) / 5), ranks.length - 1);

  return {
    coins: safeCoins,
    level,
    coinsInLevel: safeCoins - currentFloor,
    coinsForLevel: nextFloor === null ? 0 : nextFloor - currentFloor,
    rank: ranks[rankIndex],
    nextRank: rankIndex + 1 < ranks.length ? ranks[rankIndex + 1] : null,
  };
}

export class UsersService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly users: UsersRepository,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    return toPublicUser(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    const updated = await this.users.update(userId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    });
    return toPublicUser(updated);
  }

  async getProgress(userId: string): Promise<ProgressDto> {
    const [credited, curveJson, ranksJson] = await Promise.all([
      // Lifetime coins = every CREDIT ever received; debits/redemptions never
      // lower a player's level.
      this.prisma.walletTransaction.aggregate({
        where: { type: "CREDIT", wallet: { userId } },
        _sum: { amount: true },
      }),
      this.settings.getString("levels.curve"),
      this.settings.getString("levels.ranks"),
    ]);
    return computeProgress(Number(credited._sum.amount ?? 0), curveJson, ranksJson);
  }

  async applyReferral(
    userId: string,
    code: string,
  ): Promise<{ applied: true; rewardPoints: number }> {
    const caller = await this.users.findById(userId);
    if (!caller) throw new NotFoundError("User not found");
    if (caller.referredById) throw new ConflictError("A referral code has already been applied");

    const referrer = await this.users.findByReferralCode(code);
    if (!referrer) throw new NotFoundError("Referral code not found");
    if (referrer.id === caller.id) {
      throw new ConflictError("You cannot apply your own referral code");
    }

    const rewardPoints = await this.settings.getNumber("referral.rewardPoints");

    // Mark the caller referred + credit the referrer atomically.
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: caller.id },
        data: { referredById: referrer.id, referredAt: new Date() },
      });

      const wallet = await tx.wallet.upsert({
        where: { userId: referrer.id },
        create: { userId: referrer.id },
        update: {},
      });

      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: rewardPoints } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "CREDIT",
          amount: new Prisma.Decimal(rewardPoints),
          balanceAfter: updated.balance,
          reference: `referral:${caller.id}`,
          description: "Referral bonus",
        },
      });
    });

    await this.notifications.enqueue({
      userId: referrer.id,
      type: "WALLET",
      title: "Referral bonus",
      body: `You earned ${rewardPoints} for inviting ${caller.name}`,
    });

    return { applied: true, rewardPoints };
  }
}

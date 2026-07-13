import { Prisma } from "@prisma/client";
import type { PrismaClient, Redemption, RedemptionStatus } from "@prisma/client";
import { BadRequestError } from "../../../common/errors.js";
import type { RedemptionWithUser } from "../schemas/redemptions.schema.js";

const USER_SELECT = { user: { select: { id: true, name: true, email: true } } } as const;

export class RedemptionsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<RedemptionWithUser | null> {
    return this.prisma.redemption.findUnique({ where: { id }, include: USER_SELECT });
  }

  async hasPending(userId: string): Promise<boolean> {
    return (await this.prisma.redemption.count({ where: { userId, status: "PENDING" } })) > 0;
  }

  /**
   * Atomically: re-check balance, debit the wallet and create the PENDING
   * redemption. The balance check lives inside the transaction so concurrent
   * requests can't double-spend.
   */
  createRequest(userId: string, coins: number): Promise<Redemption> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      if (wallet.balance.lessThan(coins)) {
        throw new BadRequestError("Insufficient wallet balance");
      }

      const redemption = await tx.redemption.create({
        data: { userId, coins: new Prisma.Decimal(coins) },
      });

      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: coins } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEBIT",
          amount: new Prisma.Decimal(coins),
          balanceAfter: updated.balance,
          reference: `redemption:${redemption.id}`,
          description: "Redemption request",
        },
      });

      return redemption;
    });
  }

  /** Atomically: mark REJECTED and refund the debited coins to the wallet. */
  rejectWithRefund(id: string, reviewerId: string, note: string | null): Promise<RedemptionWithUser> {
    return this.prisma.$transaction(async (tx) => {
      const redemption = await tx.redemption.update({
        where: { id },
        data: { status: "REJECTED", note, reviewedById: reviewerId, reviewedAt: new Date() },
        include: USER_SELECT,
      });

      const wallet = await tx.wallet.upsert({
        where: { userId: redemption.userId },
        create: { userId: redemption.userId },
        update: {},
      });
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: redemption.coins } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "CREDIT",
          amount: new Prisma.Decimal(redemption.coins),
          balanceAfter: updated.balance,
          reference: `redemption-refund:${redemption.id}`,
          description: "Redemption refund",
        },
      });

      return redemption;
    });
  }

  /** Review/fulfil state changes that don't touch the wallet. */
  update(
    id: string,
    data: Prisma.RedemptionUncheckedUpdateInput,
  ): Promise<RedemptionWithUser> {
    return this.prisma.redemption.update({ where: { id }, data, include: USER_SELECT });
  }

  listByUser(
    userId: string,
    params: { skip: number; take: number },
  ): Promise<[Redemption[], number]> {
    return Promise.all([
      this.prisma.redemption.findMany({
        where: { userId },
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.redemption.count({ where: { userId } }),
    ]);
  }

  listAdmin(params: {
    skip: number;
    take: number;
    status?: RedemptionStatus;
    userId?: string;
    search?: string;
    from?: Date;
    to?: Date;
  }): Promise<[RedemptionWithUser[], number]> {
    const where: Prisma.RedemptionWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.search
        ? { user: { email: { contains: params.search, mode: "insensitive" } } }
        : {}),
      ...(params.from || params.to
        ? { createdAt: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
        : {}),
    };
    return Promise.all([
      this.prisma.redemption.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        include: USER_SELECT,
      }),
      this.prisma.redemption.count({ where }),
    ]);
  }
}

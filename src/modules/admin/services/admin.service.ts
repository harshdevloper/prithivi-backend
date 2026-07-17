import type { PrismaClient, Role } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../../../common/errors.js";
import { buildMeta, type PaginationQuery } from "../../../common/pagination.js";
import type { PageMeta } from "../../../common/response.js";
import type { UsersRepository } from "../../users/repositories/users.repository.js";
import type { CampaignRepository } from "../../campaign/repositories/campaign.repository.js";
import type { ClaimsRepository } from "../../claims/repositories/claims.repository.js";
import type { WalletRepository } from "../../wallet/repositories/wallet.repository.js";
import type { RefreshTokenRepository } from "../../auth/repositories/refresh-token.repository.js";
import { toPublicUser, type PublicUser } from "../../users/schemas/users.schema.js";
import type {
  AdminReferralRow,
  AdminStats,
  ListReferralsQuery,
  ListUsersQuery,
} from "../schemas/admin.schema.js";

export class AdminService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly users: UsersRepository,
    private readonly campaigns: CampaignRepository,
    private readonly claims: ClaimsRepository,
    private readonly wallets: WalletRepository,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async stats(): Promise<AdminStats> {
    const [
      totalUsers,
      activeCampaigns,
      pendingClaims,
      approvedClaims,
      totalBalance,
      pendingSubmissions,
      pendingRedemptions,
      pendingRedemptionCoins,
      fulfilledRedemptions,
      pendingMissionCompletions,
      totalReferrals,
    ] = await Promise.all([
      this.users.count(),
      this.campaigns.countByStatus("ACTIVE"),
      this.claims.countByStatus("PENDING"),
      this.claims.countByStatus("APPROVED"),
      this.wallets.totalBalance(),
      this.prisma.offerSubmission.count({ where: { status: "PENDING" } }),
      this.prisma.redemption.count({ where: { status: "PENDING" } }),
      this.prisma.redemption.aggregate({ where: { status: "PENDING" }, _sum: { coins: true } }),
      this.prisma.redemption.count({ where: { status: "FULFILLED" } }),
      this.prisma.missionCompletion.count({ where: { status: "PENDING" } }),
      this.prisma.user.count({ where: { referredById: { not: null } } }),
    ]);

    return {
      totalUsers,
      activeCampaigns,
      pendingClaims,
      approvedClaims,
      totalWalletBalance: totalBalance?.toNumber() ?? 0,
      pendingSubmissions,
      pendingRedemptions,
      coinsInPendingRedemptions: Number(pendingRedemptionCoins._sum.coins ?? 0),
      fulfilledRedemptions,
      pendingMissionCompletions,
      totalReferrals,
    };
  }

  async listUsers(query: ListUsersQuery): Promise<{ items: PublicUser[]; meta: PageMeta }> {
    const pagination: PaginationQuery = { page: query.page, limit: query.limit };
    const [users, total] = await this.users.list({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      search: query.search,
      role: query.role as Role | undefined,
    });
    return { items: users.map(toPublicUser), meta: buildMeta(pagination, total) };
  }

  async listReferrals(
    query: ListReferralsQuery,
  ): Promise<{ items: AdminReferralRow[]; meta: PageMeta }> {
    const pagination: PaginationQuery = { page: query.page, limit: query.limit };
    const [referred, total] = await this.users.listReferrals({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      search: query.search,
      from: query.from,
      to: query.to,
    });

    // Credited points live in the referrer's ledger under "referral:<referredUserId>".
    const txs = await this.wallets.findByReferences(referred.map((u) => `referral:${u.id}`));
    const pointsByRef = new Map(txs.map((t) => [t.reference, t.amount.toNumber()]));

    const items: AdminReferralRow[] = referred.map((u) => ({
      referred: {
        id: u.id,
        name: u.name,
        email: u.email,
        referredAt: u.referredAt?.toISOString() ?? null,
      },
      referrer: u.referredBy
        ? {
            id: u.referredBy.id,
            name: u.referredBy.name,
            email: u.referredBy.email,
            referralCode: u.referredBy.referralCode,
          }
        : null,
      creditedPoints: pointsByRef.get(`referral:${u.id}`) ?? null,
    }));

    return { items, meta: buildMeta(pagination, total) };
  }

  async updateUserRole(actorRole: string, targetUserId: string, role: Role): Promise<PublicUser> {
    const target = await this.users.findById(targetUserId);
    if (!target) throw new NotFoundError("User not found");

    // Only a SUPER_ADMIN may grant or modify SUPER_ADMIN accounts.
    if ((role === "SUPER_ADMIN" || target.role === "SUPER_ADMIN") && actorRole !== "SUPER_ADMIN") {
      throw new ForbiddenError("Only a super admin can manage super admin roles");
    }

    const updated = await this.users.update(targetUserId, { role });
    return toPublicUser(updated);
  }

  async updateUserStatus(
    actorId: string,
    actorRole: string,
    targetUserId: string,
    isActive: boolean,
  ): Promise<PublicUser> {
    if (actorId === targetUserId) {
      throw new ForbiddenError("You cannot change your own account status");
    }

    const target = await this.users.findById(targetUserId);
    if (!target) throw new NotFoundError("User not found");
    if (target.role === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
      throw new ForbiddenError("Only a super admin can manage super admin accounts");
    }

    const updated = await this.users.update(targetUserId, { isActive });

    // Deactivation revokes every active session immediately.
    if (!isActive) {
      await this.refreshTokens.revokeAllForUser(targetUserId);
    }
    return toPublicUser(updated);
  }
}

import type { Role } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../../../common/errors.js";
import { buildMeta, type PaginationQuery } from "../../../common/pagination.js";
import type { PageMeta } from "../../../common/response.js";
import type { UsersRepository } from "../../users/repositories/users.repository.js";
import type { CampaignRepository } from "../../campaign/repositories/campaign.repository.js";
import type { ClaimsRepository } from "../../claims/repositories/claims.repository.js";
import type { WalletRepository } from "../../wallet/repositories/wallet.repository.js";
import type { RefreshTokenRepository } from "../../auth/repositories/refresh-token.repository.js";
import { toPublicUser, type PublicUser } from "../../users/schemas/users.schema.js";
import type { AdminStats, ListUsersQuery } from "../schemas/admin.schema.js";

export class AdminService {
  constructor(
    private readonly users: UsersRepository,
    private readonly campaigns: CampaignRepository,
    private readonly claims: ClaimsRepository,
    private readonly wallets: WalletRepository,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async stats(): Promise<AdminStats> {
    const [totalUsers, activeCampaigns, pendingClaims, approvedClaims, totalBalance] =
      await Promise.all([
        this.users.count(),
        this.campaigns.countByStatus("ACTIVE"),
        this.claims.countByStatus("PENDING"),
        this.claims.countByStatus("APPROVED"),
        this.wallets.totalBalance(),
      ]);

    return {
      totalUsers,
      activeCampaigns,
      pendingClaims,
      approvedClaims,
      totalWalletBalance: totalBalance?.toNumber() ?? 0,
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const errors_js_1 = require("../../../common/errors.js");
const pagination_js_1 = require("../../../common/pagination.js");
const users_schema_js_1 = require("../../users/schemas/users.schema.js");
class AdminService {
    users;
    campaigns;
    claims;
    wallets;
    refreshTokens;
    constructor(users, campaigns, claims, wallets, refreshTokens) {
        this.users = users;
        this.campaigns = campaigns;
        this.claims = claims;
        this.wallets = wallets;
        this.refreshTokens = refreshTokens;
    }
    async stats() {
        const [totalUsers, activeCampaigns, pendingClaims, approvedClaims, totalBalance] = await Promise.all([
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
    async listUsers(query) {
        const pagination = { page: query.page, limit: query.limit };
        const [users, total] = await this.users.list({
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            search: query.search,
            role: query.role,
        });
        return { items: users.map(users_schema_js_1.toPublicUser), meta: (0, pagination_js_1.buildMeta)(pagination, total) };
    }
    async updateUserRole(actorRole, targetUserId, role) {
        const target = await this.users.findById(targetUserId);
        if (!target)
            throw new errors_js_1.NotFoundError("User not found");
        // Only a SUPER_ADMIN may grant or modify SUPER_ADMIN accounts.
        if ((role === "SUPER_ADMIN" || target.role === "SUPER_ADMIN") && actorRole !== "SUPER_ADMIN") {
            throw new errors_js_1.ForbiddenError("Only a super admin can manage super admin roles");
        }
        const updated = await this.users.update(targetUserId, { role });
        return (0, users_schema_js_1.toPublicUser)(updated);
    }
    async updateUserStatus(actorId, actorRole, targetUserId, isActive) {
        if (actorId === targetUserId) {
            throw new errors_js_1.ForbiddenError("You cannot change your own account status");
        }
        const target = await this.users.findById(targetUserId);
        if (!target)
            throw new errors_js_1.NotFoundError("User not found");
        if (target.role === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
            throw new errors_js_1.ForbiddenError("Only a super admin can manage super admin accounts");
        }
        const updated = await this.users.update(targetUserId, { isActive });
        // Deactivation revokes every active session immediately.
        if (!isActive) {
            await this.refreshTokens.revokeAllForUser(targetUserId);
        }
        return (0, users_schema_js_1.toPublicUser)(updated);
    }
}
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatusSchema = exports.updateUserRoleSchema = exports.userIdParamsSchema = exports.listUsersQuerySchema = exports.adminStatsSchema = void 0;
const zod_1 = require("zod");
exports.adminStatsSchema = zod_1.z.object({
    totalUsers: zod_1.z.number(),
    activeCampaigns: zod_1.z.number(),
    pendingClaims: zod_1.z.number(),
    approvedClaims: zod_1.z.number(),
    totalWalletBalance: zod_1.z.number(),
});
exports.listUsersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().max(200).optional(),
    role: zod_1.z.enum(["USER", "ADMIN", "SUPER_ADMIN"]).optional(),
});
exports.userIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.updateUserRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(["USER", "ADMIN", "SUPER_ADMIN"]),
});
exports.updateUserStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
});
//# sourceMappingURL=admin.schema.js.map
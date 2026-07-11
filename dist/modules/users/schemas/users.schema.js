"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.toPublicUser = exports.publicUserSchema = void 0;
const zod_1 = require("zod");
exports.publicUserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    avatarUrl: zod_1.z.string().nullable(),
    role: zod_1.z.enum(["USER", "ADMIN", "SUPER_ADMIN"]),
    isActive: zod_1.z.boolean(),
    createdAt: zod_1.z.string().datetime(),
});
const toPublicUser = (user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
});
exports.toPublicUser = toPublicUser;
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120).optional(),
    avatarUrl: zod_1.z.string().url().nullable().optional(),
});
//# sourceMappingURL=users.schema.js.map
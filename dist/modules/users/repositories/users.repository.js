"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersRepository = void 0;
class UsersRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findById(id) {
        return this.prisma.user.findUnique({ where: { id } });
    }
    findByEmail(email) {
        return this.prisma.user.findUnique({ where: { email } });
    }
    async upsertFirebaseUser(profile) {
        // Match an existing account by Firebase UID or by verified email, then link
        // the UID — so users who previously signed in via Google keep one account.
        const existing = await this.prisma.user.findFirst({
            where: { OR: [{ firebaseUid: profile.firebaseUid }, { email: profile.email }] },
        });
        if (!existing) {
            return this.prisma.user.create({
                data: {
                    firebaseUid: profile.firebaseUid,
                    email: profile.email,
                    name: profile.name,
                    avatarUrl: profile.avatarUrl,
                },
            });
        }
        return this.prisma.user.update({
            where: { id: existing.id },
            data: {
                firebaseUid: profile.firebaseUid,
                avatarUrl: profile.avatarUrl ?? existing.avatarUrl,
            },
        });
    }
    update(id, data) {
        return this.prisma.user.update({ where: { id }, data });
    }
    list(params) {
        const where = {
            ...(params.role ? { role: params.role } : {}),
            ...(params.search
                ? {
                    OR: [
                        { email: { contains: params.search, mode: "insensitive" } },
                        { name: { contains: params.search, mode: "insensitive" } },
                    ],
                }
                : {}),
        };
        return Promise.all([
            this.prisma.user.findMany({
                where,
                skip: params.skip,
                take: params.take,
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.user.count({ where }),
        ]);
    }
    count() {
        return this.prisma.user.count();
    }
}
exports.UsersRepository = UsersRepository;
//# sourceMappingURL=users.repository.js.map
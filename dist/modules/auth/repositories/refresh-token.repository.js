"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenRepository = void 0;
class RefreshTokenRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(userId, tokenHash, expiresAt) {
        return this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
    }
    findByHash(tokenHash) {
        return this.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });
    }
    revoke(id) {
        return this.prisma.refreshToken.update({
            where: { id },
            data: { revokedAt: new Date() },
        });
    }
    async revokeAllForUser(userId) {
        await this.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async deleteExpired() {
        const result = await this.prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
        return result.count;
    }
}
exports.RefreshTokenRepository = RefreshTokenRepository;
//# sourceMappingURL=refresh-token.repository.js.map
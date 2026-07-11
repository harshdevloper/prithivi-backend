"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletRepository = void 0;
const client_1 = require("@prisma/client");
class WalletRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findByUserId(userId) {
        return this.prisma.wallet.findUnique({ where: { userId } });
    }
    ensureForUser(userId) {
        return this.prisma.wallet.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
    }
    /** Atomically credits a wallet and records the transaction. */
    credit(params) {
        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.upsert({
                where: { userId: params.userId },
                create: { userId: params.userId },
                update: {},
            });
            const updated = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: params.amount } },
            });
            return tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "CREDIT",
                    amount: new client_1.Prisma.Decimal(params.amount),
                    balanceAfter: updated.balance,
                    reference: params.reference,
                    description: params.description,
                },
            });
        });
    }
    listTransactions(walletId, params) {
        return Promise.all([
            this.prisma.walletTransaction.findMany({
                where: { walletId },
                skip: params.skip,
                take: params.take,
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.walletTransaction.count({ where: { walletId } }),
        ]);
    }
    totalBalance() {
        return this.prisma.wallet
            .aggregate({ _sum: { balance: true } })
            .then((result) => result._sum.balance);
    }
    // ---- derived wallet stats (Module 5) — computed from the ledger so they
    //      can never drift from the source of truth ----
    /** Lifetime earnings = sum of all credits; rewardCount = number of credits. */
    async creditStats(walletId) {
        const result = await this.prisma.walletTransaction.aggregate({
            where: { walletId, type: "CREDIT" },
            _sum: { amount: true },
            _count: { _all: true },
        });
        return { total: result._sum.amount ?? new client_1.Prisma.Decimal(0), count: result._count._all };
    }
    /** Total withdrawn = sum of all debits (withdrawals debit the wallet). */
    async debitTotal(walletId) {
        const result = await this.prisma.walletTransaction.aggregate({
            where: { walletId, type: "DEBIT" },
            _sum: { amount: true },
        });
        return result._sum.amount ?? new client_1.Prisma.Decimal(0);
    }
    /** Pending rewards = reward value of the user's not-yet-approved submissions. */
    async pendingRewardsForUser(userId) {
        const result = await this.prisma.offerSubmission.aggregate({
            where: { userId, status: "PENDING" },
            _sum: { rewardAmount: true },
        });
        return result._sum.rewardAmount ?? new client_1.Prisma.Decimal(0);
    }
}
exports.WalletRepository = WalletRepository;
//# sourceMappingURL=wallet.repository.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const pagination_js_1 = require("../../../common/pagination.js");
const wallet_schema_js_1 = require("../schemas/wallet.schema.js");
class WalletService {
    wallets;
    constructor(wallets) {
        this.wallets = wallets;
    }
    async getMyWallet(userId) {
        const wallet = await this.wallets.ensureForUser(userId);
        return (0, wallet_schema_js_1.toWalletDto)(wallet);
    }
    /**
     * Rich wallet view. Every field is derived so it can never drift from the
     * ledger: lifetime/rewardCount from credits, totalWithdrawn from debits,
     * pending from PENDING submissions. lockedBalance stays 0 until the
     * Withdrawal module (6) reserves funds for in-flight requests.
     */
    async getMySummary(userId) {
        const wallet = await this.wallets.ensureForUser(userId);
        const [credits, withdrawn, pending] = await Promise.all([
            this.wallets.creditStats(wallet.id),
            this.wallets.debitTotal(wallet.id),
            this.wallets.pendingRewardsForUser(userId),
        ]);
        const balance = wallet.balance.toNumber();
        const lockedBalance = 0; // Module 6: sum of active withdrawal requests
        return {
            balance,
            pendingRewards: pending.toNumber(),
            lifetimeEarnings: credits.total.toNumber(),
            totalWithdrawn: withdrawn.toNumber(),
            lockedBalance,
            withdrawableBalance: Math.max(0, balance - lockedBalance),
            rewardCount: credits.count,
            updatedAt: wallet.updatedAt.toISOString(),
        };
    }
    async getMyTransactions(userId, query) {
        const wallet = await this.wallets.ensureForUser(userId);
        const [transactions, total] = await this.wallets.listTransactions(wallet.id, (0, pagination_js_1.toSkipTake)(query));
        return {
            items: transactions.map(wallet_schema_js_1.toWalletTransactionDto),
            meta: (0, pagination_js_1.buildMeta)(query, total),
        };
    }
}
exports.WalletService = WalletService;
//# sourceMappingURL=wallet.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toWalletTransactionDto = exports.toWalletDto = exports.walletTransactionSchema = exports.walletSummarySchema = exports.walletSchema = void 0;
const zod_1 = require("zod");
exports.walletSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    balance: zod_1.z.number(),
    updatedAt: zod_1.z.string().datetime(),
});
/** Rich wallet summary — every field derived from the ledger + submissions. */
exports.walletSummarySchema = zod_1.z.object({
    balance: zod_1.z.number(),
    pendingRewards: zod_1.z.number(),
    lifetimeEarnings: zod_1.z.number(),
    totalWithdrawn: zod_1.z.number(),
    lockedBalance: zod_1.z.number(),
    withdrawableBalance: zod_1.z.number(),
    rewardCount: zod_1.z.number().int(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.walletTransactionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(["CREDIT", "DEBIT"]),
    amount: zod_1.z.number(),
    balanceAfter: zod_1.z.number(),
    reference: zod_1.z.string().nullable(),
    description: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
const toWalletDto = (wallet) => ({
    id: wallet.id,
    balance: wallet.balance.toNumber(),
    updatedAt: wallet.updatedAt.toISOString(),
});
exports.toWalletDto = toWalletDto;
const toWalletTransactionDto = (tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount.toNumber(),
    balanceAfter: tx.balanceAfter.toNumber(),
    reference: tx.reference,
    description: tx.description,
    createdAt: tx.createdAt.toISOString(),
});
exports.toWalletTransactionDto = toWalletTransactionDto;
//# sourceMappingURL=wallet.schema.js.map
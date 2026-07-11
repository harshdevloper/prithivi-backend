import { z } from "zod";
import type { Wallet, WalletTransaction } from "@prisma/client";

export const walletSchema = z.object({
  id: z.string().uuid(),
  balance: z.number(),
  updatedAt: z.string().datetime(),
});
export type WalletDto = z.infer<typeof walletSchema>;

/** Rich wallet summary — every field derived from the ledger + submissions. */
export const walletSummarySchema = z.object({
  balance: z.number(),
  pendingRewards: z.number(),
  lifetimeEarnings: z.number(),
  totalWithdrawn: z.number(),
  lockedBalance: z.number(),
  withdrawableBalance: z.number(),
  rewardCount: z.number().int(),
  updatedAt: z.string().datetime(),
});
export type WalletSummaryDto = z.infer<typeof walletSummarySchema>;

export const walletTransactionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["CREDIT", "DEBIT"]),
  amount: z.number(),
  balanceAfter: z.number(),
  reference: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type WalletTransactionDto = z.infer<typeof walletTransactionSchema>;

export const toWalletDto = (wallet: Wallet): WalletDto => ({
  id: wallet.id,
  balance: wallet.balance.toNumber(),
  updatedAt: wallet.updatedAt.toISOString(),
});

export const toWalletTransactionDto = (tx: WalletTransaction): WalletTransactionDto => ({
  id: tx.id,
  type: tx.type,
  amount: tx.amount.toNumber(),
  balanceAfter: tx.balanceAfter.toNumber(),
  reference: tx.reference,
  description: tx.description,
  createdAt: tx.createdAt.toISOString(),
});

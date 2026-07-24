import { z } from "zod";

export const createCoinPurchaseOrderSchema = z.object({
  packCount: z.number().int().min(1).max(100),
});
export type CreateCoinPurchaseOrderInput = z.infer<typeof createCoinPurchaseOrderSchema>;

export const verifyCoinPurchaseSchema = z.object({
  orderId: z
    .string()
    .regex(/^order_[A-Za-z0-9]+$/)
    .max(100),
  paymentId: z
    .string()
    .regex(/^pay_[A-Za-z0-9]+$/)
    .max(100),
  signature: z.string().regex(/^[a-f0-9]{64}$/i),
});
export type VerifyCoinPurchaseInput = z.infer<typeof verifyCoinPurchaseSchema>;

export interface CoinPurchaseConfigDto {
  enabled: boolean;
  configured: boolean;
  priceRupees: number;
  coinsPerPack: number;
  maxPacks: number;
}

export interface CoinPurchaseOrderDto {
  purchaseId: string;
  orderId: string;
  keyId: string;
  amountPaise: number;
  currency: "INR";
  coins: number;
  packCount: number;
  name: string;
  description: string;
}

export interface CoinPurchaseResultDto {
  purchaseId: string;
  status: "CAPTURED";
  coinsCredited: number;
  balance: number;
}

export interface CoinPurchaseRecoveryDto {
  recoveredPurchases: number;
  coinsCredited: number;
}

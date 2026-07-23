import { z } from "zod";
import type {
  Colour,
  Parity,
  PayoutMultipliers,
  ProbabilityMode,
  RouletteBetType,
} from "../engine/roulette.js";

// ---- User inputs ----

export const playSchema = z
  .object({
    betType: z.enum(["ODD", "EVEN", "RED", "BLACK", "NUMBER"]),
    // Accept the prompt's `selectedValue` name; stored internally as selectedNumber.
    selectedValue: z.number().int().min(0).max(36).nullable().optional(),
    betAmount: z.number().int().min(1).max(100_000_000),
    useFreeGame: z.boolean().default(false),
    clientSeed: z.string().min(1).max(128).optional(),
    idempotencyKey: z.string().min(8).max(128),
  })
  .refine(
    (d) => d.betType !== "NUMBER" || (d.selectedValue !== null && d.selectedValue !== undefined),
    { message: "selectedValue (0..36) is required for a number bet", path: ["selectedValue"] },
  );
export type PlayInput = z.infer<typeof playSchema>;

export const roundIdParamsSchema = z.object({ id: z.string().uuid() });
export type RoundIdParams = z.infer<typeof roundIdParamsSchema>;

// ---- Admin inputs ----

export const createProfileSchema = z.object({
  name: z.string().min(1).max(120),
  mode: z.enum(["FAIR", "WEIGHTED"]).default("WEIGHTED"),
  // int[37]; required for WEIGHTED, ignored for FAIR (validated in the service).
  numberWeights: z.array(z.number().int().min(0).max(1_000_000)).length(37).optional(),
  reason: z.string().max(500).optional(),
});
export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export const activateProfileSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type ActivateProfileInput = z.infer<typeof activateProfileSchema>;

export const profileIdParamsSchema = z.object({ id: z.string().uuid() });
export type ProfileIdParams = z.infer<typeof profileIdParamsSchema>;

export const estimateRtpSchema = z.object({
  mode: z.enum(["FAIR", "WEIGHTED"]),
  numberWeights: z.array(z.number().int().min(0).max(1_000_000)).length(37).optional(),
});
export type EstimateRtpInput = z.infer<typeof estimateRtpSchema>;

export const roundsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  betType: z.enum(["ODD", "EVEN", "RED", "BLACK", "NUMBER"]).optional(),
  winningNumber: z.coerce.number().int().min(0).max(36).optional(),
  won: z.coerce.boolean().optional(),
  usedFreeGame: z.coerce.boolean().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  minAmount: z.coerce.number().int().min(0).optional(),
  maxAmount: z.coerce.number().int().min(0).optional(),
});
export type RoundsQuery = z.infer<typeof roundsQuerySchema>;

export const analyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

// ---- Output DTOs (plain interfaces; serialized by name) ----

export interface RouletteStatusDto {
  walletBalance: number;
  freeGamesEnabled: boolean;
  freeGamesPerDay: number;
  freeGamesRemaining: number;
  freeGameStake: number;
  totalPlayedToday: number;
  paidPlayedToday: number;
  maxGamesPerDay: number;
  maxPaidGamesPerDay: number;
  dailyPayoutRemaining: number;
  cooldownRemainingMs: number;
  canPlay: boolean;
}

export interface RouletteConfigDto {
  enabled: boolean;
  maintenanceMode: boolean;
  title: string;
  subtitle: string;
  instructions: string;
  minBet: number;
  maxBet: number;
  defaultBet: number;
  betStep: number;
  animationDurationMs: number;
  resultModalMs: number;
  cooldownSeconds: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  probabilityMode: ProbabilityMode;
  estimatedRtp: number;
  payouts: PayoutMultipliers;
  betTypesEnabled: Record<Lowercase<RouletteBetType>, boolean>;
  wheelSequence: number[];
  redNumbers: number[];
  maxPayoutPerGame: number;
  status: RouletteStatusDto;
}

export interface FairnessDto {
  serverSeed: string; // revealed after settlement
  serverSeedHash: string; // committed on the round
  clientSeed: string;
  nonce: number;
}

export interface PlayResultDto {
  roundId: string;
  betType: RouletteBetType;
  selectedNumber: number | null;
  betAmount: number;
  usedFreeGame: boolean;
  winningNumber: number;
  winningColour: Colour;
  parity: Parity;
  won: boolean;
  payoutMultiplier: number;
  payoutAmount: number;
  netResult: number;
  walletBalance: number;
  freeGamesRemaining: number;
  /** Index of winningNumber in the wheel sequence — drives the landing angle. */
  wheelIndex: number;
  animationDurationMs: number;
  fairness: FairnessDto;
  status: RouletteStatusDto;
}

export interface RouletteRoundDto {
  id: string;
  userId: string;
  betType: RouletteBetType;
  selectedNumber: number | null;
  betAmount: number;
  usedFreeGame: boolean;
  winningNumber: number;
  winningColour: string;
  parity: string;
  won: boolean;
  payoutMultiplier: number;
  payoutAmount: number;
  netResult: number;
  status: string;
  probabilityMode: string;
  serverSeedHash: string;
  serverSeed?: string; // detail/verify only
  clientSeed: string;
  nonce: number;
  probabilityProfileId: string | null;
  createdAt: string;
  settledAt: string | null;
}

export interface VerifyRoundDto {
  roundId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  probabilityMode: string;
  weights: number[] | null;
  recordedWinningNumber: number;
  computedWinningNumber: number;
  hashMatches: boolean;
  outcomeMatches: boolean;
}

export interface ProbabilityProfileDto {
  id: string;
  name: string;
  mode: string;
  numberWeights: number[];
  estimatedRtp: number;
  active: boolean;
  effectiveFrom: string;
  createdById: string | null;
  createdAt: string;
}

export interface RtpEstimateDto {
  overall: number;
  byCategory: {
    number: number;
    odd: number;
    even: number;
    red: number;
    black: number;
    maxNumberRtp: number;
  };
  warnings: string[];
}

export interface RouletteAnalyticsDto {
  totals: {
    games: number;
    players: number;
    activePlayers: number;
    coinsWagered: number;
    coinsWon: number;
    coinsLost: number;
    netCoinMovement: number;
    averageBet: number;
    winRate: number;
    rtp: number;
    freeGames: number;
    paidGames: number;
  };
  numberDistribution: { number: number; count: number }[];
  parityDistribution: { odd: number; even: number; zero: number };
  colourDistribution: { red: number; black: number; green: number };
  daily: { date: string; games: number; wagered: number; won: number }[];
  topWins: {
    roundId: string;
    userId: string;
    payoutAmount: number;
    winningNumber: number;
    createdAt: string;
  }[];
  mostActive: { userId: string; games: number }[];
  recentRounds: RouletteRoundDto[];
}

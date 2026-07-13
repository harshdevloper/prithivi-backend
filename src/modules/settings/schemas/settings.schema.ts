import { z } from "zod";

export type SettingType = "NUMBER" | "BOOLEAN" | "STRING";

export interface SettingDefinition {
  key: string;
  type: SettingType;
  category: string;
  label: string;
  description: string;
  default: string; // serialized default; interpreted per `type`
  min?: number; // NUMBER only — admin-side hint + server clamp
  max?: number;
  enum?: readonly string[]; // STRING only — allowed values
}

/**
 * The single source of truth for every configurable setting. The DB only
 * stores overrides; metadata + defaults live here so they version with code.
 * Modules read values through SettingsService typed getters.
 */
export const SETTINGS_REGISTRY: readonly SettingDefinition[] = [
  // --- Withdrawals (Module 6) ---
  {
    key: "withdrawal.enabled",
    type: "BOOLEAN",
    category: "Withdrawals",
    label: "Withdrawals enabled",
    description: "Master switch for the user withdrawal feature.",
    default: "true",
  },
  {
    key: "withdrawal.minAmount",
    type: "NUMBER",
    category: "Withdrawals",
    label: "Minimum withdrawal amount",
    description: "Smallest amount a user may request to withdraw.",
    default: "100",
    min: 1,
    max: 1_000_000,
  },
  // --- Redemptions (coins -> gift voucher) ---
  {
    key: "redeem.enabled",
    type: "BOOLEAN",
    category: "Redemptions",
    label: "Redemptions enabled",
    description: "Master switch for coin-redemption requests.",
    default: "true",
  },
  {
    key: "redeem.minCoins",
    type: "NUMBER",
    category: "Redemptions",
    label: "Minimum redemption coins",
    description: "Smallest number of coins a user may redeem in one request.",
    default: "100",
    min: 1,
    max: 1_000_000,
  },
  // --- Referrals ---
  {
    key: "referral.rewardPoints",
    type: "NUMBER",
    category: "Referrals",
    label: "Referral reward points",
    description: "Points credited to the referrer when an invited user applies their code",
    default: "50",
    min: 0,
    max: 1_000_000,
  },
  // --- Fraud & duplicate protection (Module 4) ---
  {
    key: "fraud.rejectDuplicateImages",
    type: "BOOLEAN",
    category: "Fraud",
    label: "Reject duplicate screenshots",
    description: "Auto-reject a submission whose image hash matches a prior one.",
    default: "true",
  },
  {
    key: "fraud.flagScoreThreshold",
    type: "NUMBER",
    category: "Fraud",
    label: "Fraud score flag threshold",
    description: "Flag a user for review once their fraud score reaches this value.",
    default: "50",
    min: 1,
    max: 1000,
  },
  {
    key: "fraud.suspiciousPendingCount",
    type: "NUMBER",
    category: "Fraud",
    label: "Suspicious pending count",
    description: "Log a suspicious event when a user exceeds this many pending submissions.",
    default: "5",
    min: 1,
    max: 100,
  },
  // --- Submissions (Modules 3 & 4) ---
  {
    key: "submission.maxImageSizeMb",
    type: "NUMBER",
    category: "Submissions",
    label: "Max screenshot size (MB)",
    description: "Reject proof uploads larger than this.",
    default: "5",
    min: 1,
    max: 25,
  },
  {
    key: "submission.allowResubmitAfterReject",
    type: "BOOLEAN",
    category: "Submissions",
    label: "Allow resubmit after rejection",
    description: "Let users submit a fresh screenshot for an offer they were rejected on.",
    default: "true",
  },
  // --- Games (3-piece tic-tac-toe) ---
  {
    key: "game.ttt.enabled",
    type: "BOOLEAN",
    category: "Games",
    label: "Tic-tac-toe enabled",
    description: "Master switch for the 3-piece tic-tac-toe game.",
    default: "true",
  },
  {
    key: "game.ttt.winCoins",
    type: "NUMBER",
    category: "Games",
    label: "Tic-tac-toe win coins",
    description: "Coins credited when a user beats the AI.",
    default: "20",
    min: 0,
    max: 1_000_000,
  },
  {
    key: "game.ttt.difficulty",
    type: "STRING",
    category: "Games",
    label: "Tic-tac-toe AI difficulty",
    description: "AI strength: EASY, MEDIUM, HARD or IMPOSSIBLE.",
    default: "MEDIUM",
    enum: ["EASY", "MEDIUM", "HARD", "IMPOSSIBLE"],
  },
  {
    key: "game.ttt.hintWinCoins",
    type: "NUMBER",
    category: "Games",
    label: "Tic-tac-toe hinted-win coins",
    description: "Coins credited for a win when the removal hint was enabled.",
    default: "5",
    min: 0,
    max: 1_000_000,
  },
  {
    key: "game.ttt.dailyLimit",
    type: "NUMBER",
    category: "Games",
    label: "Tic-tac-toe daily match limit",
    description: "Max matches a user may start per day.",
    default: "5",
    min: 0,
    max: 1000,
  },
  // --- Web (in-app web zone) ---
  {
    key: "web.baseUrl",
    type: "STRING",
    category: "Web",
    label: "Web base URL",
    description: "Base URL of the reward-hub web app the in-app web zone opens.",
    default: "http://localhost:5174/",
  },
  // --- Levels (progression is driven by lifetime coins earned) ---
  {
    key: "levels.curve",
    type: "STRING",
    category: "Levels",
    label: "Level curve",
    description:
      'JSON: {"type":"quadratic","base":100} (total lifetime coins to reach level n = base*n*n) or {"type":"table","thresholds":[100,400,900,...]} (total coins to reach level n+1).',
    default: '{"type":"quadratic","base":100}',
  },
  {
    key: "levels.ranks",
    type: "STRING",
    category: "Levels",
    label: "Rank names",
    description: "JSON array of rank names, one per 5 levels.",
    default:
      '["Bronze Scout","Silver Hunter","Gold Raider","Platinum Elite","Diamond Legend","Mythic Champion"]',
  },
] as const;

export const SETTINGS_BY_KEY: Record<string, SettingDefinition> = Object.fromEntries(
  SETTINGS_REGISTRY.map((definition) => [definition.key, definition]),
);

// ---- DTOs ----

export interface SettingDto {
  key: string;
  value: string;
  type: SettingType;
  category: string;
  label: string;
  description: string;
  isDefault: boolean;
}

export const updateSettingsSchema = z.object({
  // key -> string value; validated against the registry in the service.
  values: z.record(z.string(), z.string().max(500)),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

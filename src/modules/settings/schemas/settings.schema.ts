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

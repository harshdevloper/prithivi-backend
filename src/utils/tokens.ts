import { createHash, randomBytes } from "node:crypto";

export const generateOpaqueToken = (): string => randomBytes(48).toString("hex");

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const DURATION_UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses durations like "15m", "12h", "7d" into milliseconds. */
export const parseDuration = (value: string): number => {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${value}" (expected e.g. "15m", "7d")`);
  }
  return Number(match[1]) * DURATION_UNITS[match[2]];
};

import { createHash, createHmac, randomBytes } from "node:crypto";

/**
 * Pure roulette engine — European single-zero wheel (0..36). No IO, no DB:
 * every function here is deterministic given its inputs (seed generation is the
 * one thin wrapper over crypto), which keeps the game math trivially testable.
 *
 * Fairness: outcomes are derived from an HMAC-SHA256 of a server seed keyed by
 * the client seed + nonce, never from Math.random. The server seed's hash is
 * committed on the round before the outcome is revealed, and the seed itself is
 * returned after settlement so a player can recompute and verify the result.
 */

export type RouletteBetType = "ODD" | "EVEN" | "RED" | "BLACK" | "NUMBER";
export type Colour = "RED" | "BLACK" | "GREEN";
export type Parity = "ODD" | "EVEN" | "NONE";
export type ProbabilityMode = "FAIR" | "WEIGHTED";

export const WHEEL_SIZE = 37; // pockets 0..36

/** Standard European wheel red pockets. Everything else in 1..36 is black; 0 is green. */
export const RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

/**
 * Physical pocket order on a real single-zero wheel, clockwise from 0. Shared
 * with the web + Flutter clients (returned by the config API) so the ball lands
 * on the same pocket everywhere the game is rendered.
 */
export const WHEEL_SEQUENCE: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export interface PayoutMultipliers {
  number: number;
  odd: number;
  even: number;
  red: number;
  black: number;
}

export const colourOf = (n: number): Colour => {
  if (n === 0) return "GREEN";
  return RED_NUMBERS.has(n) ? "RED" : "BLACK";
};

export const parityOf = (n: number): Parity => {
  if (n === 0) return "NONE";
  return n % 2 === 1 ? "ODD" : "EVEN";
};

/**
 * Win resolvers keyed by bet type — the extension point. Adding LOW (1..18),
 * HIGH (19..36), DOZEN or COLUMN later is a single entry here + a payout key.
 * Note 0 (green) loses every even-money bet: that is the house edge.
 */
const WIN_RESOLVERS: Record<RouletteBetType, (winning: number, selected: number | null) => boolean> =
  {
    ODD: (w) => w !== 0 && w % 2 === 1,
    EVEN: (w) => w !== 0 && w % 2 === 0,
    RED: (w) => RED_NUMBERS.has(w),
    BLACK: (w) => w !== 0 && !RED_NUMBERS.has(w),
    NUMBER: (w, s) => s !== null && w === s,
  };

const profitMultiplierFor = (betType: RouletteBetType, m: PayoutMultipliers): number => {
  switch (betType) {
    case "NUMBER":
      return m.number;
    case "ODD":
      return m.odd;
    case "EVEN":
      return m.even;
    case "RED":
      return m.red;
    case "BLACK":
      return m.black;
  }
};

export interface SettleResult {
  won: boolean;
  /** Profit "X to 1" multiplier actually applied (0 on a loss). */
  profitMultiplier: number;
  /** Total coins returned on a win (stake x (profit + 1)); 0 on a loss. */
  payout: number;
  colour: Colour;
  parity: Parity;
}

/**
 * Settle a single bet against a winning number. `stake` is whole coins. Payout
 * is the TOTAL returned (profit + the stake back), so a paid win credits
 * `payout` after the stake was already debited. Caller applies any max-payout
 * cap and decides the wallet delta (paid vs free).
 */
export const settleBet = (params: {
  betType: RouletteBetType;
  selectedNumber: number | null;
  stake: number;
  winningNumber: number;
  multipliers: PayoutMultipliers;
}): SettleResult => {
  const { betType, selectedNumber, stake, winningNumber, multipliers } = params;
  const won = WIN_RESOLVERS[betType](winningNumber, selectedNumber);
  const profit = profitMultiplierFor(betType, multipliers);
  return {
    won,
    profitMultiplier: won ? profit : 0,
    payout: won ? stake * (profit + 1) : 0,
    colour: colourOf(winningNumber),
    parity: parityOf(winningNumber),
  };
};

// ---- Provably-fair RNG ----

/** 32 random bytes as hex — the per-round server seed. */
export const newSeed = (): string => randomBytes(32).toString("hex");

export const hashSeed = (seed: string): string =>
  createHash("sha256").update(seed).digest("hex");

/**
 * Deterministic uniform in [0, 1) from (serverSeed, clientSeed, nonce) via
 * HMAC-SHA256. 53 bits of resolution — enough to pick a pocket with no bias.
 */
export const fairRoll = (serverSeed: string, clientSeed: string, nonce: number): number => {
  const digest = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}`).digest();
  const hi = digest.readUInt32BE(0);
  const lo = digest.readUInt32BE(4);
  // 2^53-safe: keep 21 bits of lo so the mantissa never rounds to 1.0.
  return (hi * 2097152 + (lo >>> 11)) / 9007199254740992; // (hi<<21 | lo>>11) / 2^53
};

/**
 * Map a [0,1) roll to a pocket 0..36. WEIGHTED uses the profile's integer
 * weights (index = number); FAIR (or missing/zero weights) is uniform.
 */
export const pickWinningNumber = (
  roll: number,
  mode: ProbabilityMode,
  weights: number[] | null,
): number => {
  if (mode === "WEIGHTED" && weights && weights.length === WHEEL_SIZE) {
    const total = weights.reduce((a, b) => a + (b > 0 ? b : 0), 0);
    if (total > 0) {
      let target = roll * total;
      for (let n = 0; n < WHEEL_SIZE; n += 1) {
        target -= weights[n] > 0 ? weights[n] : 0;
        if (target < 0) return n;
      }
      return WHEEL_SIZE - 1; // floating-point safety net
    }
  }
  return Math.floor(roll * WHEEL_SIZE); // 0..36
};

/** Full deterministic outcome for one spin — used by both play and verify. */
export const deriveOutcome = (params: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  mode: ProbabilityMode;
  weights: number[] | null;
}): { roll: number; winningNumber: number } => {
  const roll = fairRoll(params.serverSeed, params.clientSeed, params.nonce);
  return { roll, winningNumber: pickWinningNumber(roll, params.mode, params.weights) };
};

// ---- Weights validation + RTP estimation (admin probability tooling) ----

export interface WeightValidation {
  valid: boolean;
  errors: string[];
}

export const validateWeights = (weights: unknown): WeightValidation => {
  const errors: string[] = [];
  if (!Array.isArray(weights)) {
    return { valid: false, errors: ["weights must be an array of 37 integers"] };
  }
  if (weights.length !== WHEEL_SIZE) {
    errors.push(`must have exactly ${WHEEL_SIZE} weights (numbers 0..36)`);
  }
  weights.forEach((w, i) => {
    if (typeof w !== "number" || !Number.isInteger(w) || w < 0) {
      errors.push(`weight[${i}] must be a non-negative integer`);
    }
  });
  const total = weights.reduce((a: number, b) => a + (typeof b === "number" && b > 0 ? b : 0), 0);
  if (total <= 0) errors.push("total weight must be greater than 0");
  if (total > 1_000_000) errors.push("total weight is too large (max 1,000,000)");
  return { valid: errors.length === 0, errors };
};

export interface RtpEstimate {
  overall: number;
  byCategory: {
    number: number;
    odd: number;
    even: number;
    red: number;
    black: number;
    /** Worst case: a player only ever bets the single highest-probability number. */
    maxNumberRtp: number;
  };
}

const numberProbabilities = (mode: ProbabilityMode, weights: number[] | null): number[] => {
  if (mode === "WEIGHTED" && weights && weights.length === WHEEL_SIZE) {
    const total = weights.reduce((a, b) => a + (b > 0 ? b : 0), 0);
    if (total > 0) return weights.map((w) => (w > 0 ? w : 0) / total);
  }
  return Array.from({ length: WHEEL_SIZE }, () => 1 / WHEEL_SIZE);
};

/**
 * Return-to-player estimate per bet category. Overall assumes an equal mix of
 * the five categories (documented assumption — real RTP depends on the actual
 * bet mix). Straight-up number RTP averaged over which number is picked is
 * (payout+1)/37 regardless of weights, so `maxNumberRtp` is surfaced separately
 * to flag a weighting a sharp player could exploit by only betting hot numbers.
 */
export const estimateRtp = (
  mode: ProbabilityMode,
  weights: number[] | null,
  m: PayoutMultipliers,
): RtpEstimate => {
  const p = numberProbabilities(mode, weights);
  const sumWhere = (pred: (n: number) => boolean): number =>
    p.reduce((acc, pn, n) => acc + (pred(n) ? pn : 0), 0);

  const number = ((m.number + 1) * 1) / WHEEL_SIZE;
  const maxNumberRtp = (m.number + 1) * Math.max(...p);
  const red = (m.red + 1) * sumWhere((n) => RED_NUMBERS.has(n));
  const black = (m.black + 1) * sumWhere((n) => n !== 0 && !RED_NUMBERS.has(n));
  const odd = (m.odd + 1) * sumWhere((n) => n !== 0 && n % 2 === 1);
  const even = (m.even + 1) * sumWhere((n) => n !== 0 && n % 2 === 0);
  const overall = (number + red + black + odd + even) / 5;

  return { overall, byCategory: { number, odd, even, red, black, maxNumberRtp } };
};

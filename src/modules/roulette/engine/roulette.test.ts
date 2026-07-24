import { describe, expect, it } from "vitest";
import {
  colourOf,
  deriveOutcome,
  estimateRtp,
  evaluatePayoutCapacity,
  fairRoll,
  hashSeed,
  newSeed,
  parityOf,
  pickWinningNumber,
  settleBet,
  validateWeights,
  WHEEL_SEQUENCE,
  WHEEL_SIZE,
  type PayoutMultipliers,
} from "./roulette.js";

const STD: PayoutMultipliers = { number: 35, odd: 1, even: 1, red: 1, black: 1 };

describe("wheel classification", () => {
  it("colours 0 green, and reds/blacks per the European wheel", () => {
    expect(colourOf(0)).toBe("GREEN");
    expect(colourOf(1)).toBe("RED");
    expect(colourOf(2)).toBe("BLACK");
    expect(colourOf(36)).toBe("RED");
    // 18 red + 18 black + 1 green
    const reds = Array.from({ length: 37 }, (_, n) => colourOf(n)).filter((c) => c === "RED");
    const blacks = Array.from({ length: 37 }, (_, n) => colourOf(n)).filter((c) => c === "BLACK");
    expect(reds).toHaveLength(18);
    expect(blacks).toHaveLength(18);
  });

  it("gives 0 no parity; others odd/even", () => {
    expect(parityOf(0)).toBe("NONE");
    expect(parityOf(1)).toBe("ODD");
    expect(parityOf(2)).toBe("EVEN");
  });

  it("has a valid 37-pocket wheel sequence with every number once", () => {
    expect(WHEEL_SEQUENCE).toHaveLength(WHEEL_SIZE);
    expect(new Set(WHEEL_SEQUENCE).size).toBe(WHEEL_SIZE);
    expect([...WHEEL_SEQUENCE].sort((a, b) => a - b)).toEqual(
      Array.from({ length: WHEEL_SIZE }, (_, i) => i),
    );
  });
});

describe("settleBet payouts", () => {
  it("pays a straight-up number win 36x total (35 to 1)", () => {
    const r = settleBet({
      betType: "NUMBER",
      selectedNumber: 17,
      stake: 100,
      winningNumber: 17,
      multipliers: STD,
    });
    expect(r.won).toBe(true);
    expect(r.payout).toBe(3600);
    expect(r.profitMultiplier).toBe(35);
  });

  it("loses a number bet when the pocket differs", () => {
    const r = settleBet({
      betType: "NUMBER",
      selectedNumber: 17,
      stake: 100,
      winningNumber: 18,
      multipliers: STD,
    });
    expect(r.won).toBe(false);
    expect(r.payout).toBe(0);
  });

  it("pays even-money bets 2x total (1 to 1)", () => {
    expect(
      settleBet({
        betType: "ODD",
        selectedNumber: null,
        stake: 50,
        winningNumber: 7,
        multipliers: STD,
      }).payout,
    ).toBe(100);
    expect(
      settleBet({
        betType: "EVEN",
        selectedNumber: null,
        stake: 50,
        winningNumber: 8,
        multipliers: STD,
      }).payout,
    ).toBe(100);
    expect(
      settleBet({
        betType: "RED",
        selectedNumber: null,
        stake: 50,
        winningNumber: 1,
        multipliers: STD,
      }).payout,
    ).toBe(100);
    expect(
      settleBet({
        betType: "BLACK",
        selectedNumber: null,
        stake: 50,
        winningNumber: 2,
        multipliers: STD,
      }).payout,
    ).toBe(100);
  });

  it("loses EVERY even-money bet on 0 — the house edge", () => {
    for (const betType of ["ODD", "EVEN", "RED", "BLACK"] as const) {
      expect(
        settleBet({ betType, selectedNumber: null, stake: 10, winningNumber: 0, multipliers: STD })
          .won,
      ).toBe(false);
    }
    // but a straight-up 0 bet still wins
    expect(
      settleBet({
        betType: "NUMBER",
        selectedNumber: 0,
        stake: 10,
        winningNumber: 0,
        multipliers: STD,
      }).won,
    ).toBe(true);
  });

  it("respects custom multipliers", () => {
    const r = settleBet({
      betType: "RED",
      selectedNumber: null,
      stake: 100,
      winningNumber: 3,
      multipliers: { ...STD, red: 2 },
    });
    expect(r.payout).toBe(300); // stake x (2 + 1)
  });

  it("rejects a zero-cap bet before sampling instead of creating a zero-credit win", () => {
    expect(
      evaluatePayoutCapacity({
        betType: "RED",
        stake: 100,
        multipliers: STD,
        maxPayoutPerGame: 0,
        dailyPayoutRemaining: 10_000,
      }),
    ).toEqual({ eligible: false, fullPayout: 200, limit: "PER_GAME" });
  });

  it("rejects partial per-game and daily payouts before sampling", () => {
    expect(
      evaluatePayoutCapacity({
        betType: "NUMBER",
        stake: 100,
        multipliers: STD,
        maxPayoutPerGame: 500,
        dailyPayoutRemaining: 10_000,
      }),
    ).toEqual({ eligible: false, fullPayout: 3600, limit: "PER_GAME" });
    expect(
      evaluatePayoutCapacity({
        betType: "NUMBER",
        stake: 100,
        multipliers: STD,
        maxPayoutPerGame: 10_000,
        dailyPayoutRemaining: 400,
      }),
    ).toEqual({ eligible: false, fullPayout: 3600, limit: "DAILY" });
  });

  it("accepts a fully payable bet and its win settles at that exact amount", () => {
    const capacity = evaluatePayoutCapacity({
      betType: "NUMBER",
      stake: 100,
      multipliers: STD,
      maxPayoutPerGame: 10_000,
      dailyPayoutRemaining: 4_000,
    });
    const outcome = settleBet({
      betType: "NUMBER",
      selectedNumber: 17,
      stake: 100,
      winningNumber: 17,
      multipliers: STD,
    });
    expect(capacity).toEqual({ eligible: true, fullPayout: 3600, limit: null });
    expect(outcome.payout).toBe(capacity.fullPayout);
  });
});

describe("provably-fair RNG", () => {
  it("is deterministic for the same seeds", () => {
    expect(fairRoll("server", "client", 0)).toBe(fairRoll("server", "client", 0));
    expect(fairRoll("server", "client", 0)).not.toBe(fairRoll("server", "client", 1));
  });

  it("produces rolls strictly in [0, 1)", () => {
    for (let n = 0; n < 5000; n += 1) {
      const r = fairRoll("seed", "c", n);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });

  it("verifies: recomputing from stored seeds reproduces the number, and the hash commits the seed", () => {
    const serverSeed = newSeed();
    const hash = hashSeed(serverSeed);
    const out = deriveOutcome({
      serverSeed,
      clientSeed: "player-seed",
      nonce: 0,
      mode: "FAIR",
      weights: null,
    });
    const recomputed = deriveOutcome({
      serverSeed,
      clientSeed: "player-seed",
      nonce: 0,
      mode: "FAIR",
      weights: null,
    });
    expect(recomputed.winningNumber).toBe(out.winningNumber);
    expect(hashSeed(serverSeed)).toBe(hash);
  });
});

describe("FAIR mode distribution (large simulation)", () => {
  it("covers every pocket roughly uniformly over 74,000 spins", () => {
    const spins = 74_000;
    const counts = new Array(WHEEL_SIZE).fill(0) as number[];
    const serverSeed = "distribution-test-seed";
    for (let n = 0; n < spins; n += 1) {
      counts[pickWinningNumber(fairRoll(serverSeed, "c", n), "FAIR", null)] += 1;
    }
    const expected = spins / WHEEL_SIZE;
    // chi-square goodness-of-fit; 36 dof, generous bound well above p=0.001 (~68)
    const chi = counts.reduce((acc, c) => acc + (c - expected) ** 2 / expected, 0);
    // Report observed vs expected for the deliverable.
    // eslint-disable-next-line no-console
    console.log(
      `[roulette FAIR sim] spins=${spins} expected/pocket=${expected.toFixed(1)} ` +
        `min=${Math.min(...counts)} max=${Math.max(...counts)} chi2=${chi.toFixed(1)}`,
    );
    expect(Math.min(...counts)).toBeGreaterThan(0);
    expect(chi).toBeLessThan(90);
  });
});

describe("WEIGHTED mode", () => {
  it("never lands on a zero-weight pocket and favours heavy weights", () => {
    const weights = new Array(37).fill(0) as number[];
    weights[7] = 90; // heavily favoured
    weights[13] = 10;
    const counts = new Array(37).fill(0) as number[];
    for (let n = 0; n < 10_000; n += 1) {
      counts[pickWinningNumber(fairRoll("w", "c", n), "WEIGHTED", weights)] += 1;
    }
    expect(counts[7]).toBeGreaterThan(counts[13]);
    // every other pocket has weight 0 and must never appear
    counts.forEach((c, n) => {
      if (n !== 7 && n !== 13) expect(c).toBe(0);
    });
    // roughly the 90/10 split
    expect(counts[7] / 10_000).toBeGreaterThan(0.8);
  });

  it("falls back to uniform when weights are missing or all zero", () => {
    const zero = new Array(37).fill(0) as number[];
    const n1 = pickWinningNumber(0.5, "WEIGHTED", zero);
    const n2 = pickWinningNumber(0.5, "FAIR", null);
    expect(n1).toBe(n2);
  });
});

describe("weights validation", () => {
  it("accepts a valid 37-length non-negative integer array", () => {
    expect(validateWeights(new Array(37).fill(1)).valid).toBe(true);
  });
  it("rejects wrong length, negatives, non-integers and zero-total", () => {
    expect(validateWeights(new Array(36).fill(1)).valid).toBe(false);
    expect(validateWeights([...new Array(36).fill(1), -1]).valid).toBe(false);
    expect(validateWeights([...new Array(36).fill(1), 1.5]).valid).toBe(false);
    expect(validateWeights(new Array(37).fill(0)).valid).toBe(false);
    expect(validateWeights("nope").valid).toBe(false);
  });
});

describe("RTP estimation", () => {
  it("computes the standard European ~97.3% RTP in FAIR mode", () => {
    const est = estimateRtp("FAIR", null, STD);
    expect(est.byCategory.number).toBeCloseTo(36 / 37, 4);
    expect(est.byCategory.red).toBeCloseTo((18 / 37) * 2, 4);
    expect(est.byCategory.odd).toBeCloseTo((18 / 37) * 2, 4);
    expect(est.overall).toBeCloseTo(36 / 37, 3);
  });

  it("flags an exploitable weighting where a hot number's RTP exceeds 100%", () => {
    const weights = new Array(37).fill(1) as number[];
    weights[7] = 5; // number 7 now ~5/41 ≈ 0.122 > 1/36 → 36*0.122 > 1
    const est = estimateRtp("WEIGHTED", weights, STD);
    expect(est.byCategory.maxNumberRtp).toBeGreaterThan(1);
  });
});

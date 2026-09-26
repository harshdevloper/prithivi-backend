import { describe, expect, it, vi } from "vitest";
import { classify, pushToTokens, summarize } from "./notification-dispatcher.js";
import type { NotificationJob } from "../queues/notification.queue.js";

// Backoff sleeps are real timers; keep them out of the test clock.
vi.useFakeTimers({ toFake: ["setTimeout"] });

const job: NotificationJob = { type: "SYSTEM", title: "Hi", body: "There" };

type Reply = { success: boolean; error?: { code: string; message: string } };

/** Fake FCM: `plan[token]` lists the reply for each call in order; last one repeats. */
const fakeApp = (plan: Record<string, Reply[]>) => {
  const calls: string[][] = [];
  const seen: Record<string, number> = {};
  const deleted: string[] = [];
  const app = {
    firebaseMessaging: {
      sendEachForMulticast: vi.fn(async ({ tokens }: { tokens: string[] }) => {
        calls.push(tokens);
        const responses = tokens.map((token) => {
          const replies = plan[token] ?? [{ success: true }];
          const reply = replies[Math.min(seen[token] ?? 0, replies.length - 1)];
          seen[token] = (seen[token] ?? 0) + 1;
          return reply;
        });
        return {
          responses,
          successCount: responses.filter((r) => r.success).length,
          failureCount: responses.filter((r) => !r.success).length,
        };
      }),
    },
    prisma: {
      deviceToken: {
        deleteMany: vi.fn(async ({ where }: { where: { token: { in: string[] } } }) => {
          deleted.push(...where.token.in);
          return { count: where.token.in.length };
        }),
      },
    },
    log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  };
  return { app: app as never, calls, deleted };
};

const run = async <T>(promise: Promise<T>): Promise<T> => {
  // Drain every backoff sleep the dispatcher schedules.
  const settled = promise.then((value) => ({ value }));
  for (let i = 0; i < 20; i++) await vi.advanceTimersByTimeAsync(10_000);
  return (await settled).value;
};

const dead = {
  success: false,
  error: { code: "messaging/registration-token-not-registered", message: "x" },
};
const flaky = { success: false, error: { code: "messaging/internal-error", message: "x" } };
const badPayload = {
  success: false,
  error: { code: "messaging/invalid-argument", message: "Invalid JSON payload received." },
};

describe("classify", () => {
  it("treats invalid-argument as a dead token only when FCM blames the token", () => {
    expect(
      classify({
        code: "messaging/invalid-argument",
        message: "The registration token is not a valid FCM registration token",
      }),
    ).toBe("stale");
    expect(classify(badPayload.error)).toBe("failed");
    expect(classify(dead.error)).toBe("stale");
    expect(classify(flaky.error)).toBe("retry");
    expect(classify(undefined)).toBe("ok");
  });
});

describe("pushToTokens", () => {
  it("delivers, retries transient failures, prunes dead tokens and explains the rest", async () => {
    const { app, calls, deleted } = fakeApp({
      ok: [{ success: true }],
      dead: [dead],
      flaky: [flaky, flaky, { success: true }],
      broken: [badPayload],
    });
    const devices = ["ok", "dead", "flaky", "broken"].map((token) => ({ token }));

    const outcome = await run(pushToTokens(app, job, devices));

    expect(outcome.success).toBe(2); // ok + flaky after two retries
    expect(outcome.failure).toBe(2); // dead (pruned) + broken payload
    expect(outcome.pruned).toBe(1);
    expect(deleted).toEqual(["dead"]);
    expect(outcome.reasons).toEqual({ "uninstalled device (pruned)": 1, "rejected payload": 1 });
    // first pass with all four, then only the flaky token is retried
    expect(calls[0]).toEqual(["ok", "dead", "flaky", "broken"]);
    expect(calls.slice(1)).toEqual([["flaky"], ["flaky"]]);
    expect(summarize(outcome)).toBe("2 failed: 1 rejected payload, 1 uninstalled device (pruned)");
  });

  it("gives up on a token that never recovers and counts it once", async () => {
    const { app, calls } = fakeApp({ flaky: [flaky] });
    const outcome = await run(pushToTokens(app, job, [{ token: "flaky" }]));
    expect(outcome).toMatchObject({ success: 0, failure: 1, reasons: { "FCM unavailable": 1 } });
    expect(calls).toHaveLength(4); // first pass + 3 retry rounds
  });

  it("splits large audiences into 500-token calls and reports progress", async () => {
    const { app, calls } = fakeApp({});
    const devices = Array.from({ length: 1_203 }, (_, i) => ({ token: `t${i}` }));
    const progress: number[] = [];
    const outcome = await run(
      pushToTokens(app, job, devices, async (partial) => {
        progress.push(partial.success);
      }),
    );
    expect(outcome.success).toBe(1_203);
    expect(calls.map((c) => c.length).sort((a, b) => a - b)).toEqual([203, 500, 500]);
    expect(progress.at(-1)).toBe(1_203);
  });

  it("is a no-op without Firebase or without devices", async () => {
    const { app } = fakeApp({});
    expect(await run(pushToTokens(app, job, []))).toMatchObject({ success: 0, failure: 0 });
    expect(
      await run(
        pushToTokens({ ...(app as object), firebaseMessaging: undefined } as never, job, [
          { token: "x" },
        ]),
      ),
    ).toMatchObject({ success: 0, failure: 0 });
  });
});

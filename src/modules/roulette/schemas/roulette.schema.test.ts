import { describe, expect, it } from "vitest";
import {
  cancelProbabilityScheduleSchema,
  createProbabilityScheduleSchema,
} from "./roulette.schema.js";

const profileId = "26f40f33-c87f-4c6d-82b8-a7315949b845";

describe("probability schedule inputs", () => {
  it("accepts an offset ISO window and trims its audited reason", () => {
    const parsed = createProbabilityScheduleSchema.parse({
      profileId,
      startsAt: "2026-07-24T18:00:00+05:30",
      endsAt: "2026-07-24T19:00:00+05:30",
      reason: "  evening policy window  ",
    });
    expect(parsed.reason).toBe("evening policy window");
  });

  it("rejects empty and non-positive windows", () => {
    expect(() =>
      createProbabilityScheduleSchema.parse({
        profileId,
        startsAt: "2026-07-24T12:30:00.000Z",
        endsAt: "2026-07-24T12:30:00.000Z",
        reason: "same instant",
      }),
    ).toThrow();
    expect(() =>
      createProbabilityScheduleSchema.parse({
        profileId,
        startsAt: "2026-07-24T13:30:00.000Z",
        endsAt: "2026-07-24T12:30:00.000Z",
        reason: "backwards",
      }),
    ).toThrow();
  });

  it("requires a non-blank cancellation reason", () => {
    expect(() => cancelProbabilityScheduleSchema.parse({ reason: "   " })).toThrow();
    expect(cancelProbabilityScheduleSchema.parse({ reason: "  operator request " })).toEqual({
      reason: "operator request",
    });
  });
});

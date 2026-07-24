import { describe, expect, it } from "vitest";
import { probabilityModeForProfile, probabilityScheduleStatusAt } from "./probability-policy.js";

const instant = (iso: string): Date => new Date(iso);

describe("probability schedule windows", () => {
  const startsAt = instant("2026-07-24T10:00:00.000Z");
  const endsAt = instant("2026-07-24T11:00:00.000Z");
  const live = { startsAt, endsAt, cancelledAt: null };

  it("uses half-open [startsAt, endsAt) boundaries", () => {
    expect(probabilityScheduleStatusAt(live, instant("2026-07-24T09:59:59.999Z"))).toBe("UPCOMING");
    expect(probabilityScheduleStatusAt(live, startsAt)).toBe("ACTIVE");
    expect(probabilityScheduleStatusAt(live, instant("2026-07-24T10:59:59.999Z"))).toBe("ACTIVE");
    expect(probabilityScheduleStatusAt(live, endsAt)).toBe("EXPIRED");
  });

  it("reports cancellation independently of the window position", () => {
    expect(
      probabilityScheduleStatusAt(
        { ...live, cancelledAt: instant("2026-07-24T10:15:00.000Z") },
        instant("2026-07-24T10:30:00.000Z"),
      ),
    ).toBe("CANCELLED");
  });

  it("does not apply a cancellation that occurs after the queried instant", () => {
    expect(
      probabilityScheduleStatusAt(
        { ...live, cancelledAt: instant("2026-07-24T10:30:00.000Z") },
        instant("2026-07-24T10:15:00.000Z"),
      ),
    ).toBe("ACTIVE");
  });
});

describe("scheduled profile modes", () => {
  it("falls back to FAIR without a schedule and preserves a FAIR profile", () => {
    expect(probabilityModeForProfile(null)).toBe("FAIR");
    expect(probabilityModeForProfile("FAIR")).toBe("FAIR");
  });

  it("uses WEIGHTED only for an explicitly weighted profile", () => {
    expect(probabilityModeForProfile("WEIGHTED")).toBe("WEIGHTED");
  });
});

import type { ProbabilityMode } from "./roulette.js";

export type ProbabilityScheduleStatus = "UPCOMING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface ProbabilityScheduleWindow {
  startsAt: Date;
  endsAt: Date;
  cancelledAt: Date | null;
}

/** Schedule state at one canonical instant. Windows are UTC and half-open [start, end). */
export const probabilityScheduleStatusAt = (
  schedule: ProbabilityScheduleWindow,
  at: Date,
): ProbabilityScheduleStatus => {
  if (schedule.cancelledAt !== null && schedule.cancelledAt.getTime() <= at.getTime()) {
    return "CANCELLED";
  }
  if (at.getTime() < schedule.startsAt.getTime()) return "UPCOMING";
  if (at.getTime() >= schedule.endsAt.getTime()) return "EXPIRED";
  return "ACTIVE";
};

/**
 * A missing schedule always means FAIR. A scheduled FAIR profile must remain
 * FAIR rather than being inferred as WEIGHTED merely because a profile exists.
 */
export const probabilityModeForProfile = (profileMode: ProbabilityMode | null): ProbabilityMode =>
  profileMode ?? "FAIR";

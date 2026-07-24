-- Timed probability schedules use finite UTC, half-open [startsAt, endsAt)
-- windows. No scheduler/cron mutates status; status is derived from DB time.
CREATE TABLE "roulette_probability_schedules" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledById" TEXT,
    "cancelReason" TEXT,

    CONSTRAINT "roulette_probability_schedules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "roulette_probability_schedules_valid_window"
      CHECK ("startsAt" < "endsAt")
);

-- The exclusion constraint is the concurrency-safe source of truth. Adjacent
-- windows are valid because tstzrange uses the requested half-open '[)' bounds.
ALTER TABLE "roulette_probability_schedules"
ADD CONSTRAINT "roulette_probability_schedules_no_overlap"
EXCLUDE USING GIST (
  tstzrange("startsAt", "endsAt", '[)') WITH &&
)
WHERE ("cancelledAt" IS NULL);

CREATE INDEX "roulette_probability_schedules_startsAt_endsAt_idx"
ON "roulette_probability_schedules"("startsAt", "endsAt");

CREATE INDEX "roulette_probability_schedules_profileId_startsAt_idx"
ON "roulette_probability_schedules"("profileId", "startsAt");

CREATE INDEX "roulette_probability_schedules_live_window_idx"
ON "roulette_probability_schedules"("startsAt", "endsAt")
WHERE "cancelledAt" IS NULL;

ALTER TABLE "roulette_probability_schedules"
ADD CONSTRAINT "roulette_probability_schedules_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "roulette_probability_profiles"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roulette_rounds"
ADD COLUMN "probabilityScheduleId" TEXT,
ADD COLUMN "policyResolvedAt" TIMESTAMPTZ(3);

-- Preserve a meaningful policy time for pre-existing rounds.
UPDATE "roulette_rounds"
SET "policyResolvedAt" = "createdAt" AT TIME ZONE 'UTC'
WHERE "policyResolvedAt" IS NULL;

ALTER TABLE "roulette_rounds"
ALTER COLUMN "policyResolvedAt" SET NOT NULL,
ALTER COLUMN "policyResolvedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "roulette_rounds_probabilityScheduleId_idx"
ON "roulette_rounds"("probabilityScheduleId");

ALTER TABLE "roulette_rounds"
ADD CONSTRAINT "roulette_rounds_probabilityScheduleId_fkey"
FOREIGN KEY ("probabilityScheduleId") REFERENCES "roulette_probability_schedules"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

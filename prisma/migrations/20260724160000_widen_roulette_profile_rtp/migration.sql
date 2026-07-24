-- Configured roulette payout multipliers can legitimately make estimated RTP
-- exceed 99.9999. Preserve four decimal places while avoiding numeric overflow
-- when an immutable probability profile is created.
ALTER TABLE "roulette_probability_profiles"
ALTER COLUMN "estimatedRtp" TYPE DECIMAL(12,4);

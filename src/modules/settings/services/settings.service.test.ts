import { describe, expect, it } from "vitest";
import type { SettingsRepository } from "../repositories/settings.repository.js";
import { SETTINGS_BY_KEY } from "../schemas/settings.schema.js";
import { SettingsService } from "./settings.service.js";

describe("retired roulette probability setting contract", () => {
  it("is absent from settings metadata and rejects legacy mutations", async () => {
    let writes = 0;
    const repo = {
      findAll: async () => [],
      upsertMany: async () => {
        writes += 1;
      },
    } as unknown as SettingsRepository;
    const service = new SettingsService(repo);

    expect(SETTINGS_BY_KEY["game.roulette.probabilityMode"]).toBeUndefined();
    await expect(
      service.update({ values: { "game.roulette.probabilityMode": "WEIGHTED" } }, "admin-id"),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
    expect(writes).toBe(0);
  });
});

describe("roulette reset timezone validation", () => {
  it("rejects an invalid IANA timezone before persisting it", async () => {
    let writes = 0;
    const repo = {
      findAll: async () => [],
      upsertMany: async () => {
        writes += 1;
      },
    } as unknown as SettingsRepository;
    const service = new SettingsService(repo);

    await expect(
      service.update({ values: { "game.roulette.resetTimezone": "Not/A_Timezone" } }, "admin-id"),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
    expect(writes).toBe(0);
  });

  it("falls back safely when a legacy override contains an invalid timezone", async () => {
    const repo = {
      findAll: async () => [
        {
          key: "game.roulette.resetTimezone",
          value: "Not/A_Timezone",
        },
      ],
    } as unknown as SettingsRepository;
    const service = new SettingsService(repo);

    await expect(service.getString("game.roulette.resetTimezone")).resolves.toBe("Asia/Kolkata");
  });
});

describe("roulette numeric setting contracts", () => {
  it("rejects fractional payout multipliers before they can reach an Int round column", async () => {
    let writes = 0;
    const repo = {
      findAll: async () => [],
      upsertMany: async () => {
        writes += 1;
      },
    } as unknown as SettingsRepository;
    const service = new SettingsService(repo);

    await expect(
      service.update({ values: { "game.roulette.payout.red": "1.5" } }, "admin-id"),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
    expect(writes).toBe(0);
  });

  it("falls back to the registry default for a pre-existing fractional override", async () => {
    const repo = {
      findAll: async () => [
        {
          key: "game.roulette.payout.red",
          value: "1.5",
        },
      ],
    } as unknown as SettingsRepository;
    const service = new SettingsService(repo);

    await expect(service.getNumber("game.roulette.payout.red")).resolves.toBe(1);
  });
});

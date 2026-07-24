import { describe, expect, it } from "vitest";
import { RouletteService } from "./roulette.service.js";

describe("retired probability profile activation contract", () => {
  it("returns an explicit 410 instead of accepting an ignored activation", async () => {
    const service = new RouletteService(null as never, null as never, null as never);

    await expect(
      service.activateProfile(
        { id: "admin-id", email: "admin@example.test" },
        "profile-id",
        "legacy activation attempt",
      ),
    ).rejects.toMatchObject({
      statusCode: 410,
      code: "ROULETTE_PROFILE_ACTIVATION_RETIRED",
    });
  });
});

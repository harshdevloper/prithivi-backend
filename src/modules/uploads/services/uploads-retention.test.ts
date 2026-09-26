import { randomUUID } from "node:crypto";
import { access, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { UploadsService } from "./uploads.service.js";

vi.mock("../../../config/env.js", async () => ({
  env: { UPLOADS_DIR: (await import("node:os")).tmpdir() },
}));

describe("proof retention", () => {
  it("deletes stored proofs aged 90 days and retires their metadata", async () => {
    const objectKey = `proof-retention-${randomUUID()}.webp`;
    const file = path.join(tmpdir(), objectKey);
    await writeFile(file, "proof");
    const findMany = vi
      .fn()
      .mockResolvedValue([
        { id: "old-proof", storageProvider: "local", objectKey, sourceUrl: null },
      ]);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const service = new UploadsService({
      mediaAsset: { findMany, updateMany },
    } as unknown as PrismaClient);
    const now = new Date("2026-09-27T00:00:00.000Z");

    expect(await service.retireExpiredProofs(now)).toEqual({ retired: 1, failedIds: [] });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        purpose: "PROOF",
        status: "ACTIVE",
        createdAt: { lte: new Date("2026-06-29T00:00:00.000Z") },
      },
      orderBy: { createdAt: "asc" },
      take: 500,
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "old-proof", status: "ACTIVE" },
      data: { status: "RETIRED", retiredAt: now },
    });
    await expect(access(file)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps the proof active when storage deletion fails, so a later sweep can retry", async () => {
    const updateMany = vi.fn();
    const service = new UploadsService({
      mediaAsset: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: "failed-proof", storageProvider: "s3", objectKey: "proof.webp" },
          ]),
        updateMany,
      },
    } as unknown as PrismaClient);

    expect(await service.retireExpiredProofs()).toEqual({
      retired: 0,
      failedIds: ["failed-proof"],
    });
    expect(updateMany).not.toHaveBeenCalled();
  });
});

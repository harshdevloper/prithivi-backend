import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { UploadsService } from "./uploads.service.js";

vi.mock("../../../config/env.js", async () => ({
  env: { UPLOADS_DIR: (await import("node:os")).tmpdir() },
}));

describe("managed image preview access", () => {
  it("checks authorization on cache hits and refuses retired or invalid capabilities", async () => {
    const objectKey = `prithvi-thumbnail-test-${randomUUID()}.webp`;
    const file = path.join(tmpdir(), objectKey);
    const original = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "white" },
    }).webp().toBuffer();
    await writeFile(file, original);
    try {
      const findFirst = vi.fn().mockResolvedValue({
        id: "asset", objectKey, storageProvider: "local", mimeType: "image/webp",
      });
      const service = new UploadsService({ mediaAsset: { findFirst } } as unknown as PrismaClient);
      const first = await service.contentLocation("asset", "capability", 160);
      expect(await sharp(first.body!).metadata()).toMatchObject({ width: 160, height: 120 });
      const second = await service.contentLocation("asset", "capability", 160);
      expect(second.body).toBe(first.body);
      expect(findFirst).toHaveBeenCalledTimes(2);
      expect(findFirst.mock.calls[1]?.[0].where).toEqual({
        id: "asset", accessToken: "capability", status: "ACTIVE",
      });
      expect(await service.contentLocation("asset", "capability")).toEqual({
        localPath: file, mimeType: "image/webp",
      });
      findFirst.mockResolvedValue(null);
      await expect(service.contentLocation("asset", "invalid", 160)).rejects.toThrow("Image not found");
      await expect(service.contentLocation("asset", "capability", 160)).rejects.toThrow("Image not found");
    } finally {
      await unlink(file);
    }
  });

  it("uses Cloudinary derivatives only for previews", async () => {
    const sourceUrl = "https://res.cloudinary.com/demo/image/upload/v1/proof.webp";
    const service = new UploadsService({ mediaAsset: {
      findFirst: vi.fn().mockResolvedValue({ id: "asset", storageProvider: "cloudinary", sourceUrl, mimeType: "image/webp" }),
    } } as unknown as PrismaClient);
    expect((await service.contentLocation("asset", "token")).redirectUrl).toBe(sourceUrl);
    expect((await service.contentLocation("asset", "token", 640)).redirectUrl)
      .toContain("/image/upload/c_limit,w_640,h_640,q_auto,f_webp/v1/");
  });
});

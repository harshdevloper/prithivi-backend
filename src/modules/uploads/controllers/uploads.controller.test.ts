import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { UploadsController } from "./uploads.controller.js";
import type { UploadsService } from "../services/uploads.service.js";

describe("image variant HTTP responses", () => {
  it("serves cached binary previews, bounds requested sizes, and keeps original redirects", async () => {
    const body = Buffer.from("webp-test-bytes");
    const contentLocation = vi.fn(async (_id: string, _token: string, size?: number) =>
      size ? { body, mimeType: "image/webp" }
        : { redirectUrl: "https://example.com/original.webp", mimeType: "image/webp" },
    );
    const controller = new UploadsController({ contentLocation } as unknown as UploadsService);
    const app = Fastify();
    app.get("/uploads/:id/content", controller.content);
    try {
      const preview = await app.inject("/uploads/image/content?token=capability&size=160");
      expect(preview.statusCode).toBe(200);
      expect(preview.headers["content-type"]).toBe("image/webp");
      expect(preview.headers["cache-control"]).toContain("private");
      expect(preview.rawPayload).toEqual(body);
      expect(contentLocation).toHaveBeenCalledWith("image", "capability", 160);
      expect((await app.inject("/uploads/image/content?token=capability&size=4096")).statusCode).toBe(400);
      expect((await app.inject("/uploads/image/content?size=160")).statusCode).toBe(400);
      const original = await app.inject("/uploads/image/content?token=capability");
      expect(original.statusCode).toBe(302);
      expect(original.headers.location).toBe("https://example.com/original.webp");
      expect(contentLocation).toHaveBeenCalledTimes(2);
    } finally { await app.close(); }
  });
});

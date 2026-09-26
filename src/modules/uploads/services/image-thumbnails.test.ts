import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createThumbnail, ThumbnailCache } from "./image-thumbnails.js";

afterEach(() => vi.useRealTimers());

describe("display thumbnails", () => {
  it("bounds portrait proofs without cropping and leaves the original intact", async () => {
    const original = await sharp({
      create: { width: 1080, height: 1920, channels: 3, background: "#eef2ff" },
    }).png().toBuffer();
    const copy = Buffer.from(original);
    const thumbnail = await createThumbnail(original, 160);
    const metadata = await sharp(thumbnail).metadata();
    expect(metadata).toMatchObject({ width: 90, height: 160, format: "webp" });
    expect(thumbnail.length).toBeLessThan(original.length / 10);
    expect(original.equals(copy)).toBe(true);
  });

  it("never enlarges a small image", async () => {
    const original = await sharp({
      create: { width: 24, height: 16, channels: 3, background: "white" },
    }).png().toBuffer();
    expect(await sharp(await createThumbnail(original, 640)).metadata())
      .toMatchObject({ width: 24, height: 16 });
  });
});

describe("thumbnail work and memory limits", () => {
  it("coalesces concurrent requests and caches the completed image", async () => {
    const cache = new ThumbnailCache();
    const load = vi.fn(async () => Buffer.from("image"));
    const [first, second] = await Promise.all([
      cache.getOrCreate("a", load), cache.getOrCreate("a", load),
    ]);
    expect(first).toBe(second);
    expect(await cache.getOrCreate("a", load)).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("evicts least recently used bytes and expires stale entries", async () => {
    vi.useFakeTimers();
    const cache = new ThumbnailCache(8, 100);
    const a = vi.fn(async () => Buffer.from("aaaa"));
    const b = vi.fn(async () => Buffer.from("bbbb"));
    await cache.getOrCreate("a", a);
    await cache.getOrCreate("b", b);
    await cache.getOrCreate("a", a);
    await cache.getOrCreate("c", async () => Buffer.from("cccc"));
    await cache.getOrCreate("a", a);
    expect(a).toHaveBeenCalledTimes(1);
    await cache.getOrCreate("b", b);
    expect(b).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(101);
    await cache.getOrCreate("b", b);
    expect(b).toHaveBeenCalledTimes(3);
  });

  it("bounds concurrent transforms and queued work, then releases slots on failure", async () => {
    const cache = new ThumbnailCache(1024, 1000, 1, 2);
    let rejectFirst!: (error: Error) => void;
    const first = cache.getOrCreate("a", () => new Promise<Buffer>((_, reject) => { rejectFirst = reject; }));
    const loadSecond = vi.fn(async () => Buffer.from("b"));
    const second = cache.getOrCreate("b", loadSecond);
    expect(loadSecond).not.toHaveBeenCalled();
    expect(await cache.getOrCreate("c", async () => Buffer.from("c"))).toBeUndefined();
    const rejected = expect(first).rejects.toThrow("failed");
    rejectFirst(new Error("failed"));
    await rejected;
    expect(await second).toEqual(Buffer.from("b"));
    expect(await cache.getOrCreate("a", async () => Buffer.from("retry"))).toEqual(Buffer.from("retry"));
  });
});

import sharp from "sharp";

export const THUMBNAIL_EDGES = [160, 640] as const;
export type ThumbnailEdge = (typeof THUMBNAIL_EDGES)[number];

/** Keep the review original intact; only small display derivatives use lossy WebP. */
export const createThumbnail = (original: Buffer, edge: ThumbnailEdge): Promise<Buffer> =>
  sharp(original, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75, effort: 3 })
    .toBuffer();

/** Bounded LRU with single-flight work and a small CPU queue per API process. */
export class ThumbnailCache {
  private readonly entries = new Map<string, { body: Buffer; expiresAt: number }>();
  private readonly pending = new Map<string, Promise<Buffer>>();
  private readonly waiters: (() => void)[] = [];
  private bytes = 0;
  private active = 0;

  constructor(
    private readonly maxBytes = 16 * 1024 * 1024,
    private readonly ttlMs = 10 * 60_000,
    private readonly concurrency = 2,
    private readonly maxPending = 64,
  ) {}

  getOrCreate(key: string, load: () => Promise<Buffer>): Promise<Buffer | undefined> {
    const cached = this.entries.get(key);
    if (cached) {
      this.entries.delete(key);
      if (cached.expiresAt > Date.now()) {
        this.entries.set(key, cached);
        return Promise.resolve(cached.body);
      }
      this.bytes -= cached.body.length;
    }
    const existing = this.pending.get(key);
    if (existing) return existing;
    // Under a burst, fall back to the original instead of creating an unbounded queue.
    if (this.pending.size >= this.maxPending) return Promise.resolve(undefined);
    const result = this.generate(key, load).finally(() => this.pending.delete(key));
    this.pending.set(key, result);
    return result;
  }

  private async generate(key: string, load: () => Promise<Buffer>): Promise<Buffer> {
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    } else {
      this.active += 1;
    }
    try {
      const body = await load();
      if (body.length <= this.maxBytes) {
        while (this.bytes + body.length > this.maxBytes || this.entries.size >= 256) {
          const oldest = this.entries.keys().next().value!;
          this.bytes -= this.entries.get(oldest)!.body.length;
          this.entries.delete(oldest);
        }
        this.entries.set(key, { body, expiresAt: Date.now() + this.ttlMs });
        this.bytes += body.length;
      }
      return body;
    } finally {
      const next = this.waiters.shift();
      if (next) next();
      else this.active -= 1;
    }
  }
}

import { createHash } from "node:crypto";

export interface HashedImage {
  hash: string; // SHA-256 hex of the raw bytes
  byteSize: number;
}

/**
 * Fetches an image by URL and computes its SHA-256 server-side — the only
 * tamper-proof place to hash (a client-supplied hash could be faked to dodge
 * duplicate detection). Enforces a byte cap and a short timeout.
 */
export const fetchAndHashImage = async (
  url: string,
  maxBytes: number,
): Promise<HashedImage> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`image fetch failed (${response.status})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error("image exceeds the maximum allowed size");
    }
    return {
      hash: createHash("sha256").update(buffer).digest("hex"),
      byteSize: buffer.byteLength,
    };
  } finally {
    clearTimeout(timeout);
  }
};

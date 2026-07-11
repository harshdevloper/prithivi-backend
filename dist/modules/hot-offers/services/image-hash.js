"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAndHashImage = void 0;
const node_crypto_1 = require("node:crypto");
/**
 * Fetches an image by URL and computes its SHA-256 server-side — the only
 * tamper-proof place to hash (a client-supplied hash could be faked to dodge
 * duplicate detection). Enforces a byte cap and a short timeout.
 */
const fetchAndHashImage = async (url, maxBytes) => {
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
            hash: (0, node_crypto_1.createHash)("sha256").update(buffer).digest("hex"),
            byteSize: buffer.byteLength,
        };
    }
    finally {
        clearTimeout(timeout);
    }
};
exports.fetchAndHashImage = fetchAndHashImage;
//# sourceMappingURL=image-hash.js.map
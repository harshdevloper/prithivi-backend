"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDuration = exports.hashToken = exports.generateOpaqueToken = void 0;
const node_crypto_1 = require("node:crypto");
const generateOpaqueToken = () => (0, node_crypto_1.randomBytes)(48).toString("hex");
exports.generateOpaqueToken = generateOpaqueToken;
const hashToken = (token) => (0, node_crypto_1.createHash)("sha256").update(token).digest("hex");
exports.hashToken = hashToken;
const DURATION_UNITS = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
};
/** Parses durations like "15m", "12h", "7d" into milliseconds. */
const parseDuration = (value) => {
    const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
    if (!match) {
        throw new Error(`Invalid duration format: "${value}" (expected e.g. "15m", "7d")`);
    }
    return Number(match[1]) * DURATION_UNITS[match[2]];
};
exports.parseDuration = parseDuration;
//# sourceMappingURL=tokens.js.map
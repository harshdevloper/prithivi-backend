"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.failure = exports.success = void 0;
const success = (data, meta) => ({
    success: true,
    data,
    ...(meta ? { meta } : {}),
});
exports.success = success;
const failure = (code, message, details) => ({
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
});
exports.failure = failure;
//# sourceMappingURL=response.js.map
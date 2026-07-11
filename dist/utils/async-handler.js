"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
// Wraps route handlers so rejected promises reach Fastify's error handler.
const asyncHandler = (handler) => {
    return async (request, reply) => handler(request, reply);
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=async-handler.js.map
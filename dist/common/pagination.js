"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMeta = exports.toSkipTake = exports.paginationQuerySchema = void 0;
const zod_1 = require("zod");
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
const toSkipTake = (query) => ({
    skip: (query.page - 1) * query.limit,
    take: query.limit,
});
exports.toSkipTake = toSkipTake;
const buildMeta = (query, total) => ({
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
});
exports.buildMeta = buildMeta;
//# sourceMappingURL=pagination.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsSummaryQuerySchema = exports.trackEventSchema = void 0;
const zod_1 = require("zod");
exports.trackEventSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1)
        .max(120)
        .regex(/^[a-z0-9_.:-]+$/i, "Event name may only contain letters, digits, _ . : -"),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.analyticsSummaryQuerySchema = zod_1.z.object({
    from: zod_1.z.coerce.date().optional(),
    to: zod_1.z.coerce.date().optional(),
});
//# sourceMappingURL=analytics.schema.js.map
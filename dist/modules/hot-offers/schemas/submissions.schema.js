"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSubmissionDto = exports.submissionSchema = exports.listSubmissionsQuerySchema = exports.reviewSubmissionSchema = exports.submitProofSchema = void 0;
const zod_1 = require("zod");
const submissionStatus = zod_1.z.enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "NEED_MORE_PROOF",
    "CANCELLED",
]);
exports.submitProofSchema = zod_1.z.object({
    offerId: zod_1.z.string().uuid(),
    screenshotUrl: zod_1.z.string().url().max(2048),
    note: zod_1.z.string().max(1000).optional(),
});
exports.reviewSubmissionSchema = zod_1.z.object({
    action: zod_1.z.enum(["APPROVE", "REJECT", "NEED_MORE_PROOF"]),
    reviewNote: zod_1.z.string().max(1000).optional(),
});
exports.listSubmissionsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: submissionStatus.optional(),
});
exports.submissionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    offerId: zod_1.z.string().uuid(),
    offerTitle: zod_1.z.string(),
    offerSlug: zod_1.z.string(),
    offerThumbnailUrl: zod_1.z.string().nullable(),
    screenshotUrl: zod_1.z.string(),
    note: zod_1.z.string().nullable(),
    status: submissionStatus,
    reviewNote: zod_1.z.string().nullable(),
    rewardAmount: zod_1.z.number(),
    reviewedAt: zod_1.z.string().datetime().nullable(),
    createdAt: zod_1.z.string().datetime(),
    // Present only on the admin listing.
    user: zod_1.z.object({ id: zod_1.z.string().uuid(), name: zod_1.z.string(), email: zod_1.z.string() }).optional(),
});
const toSubmissionDto = (submission, includeUser = false) => ({
    id: submission.id,
    offerId: submission.offerId,
    offerTitle: submission.offer.title,
    offerSlug: submission.offer.slug,
    offerThumbnailUrl: submission.offer.thumbnailUrl,
    screenshotUrl: submission.screenshotUrl,
    note: submission.note,
    status: submission.status,
    reviewNote: submission.reviewNote,
    rewardAmount: Number(submission.rewardAmount),
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    createdAt: submission.createdAt.toISOString(),
    ...(includeUser && submission.user ? { user: submission.user } : {}),
});
exports.toSubmissionDto = toSubmissionDto;
//# sourceMappingURL=submissions.schema.js.map
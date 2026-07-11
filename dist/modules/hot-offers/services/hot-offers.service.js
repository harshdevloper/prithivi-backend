"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HotOffersService = void 0;
const errors_js_1 = require("../../../common/errors.js");
const pagination_js_1 = require("../../../common/pagination.js");
const hot_offers_schema_js_1 = require("../schemas/hot-offers.schema.js");
const submissions_schema_js_1 = require("../schemas/submissions.schema.js");
const image_hash_js_1 = require("./image-hash.js");
const RANGE_CONFIG = {
    daily: { days: 14, bucket: "day" },
    weekly: { days: 12 * 7, bucket: "week" },
    monthly: { days: 365, bucket: "month" },
};
class HotOffersService {
    repo;
    notifications;
    settings;
    constructor(repo, notifications, settings) {
        this.repo = repo;
        this.notifications = notifications;
        this.settings = settings;
    }
    // ---- public: categories & feedback pages ----
    async listPublicCategories() {
        const categories = await this.repo.listCategories({ publishedOnly: true });
        return categories.map(hot_offers_schema_js_1.toCategoryDto);
    }
    async getPublicFeedbackPage(categorySlug) {
        const page = await this.repo.findFeedbackPageByCategorySlug(categorySlug, true);
        if (!page)
            throw new errors_js_1.NotFoundError("Feedback page not found");
        return (0, hot_offers_schema_js_1.toFeedbackPageDto)(page);
    }
    // ---- public: offers ----
    async listPublicOffers(query) {
        const [offers, total] = await this.repo.listOffers(query, { publishedOnly: true });
        return { items: offers.map(hot_offers_schema_js_1.toOfferCardDto), meta: (0, pagination_js_1.buildMeta)(query, total) };
    }
    async getPublicOffer(slug) {
        const offer = await this.repo.findOfferBySlug(slug, true);
        if (!offer)
            throw new errors_js_1.NotFoundError("Offer not found");
        return (0, hot_offers_schema_js_1.toOfferDetailsDto)(offer);
    }
    // ---- public: event tracking ----
    async trackEvent(input, userId) {
        await this.repo.createEvent({
            type: input.type,
            source: input.source,
            sessionId: input.sessionId,
            offerId: input.offerId ?? null,
            categoryId: input.categoryId ?? null,
            userId: userId ?? null,
        });
    }
    // ---- admin: categories ----
    async adminListCategories() {
        const categories = await this.repo.listCategories({ publishedOnly: false });
        return categories.map(hot_offers_schema_js_1.toCategoryDto);
    }
    async createCategory(input) {
        const slug = await this.uniqueCategorySlug(input.slug ?? (0, hot_offers_schema_js_1.slugify)(input.title));
        const category = await this.repo.createCategory({
            slug,
            title: input.title,
            subtitle: input.subtitle ?? null,
            imageUrl: input.imageUrl ?? null,
            priority: input.priority,
            featured: input.featured,
            status: input.status,
        });
        return (0, hot_offers_schema_js_1.toCategoryDto)(category);
    }
    async updateCategory(id, input) {
        const existing = await this.repo.findCategoryById(id);
        if (!existing)
            throw new errors_js_1.NotFoundError("Category not found");
        const slug = await this.uniqueCategorySlug(input.slug ?? existing.slug, id);
        const category = await this.repo.updateCategory(id, {
            slug,
            title: input.title,
            subtitle: input.subtitle ?? null,
            imageUrl: input.imageUrl ?? null,
            priority: input.priority,
            featured: input.featured,
            status: input.status,
        });
        return (0, hot_offers_schema_js_1.toCategoryDto)(category);
    }
    async deleteCategory(id) {
        const existing = await this.repo.findCategoryById(id);
        if (!existing)
            throw new errors_js_1.NotFoundError("Category not found");
        await this.repo.softDeleteCategory(id, `${existing.slug}--deleted--${Date.now()}`);
    }
    // ---- admin: feedback pages ----
    async adminGetFeedbackPage(categorySlug) {
        const page = await this.repo.findFeedbackPageByCategorySlug(categorySlug, false);
        return page ? (0, hot_offers_schema_js_1.toFeedbackPageDto)(page) : null;
    }
    async upsertFeedbackPage(categoryId, input) {
        const category = await this.repo.findCategoryById(categoryId);
        if (!category)
            throw new errors_js_1.NotFoundError("Category not found");
        const page = await this.repo.upsertFeedbackPage(categoryId, {
            bannerUrl: input.bannerUrl ?? null,
            title: input.title,
            description: input.description,
            benefits: input.benefits,
            rewardPoints: input.rewardPoints,
            buttonText: input.buttonText,
            buttonVisible: input.buttonVisible,
            websiteUrl: input.websiteUrl,
            status: input.status,
        });
        return (0, hot_offers_schema_js_1.toFeedbackPageDto)(page);
    }
    // ---- admin: offers ----
    async adminListOffers(query) {
        const [offers, total] = await this.repo.listOffers(query, { publishedOnly: false });
        return { items: offers.map(hot_offers_schema_js_1.toOfferCardDto), meta: (0, pagination_js_1.buildMeta)(query, total) };
    }
    async adminGetOffer(id) {
        const offer = await this.repo.findOfferById(id);
        if (!offer)
            throw new errors_js_1.NotFoundError("Offer not found");
        return (0, hot_offers_schema_js_1.toOfferDetailsDto)(offer);
    }
    async createOffer(input) {
        const category = await this.repo.findCategoryById(input.categoryId);
        if (!category)
            throw new errors_js_1.NotFoundError("Category not found");
        const slug = await this.uniqueOfferSlug(input.slug ?? (0, hot_offers_schema_js_1.slugify)(input.title));
        const offer = await this.repo.createOffer({ ...this.toOfferData(input), slug });
        return (0, hot_offers_schema_js_1.toOfferDetailsDto)(offer);
    }
    async updateOffer(id, input) {
        const existing = await this.repo.findOfferById(id);
        if (!existing)
            throw new errors_js_1.NotFoundError("Offer not found");
        const category = await this.repo.findCategoryById(input.categoryId);
        if (!category)
            throw new errors_js_1.NotFoundError("Category not found");
        const slug = await this.uniqueOfferSlug(input.slug ?? existing.slug, id);
        const offer = await this.repo.updateOffer(id, { ...this.toOfferData(input), slug });
        return (0, hot_offers_schema_js_1.toOfferDetailsDto)(offer);
    }
    async deleteOffer(id) {
        const existing = await this.repo.findOfferById(id);
        if (!existing)
            throw new errors_js_1.NotFoundError("Offer not found");
        await this.repo.softDeleteOffer(id, `${existing.slug}--deleted--${Date.now()}`);
    }
    /** Append -2, -3, … until the slug is free (excluding the row being updated). */
    async uniqueOfferSlug(base, exceptId) {
        const clean = base || "offer";
        let candidate = clean;
        let n = 2;
        while (await this.repo.offerSlugExists(candidate, exceptId)) {
            candidate = `${clean}-${n++}`;
        }
        return candidate;
    }
    async uniqueCategorySlug(base, exceptId) {
        const clean = base || "category";
        let candidate = clean;
        let n = 2;
        while (await this.repo.categorySlugExists(candidate, exceptId)) {
            candidate = `${clean}-${n++}`;
        }
        return candidate;
    }
    toOfferData(input) {
        return {
            categoryId: input.categoryId,
            title: input.title,
            appName: input.appName ?? null,
            logoUrl: input.logoUrl ?? null,
            thumbnailUrl: input.thumbnailUrl ?? null,
            bannerUrl: input.bannerUrl ?? null,
            shortDescription: input.shortDescription,
            description: input.description,
            features: (0, hot_offers_schema_js_1.asJson)(input.features),
            instructions: (0, hot_offers_schema_js_1.asJson)(input.instructions),
            requirements: (0, hot_offers_schema_js_1.asJson)(input.requirements),
            terms: input.terms ?? null,
            warning: input.warning ?? null,
            rewardAmount: input.rewardAmount,
            rewardCoins: input.rewardCoins,
            rewardLabel: input.rewardLabel ?? null,
            taskDescription: input.taskDescription ?? null,
            difficulty: input.difficulty,
            estimatedTime: input.estimatedTime ?? null,
            rating: input.rating ?? null,
            playStoreUrl: input.playStoreUrl,
            featured: input.featured,
            trending: input.trending,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            maxUsers: input.maxUsers ?? null,
            maxRewards: input.maxRewards ?? null,
            dailyLimit: input.dailyLimit ?? null,
            priority: input.priority,
            status: input.status,
        };
    }
    // ---- proof submissions ----
    /** User submits (or re-submits) a screenshot for an offer. Runs the fraud &
     *  cap guards, then records the submission and its image hash. */
    async submitProof(userId, input) {
        const offer = await this.repo.findOfferById(input.offerId);
        if (!offer || offer.status !== "PUBLISHED")
            throw new errors_js_1.NotFoundError("Offer not found");
        const existing = await this.repo.findSubmission(input.offerId, userId);
        // ---- status / resubmit gating ----
        if (existing) {
            if (existing.status === "PENDING") {
                throw new errors_js_1.ConflictError("Your proof for this offer is already under review");
            }
            if (existing.status === "APPROVED") {
                throw new errors_js_1.ConflictError("You have already been rewarded for this offer");
            }
            if (existing.status === "REJECTED") {
                const allowed = await this.settings.getBoolean("submission.allowResubmitAfterReject");
                if (!allowed)
                    throw new errors_js_1.ConflictError("This offer can no longer be resubmitted");
            }
        }
        // ---- cap: maxUsers (only when this user is a NEW participant) ----
        if (!existing && offer.maxUsers !== null) {
            const participants = await this.repo.countDistinctParticipants(offer.id);
            if (participants >= offer.maxUsers) {
                throw new errors_js_1.ConflictError("This offer has reached its participant limit");
            }
        }
        // ---- cap: dailyLimit (attempts for this offer today) ----
        if (offer.dailyLimit !== null) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const attemptsToday = await this.repo.countImagesForUserOfferSince(userId, offer.id, startOfDay);
            if (attemptsToday >= offer.dailyLimit) {
                await this.repo.createFraudLog({
                    userId,
                    submissionId: existing?.id ?? null,
                    type: "DAILY_LIMIT",
                    score: 15,
                    detail: `Exceeded daily limit (${offer.dailyLimit}) for "${offer.title}"`,
                });
                throw new errors_js_1.ConflictError("You've reached today's submission limit for this offer");
            }
        }
        // ---- server-side hash + duplicate-image detection ----
        const maxBytes = (await this.settings.getNumber("submission.maxImageSizeMb")) * 1024 * 1024;
        let hashed;
        try {
            hashed = await (0, image_hash_js_1.fetchAndHashImage)(input.screenshotUrl, maxBytes);
        }
        catch (error) {
            throw new errors_js_1.BadRequestError(error instanceof Error && error.message.includes("size")
                ? "Screenshot exceeds the maximum allowed size"
                : "Could not read the uploaded screenshot — please try again");
        }
        if (await this.settings.getBoolean("fraud.rejectDuplicateImages")) {
            const duplicate = await this.repo.findDuplicateImage(hashed.hash, existing?.id ?? null);
            if (duplicate) {
                await this.repo.createFraudLog({
                    userId,
                    submissionId: existing?.id ?? null,
                    type: "DUPLICATE_IMAGE",
                    score: 40,
                    detail: `Reused screenshot (matches submission ${duplicate.submissionId})`,
                });
                throw new errors_js_1.ConflictError("This screenshot has already been used — upload a fresh one");
            }
        }
        // ---- persist submission + image record ----
        const submission = existing
            ? await this.repo.resubmit(existing.id, {
                screenshotUrl: input.screenshotUrl,
                note: input.note ?? null,
                rewardAmount: offer.rewardAmount,
            })
            : await this.repo.createSubmission({
                offerId: input.offerId,
                userId,
                screenshotUrl: input.screenshotUrl,
                note: input.note ?? null,
                rewardAmount: offer.rewardAmount,
            });
        await this.repo.createSubmissionImage({
            submissionId: submission.id,
            url: input.screenshotUrl,
            hash: hashed.hash,
            byteSize: hashed.byteSize,
        });
        // ---- log (don't block) excessive pending submissions ----
        const pending = await this.repo.countPendingByUser(userId);
        const suspiciousPending = await this.settings.getNumber("fraud.suspiciousPendingCount");
        if (pending > suspiciousPending) {
            await this.repo.createFraudLog({
                userId,
                submissionId: submission.id,
                type: "EXCESS_PENDING",
                score: 20,
                detail: `${pending} pending submissions (threshold ${suspiciousPending})`,
            });
        }
        return (0, submissions_schema_js_1.toSubmissionDto)(submission);
    }
    /** The caller's submission for a specific offer (or null) — drives the
     *  inline status shown on the game detail screen. */
    async getMySubmissionForOffer(userId, offerId) {
        const submission = await this.repo.findSubmissionWithOffer(offerId, userId);
        return submission ? (0, submissions_schema_js_1.toSubmissionDto)(submission) : null;
    }
    /** User cancels their own pending submission. */
    async cancelSubmission(userId, id) {
        const submission = await this.repo.findSubmissionById(id);
        if (!submission)
            throw new errors_js_1.NotFoundError("Submission not found");
        if (submission.userId !== userId)
            throw new errors_js_1.ForbiddenError();
        if (submission.status !== "PENDING") {
            throw new errors_js_1.BadRequestError("Only a pending submission can be cancelled");
        }
        const cancelled = await this.repo.cancelSubmission(id);
        return (0, submissions_schema_js_1.toSubmissionDto)(cancelled);
    }
    async listMySubmissions(userId, query) {
        const [items, total] = await this.repo.listSubmissionsByUser(userId, {
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });
        return { items: items.map((s) => (0, submissions_schema_js_1.toSubmissionDto)(s)), meta: (0, pagination_js_1.buildMeta)(query, total) };
    }
    async adminListSubmissions(query) {
        const [items, total] = await this.repo.listSubmissionsAdmin({
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            status: query.status,
        });
        return { items: items.map((s) => (0, submissions_schema_js_1.toSubmissionDto)(s, true)), meta: (0, pagination_js_1.buildMeta)(query, total) };
    }
    /** Admin approve (credits wallet), reject, or ask for more proof. */
    async reviewSubmission(id, reviewerId, input) {
        const submission = await this.repo.findSubmissionById(id);
        if (!submission)
            throw new errors_js_1.NotFoundError("Submission not found");
        if (submission.status !== "PENDING") {
            throw new errors_js_1.BadRequestError(`Submission has already been ${submission.status.toLowerCase()}`);
        }
        if (input.action === "APPROVE") {
            // Cap: maxRewards — refuse to approve past the offer's reward budget.
            const offer = await this.repo.findOfferById(submission.offerId);
            if (offer?.maxRewards != null) {
                const approvedCount = await this.repo.countApproved(submission.offerId);
                if (approvedCount >= offer.maxRewards) {
                    throw new errors_js_1.BadRequestError(`This offer has reached its reward cap (${offer.maxRewards}) and can't be approved`);
                }
            }
            const approved = await this.repo.approveSubmission(id, reviewerId);
            await this.notifications.enqueue({
                userId: approved.userId,
                type: "WALLET",
                title: "Reward credited 🎉",
                body: `Your proof for "${approved.offer.title}" was approved and ${Number(approved.rewardAmount).toFixed(2)} was credited to your wallet.`,
                route: "/wallet",
            });
            return (0, submissions_schema_js_1.toSubmissionDto)(approved);
        }
        if (input.action === "NEED_MORE_PROOF") {
            const updated = await this.repo.setReviewOutcome(id, "NEED_MORE_PROOF", reviewerId, input.reviewNote ?? null);
            await this.notifications.enqueue({
                userId: updated.userId,
                type: "SYSTEM",
                title: "More proof needed",
                body: `Please add a clearer screenshot for "${updated.offer.title}".${input.reviewNote ? ` ${input.reviewNote}` : ""}`,
                route: "/games/submissions",
            });
            return (0, submissions_schema_js_1.toSubmissionDto)(updated);
        }
        const rejected = await this.repo.setReviewOutcome(id, "REJECTED", reviewerId, input.reviewNote ?? null);
        await this.notifications.enqueue({
            userId: rejected.userId,
            type: "SYSTEM",
            title: "Submission rejected",
            body: `Your proof for "${rejected.offer.title}" was rejected.${input.reviewNote ? ` ${input.reviewNote}` : ""}`,
            route: "/games/submissions",
        });
        return (0, submissions_schema_js_1.toSubmissionDto)(rejected);
    }
    // ---- admin: fraud detection ----
    async fraudOverview() {
        const flagThreshold = await this.settings.getNumber("fraud.flagScoreThreshold");
        const [scores, [logs]] = await Promise.all([
            this.repo.userFraudScores(20),
            this.repo.listFraudLogs({ skip: 0, take: 20 }),
        ]);
        return {
            flagThreshold,
            flaggedUsers: scores.map((row) => ({
                user: row.user,
                score: row.score,
                events: row.events,
                flagged: row.score >= flagThreshold,
            })),
            recentLogs: logs.map((log) => ({
                id: log.id,
                type: log.type,
                score: log.score,
                detail: log.detail,
                createdAt: log.createdAt.toISOString(),
                user: log.user,
            })),
        };
    }
    // ---- admin: analytics ----
    async analytics(query) {
        const config = RANGE_CONFIG[query.range];
        const since = new Date(Date.now() - config.days * 24 * 60 * 60 * 1000);
        const [byType, uniqueUsers, topOffers, topCategories, series] = await Promise.all([
            this.repo.countEventsByType(since),
            this.repo.countUniqueSessions(since),
            this.repo.topOffers(since, 10),
            this.repo.topCategories(since, 10),
            this.repo.eventSeries(since, config.bucket),
        ]);
        const views = byType.VIEW ?? 0;
        const clicks = byType.CLICK ?? 0;
        const downloads = byType.DOWNLOAD ?? 0;
        return {
            totals: {
                views,
                clicks,
                downloads,
                uniqueUsers,
                ctr: views === 0 ? 0 : clicks / views,
                conversionRate: views === 0 ? 0 : downloads / views,
            },
            topOffers: topOffers.map((row) => ({
                id: row.id,
                slug: row.slug,
                title: row.title,
                views: Number(row.views),
                clicks: Number(row.clicks),
                downloads: Number(row.downloads),
            })),
            topCategories: topCategories.map((row) => ({
                id: row.id,
                slug: row.slug,
                title: row.title,
                views: Number(row.views),
                clicks: Number(row.clicks),
                downloads: Number(row.downloads),
            })),
            series: series.map((row) => ({
                bucket: row.bucket.toISOString().slice(0, 10),
                views: Number(row.views),
                clicks: Number(row.clicks),
                downloads: Number(row.downloads),
            })),
        };
    }
}
exports.HotOffersService = HotOffersService;
//# sourceMappingURL=hot-offers.service.js.map
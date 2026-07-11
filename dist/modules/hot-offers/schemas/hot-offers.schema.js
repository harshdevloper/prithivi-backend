"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asJson = exports.slugParamsSchema = exports.idParamsSchema = exports.analyticsQuerySchema = exports.trackEventSchema = exports.upsertOfferSchema = exports.adminListOffersQuerySchema = exports.listOffersQuerySchema = exports.toOfferDetailsDto = exports.toOfferCardDto = exports.offerDetailsSchema = exports.offerCardSchema = exports.upsertFeedbackPageSchema = exports.toFeedbackPageDto = exports.feedbackPageSchema = exports.upsertCategorySchema = exports.toCategoryDto = exports.categorySchema = exports.slugify = void 0;
const zod_1 = require("zod");
const contentStatusSchema = zod_1.z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const slugSchema = zod_1.z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase words separated by dashes")
    .min(2)
    .max(80);
/** Fallback slug when the admin leaves it blank. */
const slugify = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
exports.slugify = slugify;
// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
exports.categorySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    slug: zod_1.z.string(),
    title: zod_1.z.string(),
    subtitle: zod_1.z.string().nullable(),
    imageUrl: zod_1.z.string().nullable(),
    priority: zod_1.z.number().int(),
    featured: zod_1.z.boolean(),
    status: contentStatusSchema,
    hasFeedbackPage: zod_1.z.boolean(),
    offerCount: zod_1.z.number().int(),
    createdAt: zod_1.z.string().datetime(),
});
const toCategoryDto = (category) => ({
    id: category.id,
    slug: category.slug,
    title: category.title,
    subtitle: category.subtitle,
    imageUrl: category.imageUrl,
    priority: category.priority,
    featured: category.featured,
    status: category.status,
    hasFeedbackPage: category.feedbackPage !== null,
    offerCount: category._count.offers,
    createdAt: category.createdAt.toISOString(),
});
exports.toCategoryDto = toCategoryDto;
exports.upsertCategorySchema = zod_1.z.object({
    slug: slugSchema.optional(),
    title: zod_1.z.string().min(1).max(120),
    subtitle: zod_1.z.string().max(200).optional().nullable(),
    imageUrl: zod_1.z.string().url().max(2048).optional().nullable(),
    priority: zod_1.z.number().int().min(0).max(10_000).default(0),
    featured: zod_1.z.boolean().default(false),
    status: contentStatusSchema.default("DRAFT"),
});
// ---------------------------------------------------------------------------
// Feedback pages
// ---------------------------------------------------------------------------
exports.feedbackPageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    categoryId: zod_1.z.string().uuid(),
    categorySlug: zod_1.z.string(),
    categoryTitle: zod_1.z.string(),
    bannerUrl: zod_1.z.string().nullable(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    benefits: zod_1.z.array(zod_1.z.string()),
    rewardPoints: zod_1.z.number().int(),
    buttonText: zod_1.z.string(),
    buttonVisible: zod_1.z.boolean(),
    websiteUrl: zod_1.z.string(),
    status: contentStatusSchema,
});
const toFeedbackPageDto = (page) => ({
    id: page.id,
    categoryId: page.categoryId,
    categorySlug: page.category.slug,
    categoryTitle: page.category.title,
    bannerUrl: page.bannerUrl,
    title: page.title,
    description: page.description,
    benefits: page.benefits ?? [],
    rewardPoints: page.rewardPoints,
    buttonText: page.buttonText,
    buttonVisible: page.buttonVisible,
    websiteUrl: page.websiteUrl,
    status: page.status,
});
exports.toFeedbackPageDto = toFeedbackPageDto;
exports.upsertFeedbackPageSchema = zod_1.z.object({
    bannerUrl: zod_1.z.string().url().max(2048).optional().nullable(),
    title: zod_1.z.string().min(1).max(120),
    description: zod_1.z.string().min(1).max(5000),
    benefits: zod_1.z.array(zod_1.z.string().min(1).max(200)).max(20).default([]),
    rewardPoints: zod_1.z.number().int().min(0).default(0),
    buttonText: zod_1.z.string().min(1).max(40).default("Download"),
    buttonVisible: zod_1.z.boolean().default(true),
    websiteUrl: zod_1.z.string().url().max(2048),
    status: contentStatusSchema.default("DRAFT"),
});
// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------
const difficultySchema = zod_1.z.enum(["EASY", "MEDIUM", "HARD"]);
exports.offerCardSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    slug: zod_1.z.string(),
    title: zod_1.z.string(),
    appName: zod_1.z.string().nullable(),
    logoUrl: zod_1.z.string().nullable(),
    thumbnailUrl: zod_1.z.string().nullable(),
    shortDescription: zod_1.z.string(),
    rewardAmount: zod_1.z.number(),
    rewardCoins: zod_1.z.number().int(),
    rewardLabel: zod_1.z.string().nullable(),
    difficulty: difficultySchema,
    estimatedTime: zod_1.z.string().nullable(),
    rating: zod_1.z.number().nullable(),
    featured: zod_1.z.boolean(),
    trending: zod_1.z.boolean(),
    expiresAt: zod_1.z.string().datetime().nullable(),
    priority: zod_1.z.number().int(),
    status: contentStatusSchema,
    category: zod_1.z.object({ id: zod_1.z.string().uuid(), slug: zod_1.z.string(), title: zod_1.z.string() }),
    createdAt: zod_1.z.string().datetime(),
});
exports.offerDetailsSchema = exports.offerCardSchema.extend({
    bannerUrl: zod_1.z.string().nullable(),
    description: zod_1.z.string(),
    taskDescription: zod_1.z.string().nullable(),
    features: zod_1.z.array(zod_1.z.string()),
    instructions: zod_1.z.array(zod_1.z.string()),
    requirements: zod_1.z.array(zod_1.z.string()),
    terms: zod_1.z.string().nullable(),
    warning: zod_1.z.string().nullable(),
    playStoreUrl: zod_1.z.string(),
    maxUsers: zod_1.z.number().int().nullable(),
    maxRewards: zod_1.z.number().int().nullable(),
    dailyLimit: zod_1.z.number().int().nullable(),
});
const toOfferCardDto = (offer) => ({
    id: offer.id,
    slug: offer.slug,
    title: offer.title,
    appName: offer.appName,
    logoUrl: offer.logoUrl,
    thumbnailUrl: offer.thumbnailUrl,
    shortDescription: offer.shortDescription,
    rewardAmount: Number(offer.rewardAmount),
    rewardCoins: offer.rewardCoins,
    rewardLabel: offer.rewardLabel,
    difficulty: offer.difficulty,
    estimatedTime: offer.estimatedTime,
    rating: offer.rating === null ? null : Number(offer.rating),
    featured: offer.featured,
    trending: offer.trending,
    expiresAt: offer.expiresAt?.toISOString() ?? null,
    priority: offer.priority,
    status: offer.status,
    category: {
        id: offer.category.id,
        slug: offer.category.slug,
        title: offer.category.title,
    },
    createdAt: offer.createdAt.toISOString(),
});
exports.toOfferCardDto = toOfferCardDto;
const toOfferDetailsDto = (offer) => ({
    ...(0, exports.toOfferCardDto)(offer),
    bannerUrl: offer.bannerUrl,
    description: offer.description,
    taskDescription: offer.taskDescription,
    features: offer.features ?? [],
    instructions: offer.instructions ?? [],
    requirements: offer.requirements ?? [],
    terms: offer.terms,
    warning: offer.warning,
    playStoreUrl: offer.playStoreUrl,
    maxUsers: offer.maxUsers,
    maxRewards: offer.maxRewards,
    dailyLimit: offer.dailyLimit,
});
exports.toOfferDetailsDto = toOfferDetailsDto;
exports.listOffersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(12),
    category: slugSchema.optional(),
    search: zod_1.z.string().max(120).optional(),
    sort: zod_1.z.enum(["priority", "newest", "reward"]).default("priority"),
});
exports.adminListOffersQuerySchema = exports.listOffersQuerySchema.extend({
    status: contentStatusSchema.optional(),
});
exports.upsertOfferSchema = zod_1.z.object({
    categoryId: zod_1.z.string().uuid(),
    slug: slugSchema.optional(),
    title: zod_1.z.string().min(1).max(140),
    appName: zod_1.z.string().max(120).optional().nullable(),
    logoUrl: zod_1.z.string().url().max(2048).optional().nullable(),
    thumbnailUrl: zod_1.z.string().url().max(2048).optional().nullable(),
    bannerUrl: zod_1.z.string().url().max(2048).optional().nullable(),
    shortDescription: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(1).max(10_000),
    features: zod_1.z.array(zod_1.z.string().min(1).max(200)).max(20).default([]),
    instructions: zod_1.z.array(zod_1.z.string().min(1).max(300)).max(20).default([]),
    requirements: zod_1.z.array(zod_1.z.string().min(1).max(200)).max(20).default([]),
    terms: zod_1.z.string().max(5000).optional().nullable(),
    warning: zod_1.z.string().max(1000).optional().nullable(),
    rewardAmount: zod_1.z.number().min(0).max(1_000_000),
    rewardCoins: zod_1.z.number().int().min(0).max(10_000_000).default(0),
    rewardLabel: zod_1.z.string().max(80).optional().nullable(),
    taskDescription: zod_1.z.string().max(2000).optional().nullable(),
    difficulty: difficultySchema.default("EASY"),
    estimatedTime: zod_1.z.string().max(40).optional().nullable(),
    rating: zod_1.z.number().min(0).max(5).optional().nullable(),
    playStoreUrl: zod_1.z
        .string()
        .url()
        .startsWith("https://play.google.com/", "Must be a Play Store URL")
        .max(2048),
    featured: zod_1.z.boolean().default(false),
    trending: zod_1.z.boolean().default(false),
    expiresAt: zod_1.z.string().datetime().optional().nullable(),
    maxUsers: zod_1.z.number().int().min(1).optional().nullable(),
    maxRewards: zod_1.z.number().int().min(1).optional().nullable(),
    dailyLimit: zod_1.z.number().int().min(1).optional().nullable(),
    priority: zod_1.z.number().int().min(0).max(10_000).default(0),
    status: contentStatusSchema.default("DRAFT"),
});
// ---------------------------------------------------------------------------
// Events & analytics
// ---------------------------------------------------------------------------
exports.trackEventSchema = zod_1.z
    .object({
    type: zod_1.z.enum(["VIEW", "CLICK", "DOWNLOAD"]),
    source: zod_1.z.enum(["APP", "WEBSITE"]),
    sessionId: zod_1.z.string().min(8).max(100),
    offerId: zod_1.z.string().uuid().optional(),
    categoryId: zod_1.z.string().uuid().optional(),
})
    .refine((input) => Boolean(input.offerId) || Boolean(input.categoryId), {
    message: "offerId or categoryId is required",
    path: ["offerId"],
});
exports.analyticsQuerySchema = zod_1.z.object({
    range: zod_1.z.enum(["daily", "weekly", "monthly"]).default("daily"),
});
exports.idParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
exports.slugParamsSchema = zod_1.z.object({ slug: slugSchema });
/** Prisma JSON helper: undefined leaves the column untouched on update. */
const asJson = (value) => value === undefined ? undefined : value;
exports.asJson = asJson;
//# sourceMappingURL=hot-offers.schema.js.map
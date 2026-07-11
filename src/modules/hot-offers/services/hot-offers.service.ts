import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../common/errors.js";
import { buildMeta } from "../../../common/pagination.js";
import type { PageMeta } from "../../../common/response.js";
import type { NotificationsService } from "../../notifications/services/notifications.service.js";
import type { SettingsService } from "../../settings/services/settings.service.js";
import type { HotOffersRepository } from "../repositories/hot-offers.repository.js";
import {
  asJson,
  slugify,
  toCategoryDto,
  toFeedbackPageDto,
  toOfferCardDto,
  toOfferDetailsDto,
  type AdminListOffersQuery,
  type AnalyticsQuery,
  type CategoryDto,
  type FeedbackPageDto,
  type ListOffersQuery,
  type OfferAnalyticsDto,
  type OfferCardDto,
  type OfferDetailsDto,
  type TrackEventInput,
  type UpsertCategoryInput,
  type UpsertFeedbackPageInput,
  type UpsertOfferInput,
} from "../schemas/hot-offers.schema.js";
import {
  toSubmissionDto,
  type FraudOverviewDto,
  type ListSubmissionsQuery,
  type ReviewSubmissionInput,
  type SubmissionDto,
  type SubmitProofInput,
} from "../schemas/submissions.schema.js";
import { fetchAndHashImage } from "./image-hash.js";

const RANGE_CONFIG = {
  daily: { days: 14, bucket: "day" },
  weekly: { days: 12 * 7, bucket: "week" },
  monthly: { days: 365, bucket: "month" },
} as const;

export class HotOffersService {
  constructor(
    private readonly repo: HotOffersRepository,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  // ---- public: categories & feedback pages ----

  async listPublicCategories(): Promise<CategoryDto[]> {
    const categories = await this.repo.listCategories({ publishedOnly: true });
    return categories.map(toCategoryDto);
  }

  async getPublicFeedbackPage(categorySlug: string): Promise<FeedbackPageDto> {
    const page = await this.repo.findFeedbackPageByCategorySlug(categorySlug, true);
    if (!page) throw new NotFoundError("Feedback page not found");
    return toFeedbackPageDto(page);
  }

  // ---- public: offers ----

  async listPublicOffers(
    query: ListOffersQuery,
  ): Promise<{ items: OfferCardDto[]; meta: PageMeta }> {
    const [offers, total] = await this.repo.listOffers(query, { publishedOnly: true });
    return { items: offers.map(toOfferCardDto), meta: buildMeta(query, total) };
  }

  async getPublicOffer(slug: string): Promise<OfferDetailsDto> {
    const offer = await this.repo.findOfferBySlug(slug, true);
    if (!offer) throw new NotFoundError("Offer not found");
    return toOfferDetailsDto(offer);
  }

  // ---- public: event tracking ----

  async trackEvent(input: TrackEventInput, userId?: string): Promise<void> {
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

  async adminListCategories(): Promise<CategoryDto[]> {
    const categories = await this.repo.listCategories({ publishedOnly: false });
    return categories.map(toCategoryDto);
  }

  async createCategory(input: UpsertCategoryInput): Promise<CategoryDto> {
    const slug = await this.uniqueCategorySlug(input.slug ?? slugify(input.title));
    const category = await this.repo.createCategory({
      slug,
      title: input.title,
      subtitle: input.subtitle ?? null,
      imageUrl: input.imageUrl ?? null,
      priority: input.priority,
      featured: input.featured,
      status: input.status,
    });
    return toCategoryDto(category);
  }

  async updateCategory(id: string, input: UpsertCategoryInput): Promise<CategoryDto> {
    const existing = await this.repo.findCategoryById(id);
    if (!existing) throw new NotFoundError("Category not found");

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
    return toCategoryDto(category);
  }

  async deleteCategory(id: string): Promise<void> {
    const existing = await this.repo.findCategoryById(id);
    if (!existing) throw new NotFoundError("Category not found");
    await this.repo.softDeleteCategory(id, `${existing.slug}--deleted--${Date.now()}`);
  }

  // ---- admin: feedback pages ----

  async adminGetFeedbackPage(categorySlug: string): Promise<FeedbackPageDto | null> {
    const page = await this.repo.findFeedbackPageByCategorySlug(categorySlug, false);
    return page ? toFeedbackPageDto(page) : null;
  }

  async upsertFeedbackPage(
    categoryId: string,
    input: UpsertFeedbackPageInput,
  ): Promise<FeedbackPageDto> {
    const category = await this.repo.findCategoryById(categoryId);
    if (!category) throw new NotFoundError("Category not found");

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
    return toFeedbackPageDto(page);
  }

  // ---- admin: offers ----

  async adminListOffers(
    query: AdminListOffersQuery,
  ): Promise<{ items: OfferCardDto[]; meta: PageMeta }> {
    const [offers, total] = await this.repo.listOffers(query, { publishedOnly: false });
    return { items: offers.map(toOfferCardDto), meta: buildMeta(query, total) };
  }

  async adminGetOffer(id: string): Promise<OfferDetailsDto> {
    const offer = await this.repo.findOfferById(id);
    if (!offer) throw new NotFoundError("Offer not found");
    return toOfferDetailsDto(offer);
  }

  async createOffer(input: UpsertOfferInput): Promise<OfferDetailsDto> {
    const category = await this.repo.findCategoryById(input.categoryId);
    if (!category) throw new NotFoundError("Category not found");

    const slug = await this.uniqueOfferSlug(input.slug ?? slugify(input.title));
    const offer = await this.repo.createOffer({ ...this.toOfferData(input), slug });
    return toOfferDetailsDto(offer);
  }

  async updateOffer(id: string, input: UpsertOfferInput): Promise<OfferDetailsDto> {
    const existing = await this.repo.findOfferById(id);
    if (!existing) throw new NotFoundError("Offer not found");

    const category = await this.repo.findCategoryById(input.categoryId);
    if (!category) throw new NotFoundError("Category not found");

    const slug = await this.uniqueOfferSlug(input.slug ?? existing.slug, id);
    const offer = await this.repo.updateOffer(id, { ...this.toOfferData(input), slug });
    return toOfferDetailsDto(offer);
  }

  async deleteOffer(id: string): Promise<void> {
    const existing = await this.repo.findOfferById(id);
    if (!existing) throw new NotFoundError("Offer not found");
    await this.repo.softDeleteOffer(id, `${existing.slug}--deleted--${Date.now()}`);
  }

  /** Append -2, -3, … until the slug is free (excluding the row being updated). */
  private async uniqueOfferSlug(base: string, exceptId?: string): Promise<string> {
    const clean = base || "offer";
    let candidate = clean;
    let n = 2;
    while (await this.repo.offerSlugExists(candidate, exceptId)) {
      candidate = `${clean}-${n++}`;
    }
    return candidate;
  }

  private async uniqueCategorySlug(base: string, exceptId?: string): Promise<string> {
    const clean = base || "category";
    let candidate = clean;
    let n = 2;
    while (await this.repo.categorySlugExists(candidate, exceptId)) {
      candidate = `${clean}-${n++}`;
    }
    return candidate;
  }

  private toOfferData(input: UpsertOfferInput) {
    return {
      categoryId: input.categoryId,
      title: input.title,
      appName: input.appName ?? null,
      logoUrl: input.logoUrl ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      bannerUrl: input.bannerUrl ?? null,
      shortDescription: input.shortDescription,
      description: input.description,
      features: asJson(input.features),
      instructions: asJson(input.instructions),
      requirements: asJson(input.requirements),
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
  async submitProof(userId: string, input: SubmitProofInput): Promise<SubmissionDto> {
    const offer = await this.repo.findOfferById(input.offerId);
    if (!offer || offer.status !== "PUBLISHED") throw new NotFoundError("Offer not found");

    const existing = await this.repo.findSubmission(input.offerId, userId);

    // ---- status / resubmit gating ----
    if (existing) {
      if (existing.status === "PENDING") {
        throw new ConflictError("Your proof for this offer is already under review");
      }
      if (existing.status === "APPROVED") {
        throw new ConflictError("You have already been rewarded for this offer");
      }
      if (existing.status === "REJECTED") {
        const allowed = await this.settings.getBoolean("submission.allowResubmitAfterReject");
        if (!allowed) throw new ConflictError("This offer can no longer be resubmitted");
      }
    }

    // ---- cap: maxUsers (only when this user is a NEW participant) ----
    if (!existing && offer.maxUsers !== null) {
      const participants = await this.repo.countDistinctParticipants(offer.id);
      if (participants >= offer.maxUsers) {
        throw new ConflictError("This offer has reached its participant limit");
      }
    }

    // ---- cap: dailyLimit (attempts for this offer today) ----
    if (offer.dailyLimit !== null) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const attemptsToday = await this.repo.countImagesForUserOfferSince(
        userId,
        offer.id,
        startOfDay,
      );
      if (attemptsToday >= offer.dailyLimit) {
        await this.repo.createFraudLog({
          userId,
          submissionId: existing?.id ?? null,
          type: "DAILY_LIMIT",
          score: 15,
          detail: `Exceeded daily limit (${offer.dailyLimit}) for "${offer.title}"`,
        });
        throw new ConflictError("You've reached today's submission limit for this offer");
      }
    }

    // ---- server-side hash + duplicate-image detection ----
    const maxBytes = (await this.settings.getNumber("submission.maxImageSizeMb")) * 1024 * 1024;
    let hashed: { hash: string; byteSize: number };
    try {
      hashed = await fetchAndHashImage(input.screenshotUrl, maxBytes);
    } catch (error) {
      throw new BadRequestError(
        error instanceof Error && error.message.includes("size")
          ? "Screenshot exceeds the maximum allowed size"
          : "Could not read the uploaded screenshot — please try again",
      );
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
        throw new ConflictError("This screenshot has already been used — upload a fresh one");
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

    return toSubmissionDto(submission);
  }

  /** The caller's submission for a specific offer (or null) — drives the
   *  inline status shown on the game detail screen. */
  async getMySubmissionForOffer(
    userId: string,
    offerId: string,
  ): Promise<SubmissionDto | null> {
    const submission = await this.repo.findSubmissionWithOffer(offerId, userId);
    return submission ? toSubmissionDto(submission) : null;
  }

  /** User cancels their own pending submission. */
  async cancelSubmission(userId: string, id: string): Promise<SubmissionDto> {
    const submission = await this.repo.findSubmissionById(id);
    if (!submission) throw new NotFoundError("Submission not found");
    if (submission.userId !== userId) throw new ForbiddenError();
    if (submission.status !== "PENDING") {
      throw new BadRequestError("Only a pending submission can be cancelled");
    }
    const cancelled = await this.repo.cancelSubmission(id);
    return toSubmissionDto(cancelled);
  }

  async listMySubmissions(
    userId: string,
    query: ListSubmissionsQuery,
  ): Promise<{ items: SubmissionDto[]; meta: PageMeta }> {
    const [items, total] = await this.repo.listSubmissionsByUser(userId, {
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items: items.map((s) => toSubmissionDto(s)), meta: buildMeta(query, total) };
  }

  async adminListSubmissions(
    query: ListSubmissionsQuery,
  ): Promise<{ items: SubmissionDto[]; meta: PageMeta }> {
    const [items, total] = await this.repo.listSubmissionsAdmin({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      status: query.status,
    });
    return { items: items.map((s) => toSubmissionDto(s, true)), meta: buildMeta(query, total) };
  }

  /** Admin approve (credits wallet), reject, or ask for more proof. */
  async reviewSubmission(
    id: string,
    reviewerId: string,
    input: ReviewSubmissionInput,
  ): Promise<SubmissionDto> {
    const submission = await this.repo.findSubmissionById(id);
    if (!submission) throw new NotFoundError("Submission not found");
    if (submission.status !== "PENDING") {
      throw new BadRequestError(`Submission has already been ${submission.status.toLowerCase()}`);
    }

    if (input.action === "APPROVE") {
      // Cap: maxRewards — refuse to approve past the offer's reward budget.
      const offer = await this.repo.findOfferById(submission.offerId);
      if (offer?.maxRewards != null) {
        const approvedCount = await this.repo.countApproved(submission.offerId);
        if (approvedCount >= offer.maxRewards) {
          throw new BadRequestError(
            `This offer has reached its reward cap (${offer.maxRewards}) and can't be approved`,
          );
        }
      }
      const approved = await this.repo.approveSubmission(id, reviewerId);
      await this.notifications.enqueue({
        userId: approved.userId,
        type: "WALLET",
        title: "Reward credited 🎉",
        body: `Your proof for "${approved.offer.title}" was approved and ${Number(
          approved.rewardAmount,
        ).toFixed(2)} was credited to your wallet.`,
        route: "/wallet",
      });
      return toSubmissionDto(approved);
    }

    if (input.action === "NEED_MORE_PROOF") {
      const updated = await this.repo.setReviewOutcome(
        id,
        "NEED_MORE_PROOF",
        reviewerId,
        input.reviewNote ?? null,
      );
      await this.notifications.enqueue({
        userId: updated.userId,
        type: "SYSTEM",
        title: "More proof needed",
        body: `Please add a clearer screenshot for "${updated.offer.title}".${
          input.reviewNote ? ` ${input.reviewNote}` : ""
        }`,
        route: "/games/submissions",
      });
      return toSubmissionDto(updated);
    }

    const rejected = await this.repo.setReviewOutcome(
      id,
      "REJECTED",
      reviewerId,
      input.reviewNote ?? null,
    );
    await this.notifications.enqueue({
      userId: rejected.userId,
      type: "SYSTEM",
      title: "Submission rejected",
      body: `Your proof for "${rejected.offer.title}" was rejected.${
        input.reviewNote ? ` ${input.reviewNote}` : ""
      }`,
      route: "/games/submissions",
    });
    return toSubmissionDto(rejected);
  }

  // ---- admin: fraud detection ----

  async fraudOverview(): Promise<FraudOverviewDto> {
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

  async analytics(query: AnalyticsQuery): Promise<OfferAnalyticsDto> {
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

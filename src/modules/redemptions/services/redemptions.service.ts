import { BadRequestError, ConflictError, NotFoundError } from "../../../common/errors.js";
import { buildMeta, toSkipTake } from "../../../common/pagination.js";
import type { PageMeta } from "../../../common/response.js";
import type { NotificationsService } from "../../notifications/services/notifications.service.js";
import type { NotificationJob } from "../../notifications/queues/notification.queue.js";
import type { SettingsService } from "../../settings/services/settings.service.js";
import type { RedemptionsRepository } from "../repositories/redemptions.repository.js";
import type { VoucherProvider } from "../providers/voucher-provider.js";
import {
  toRedemptionDto,
  toVoucherOfferDto,
  type AdminListRedemptionsQuery,
  type CreateRedemptionInput,
  type CreateVoucherOfferInput,
  type FulfillRedemptionInput,
  type ListMineQuery,
  type RedemptionConfigDto,
  type RedemptionDto,
  type ReviewRedemptionInput,
  type UpdateVoucherOfferInput,
  type VoucherOfferDto,
} from "../schemas/redemptions.schema.js";

export class RedemptionsService {
  constructor(
    private readonly repo: RedemptionsRepository,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    /** null = manual-fulfillment mode (no provider credentials configured). */
    private readonly provider: VoucherProvider | null,
  ) {}

  async getConfig(): Promise<RedemptionConfigDto> {
    const [enabled, minCoins] = await Promise.all([
      this.settings.getBoolean("redeem.enabled"),
      this.settings.getNumber("redeem.minCoins"),
    ]);
    return { enabled, minCoins };
  }

  /** User requests a redemption: coins are debited immediately (escrow). */
  async request(userId: string, input: CreateRedemptionInput): Promise<RedemptionDto> {
    const config = await this.getConfig();
    if (!config.enabled) throw new BadRequestError("Redemptions are currently disabled");

    let coins: number;
    let voucherOfferId: string | undefined;
    if (input.voucherOfferId) {
      const offer = await this.repo.findOfferById(input.voucherOfferId);
      if (!offer || !offer.isActive) throw new NotFoundError("Voucher offer not found");
      coins = offer.coinCost;
      voucherOfferId = offer.id;
    } else {
      coins = input.coins!;
      if (coins < config.minCoins) {
        throw new BadRequestError(`Minimum redemption is ${config.minCoins} coins`);
      }
    }

    // One-pending rule + balance check + debit all inside the transaction.
    const redemption = await this.repo.createRequest(userId, coins, voucherOfferId);
    return toRedemptionDto(redemption);
  }

  async listMine(
    userId: string,
    query: ListMineQuery,
  ): Promise<{ items: RedemptionDto[]; meta: PageMeta }> {
    const [items, total] = await this.repo.listByUser(userId, {
      ...toSkipTake(query),
      status: query.status,
    });
    return { items: items.map((r) => toRedemptionDto(r)), meta: buildMeta(query, total) };
  }

  async listAdmin(
    query: AdminListRedemptionsQuery,
  ): Promise<{ items: RedemptionDto[]; meta: PageMeta }> {
    const [items, total] = await this.repo.listAdmin({
      ...toSkipTake(query),
      status: query.status,
      userId: query.userId,
      search: query.search,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return { items: items.map((r) => toRedemptionDto(r, true)), meta: buildMeta(query, total) };
  }

  /**
   * Admin review. REJECT refunds the coins. APPROVE persists the approval
   * FIRST, then tries the provider (FULFILLED on success, stays APPROVED +
   * failReason on failure) — so a provider-issued voucher can never be lost
   * to a later DB write failing, and a crash mid-flow is re-fulfillable
   * manually instead of re-issuable.
   */
  async review(
    id: string,
    reviewerId: string,
    input: ReviewRedemptionInput,
  ): Promise<RedemptionDto> {
    const redemption = await this.repo.findById(id);
    if (!redemption) throw new NotFoundError("Redemption not found");
    if (redemption.status !== "PENDING") {
      throw new ConflictError(`Redemption has already been ${redemption.status.toLowerCase()}`);
    }

    if (input.action === "REJECT") {
      const rejected = await this.repo.rejectWithRefund(id, reviewerId, input.note ?? null);
      await this.safeNotify({
        userId: rejected.userId,
        type: "SYSTEM",
        title: "Redemption rejected",
        body: `Your redemption of ${Number(rejected.coins)} coins was rejected and the coins were refunded to your wallet.${
          input.note ? ` ${input.note}` : ""
        }`,
        route: "/wallet",
      });
      return toRedemptionDto(rejected, true);
    }

    // Persist the approval before any provider side effect (guarded: loses
    // cleanly if another admin already reviewed the row).
    const approved = await this.repo.guardedUpdate(id, ["PENDING"], {
      status: "APPROVED",
      note: input.note ?? null,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    });

    // A catalog item explicitly marked manual skips the provider even when
    // one is configured; legacy amount-only rows use the provider default.
    const offer = approved.voucherOfferId
      ? await this.repo.findOfferById(approved.voucherOfferId)
      : null;
    const useProvider =
      this.provider !== null && (offer ? offer.provider === this.provider.name : true);
    if (!useProvider) return toRedemptionDto(approved, true);

    try {
      const voucher = await this.provider!.issueVoucher({
        amount: offer ? Number(offer.denomination) : Number(approved.coins),
        brandId: offer?.providerBrandId ?? undefined,
        userEmail: approved.user.email,
        redemptionId: approved.id,
      });
      const fulfilled = await this.repo.guardedUpdate(id, ["APPROVED"], {
        status: "FULFILLED",
        provider: this.provider!.name,
        voucherCode: voucher.code,
        voucherUrl: voucher.url ?? null,
        providerRef: voucher.ref ?? null,
        failReason: null,
      });
      await this.notifyFulfilled(fulfilled.userId);
      return toRedemptionDto(fulfilled, true);
    } catch (error) {
      // Provider failed — keep the approval, queue for manual fulfillment.
      const reason = error instanceof Error ? error.message : String(error);
      const parked = await this.repo.guardedUpdate(id, ["APPROVED"], {
        provider: this.provider!.name,
        failReason: reason.slice(0, 1000),
      });
      return toRedemptionDto(parked, true);
    }
  }

  /** Super admin manually attaches a voucher to an APPROVED redemption. */
  async fulfill(
    id: string,
    reviewerId: string,
    input: FulfillRedemptionInput,
  ): Promise<RedemptionDto> {
    const fulfilled = await this.repo.guardedUpdate(id, ["APPROVED"], {
      status: "FULFILLED",
      provider: "manual",
      voucherCode: input.voucherCode,
      voucherUrl: input.voucherUrl ?? null,
      failReason: null,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    });
    await this.notifyFulfilled(fulfilled.userId);
    return toRedemptionDto(fulfilled, true);
  }

  // ---- Voucher catalog ----

  async listCatalog(): Promise<VoucherOfferDto[]> {
    return (await this.repo.listOffers(true)).map(toVoucherOfferDto);
  }

  async listCatalogAdmin(): Promise<VoucherOfferDto[]> {
    return (await this.repo.listOffers(false)).map(toVoucherOfferDto);
  }

  async createOffer(input: CreateVoucherOfferInput): Promise<VoucherOfferDto> {
    return toVoucherOfferDto(
      await this.repo.createOffer({
        ...input,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        providerBrandId: input.providerBrandId ?? null,
      }),
    );
  }

  async updateOffer(id: string, input: UpdateVoucherOfferInput): Promise<VoucherOfferDto> {
    const existing = await this.repo.findOfferById(id);
    if (!existing) throw new NotFoundError("Voucher offer not found");
    return toVoucherOfferDto(await this.repo.updateOffer(id, input));
  }

  async deleteOffer(id: string): Promise<void> {
    const existing = await this.repo.findOfferById(id);
    if (!existing) throw new NotFoundError("Voucher offer not found");
    await this.repo.deleteOffer(id);
  }

  /** Voucher codes stay OUT of push bodies (lock screens); route to My Coupons. */
  private notifyFulfilled(userId: string): Promise<void> {
    return this.safeNotify({
      userId,
      type: "WALLET",
      title: "Your voucher is ready 🎁",
      body: "Your redemption is complete — open My Coupons to view your voucher.",
      route: "/coupons",
    });
  }

  /** Best-effort: a Redis outage must never 500 an already-committed review. */
  private async safeNotify(input: NotificationJob): Promise<void> {
    try {
      await this.notifications.enqueue(input);
    } catch {
      /* push is best-effort */
    }
  }
}

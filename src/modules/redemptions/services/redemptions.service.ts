import { BadRequestError, ConflictError, NotFoundError } from "../../../common/errors.js";
import { buildMeta, toSkipTake, type PaginationQuery } from "../../../common/pagination.js";
import type { PageMeta } from "../../../common/response.js";
import type { NotificationsService } from "../../notifications/services/notifications.service.js";
import type { SettingsService } from "../../settings/services/settings.service.js";
import type { RedemptionsRepository } from "../repositories/redemptions.repository.js";
import type { VoucherProvider } from "../providers/voucher-provider.js";
import {
  toRedemptionDto,
  type AdminListRedemptionsQuery,
  type CreateRedemptionInput,
  type FulfillRedemptionInput,
  type RedemptionConfigDto,
  type RedemptionDto,
  type ReviewRedemptionInput,
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
    if (input.coins < config.minCoins) {
      throw new BadRequestError(`Minimum redemption is ${config.minCoins} coins`);
    }
    if (await this.repo.hasPending(userId)) {
      throw new ConflictError("You already have a pending redemption request");
    }

    // Balance is re-checked and debited atomically inside the transaction.
    const redemption = await this.repo.createRequest(userId, input.coins);
    return toRedemptionDto(redemption);
  }

  async listMine(
    userId: string,
    query: PaginationQuery,
  ): Promise<{ items: RedemptionDto[]; meta: PageMeta }> {
    const [items, total] = await this.repo.listByUser(userId, toSkipTake(query));
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
   * Admin review. REJECT refunds the coins. APPROVE issues a voucher via the
   * configured provider (FULFILLED on success, APPROVED + failReason on
   * provider failure) or lands on APPROVED awaiting manual fulfillment.
   */
  async review(
    id: string,
    reviewerId: string,
    input: ReviewRedemptionInput,
  ): Promise<RedemptionDto> {
    const redemption = await this.repo.findById(id);
    if (!redemption) throw new NotFoundError("Redemption not found");
    if (redemption.status !== "PENDING") {
      throw new BadRequestError(`Redemption has already been ${redemption.status.toLowerCase()}`);
    }

    if (input.action === "REJECT") {
      const rejected = await this.repo.rejectWithRefund(id, reviewerId, input.note ?? null);
      await this.notifications.enqueue({
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

    const reviewFields = {
      note: input.note ?? null,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    };

    if (!this.provider) {
      // Manual mode: approved, awaiting a super admin to enter the voucher.
      const approved = await this.repo.update(id, { status: "APPROVED", ...reviewFields });
      return toRedemptionDto(approved, true);
    }

    try {
      const voucher = await this.provider.issueVoucher({
        coins: Number(redemption.coins),
        userEmail: redemption.user.email,
        redemptionId: redemption.id,
      });
      const fulfilled = await this.repo.update(id, {
        status: "FULFILLED",
        provider: this.provider.name,
        voucherCode: voucher.code,
        voucherUrl: voucher.url ?? null,
        providerRef: voucher.ref ?? null,
        failReason: null,
        ...reviewFields,
      });
      await this.notifyFulfilled(fulfilled.userId, Number(fulfilled.coins), voucher.code);
      return toRedemptionDto(fulfilled, true);
    } catch (error) {
      // Provider failed — keep the approval, queue for manual fulfillment.
      const reason = error instanceof Error ? error.message : String(error);
      const approved = await this.repo.update(id, {
        status: "APPROVED",
        provider: this.provider.name,
        failReason: reason.slice(0, 1000),
        ...reviewFields,
      });
      return toRedemptionDto(approved, true);
    }
  }

  /** Super admin manually attaches a voucher to an APPROVED redemption. */
  async fulfill(
    id: string,
    reviewerId: string,
    input: FulfillRedemptionInput,
  ): Promise<RedemptionDto> {
    const redemption = await this.repo.findById(id);
    if (!redemption) throw new NotFoundError("Redemption not found");
    if (redemption.status !== "APPROVED") {
      throw new BadRequestError("Only an approved redemption can be fulfilled manually");
    }

    const fulfilled = await this.repo.update(id, {
      status: "FULFILLED",
      provider: "manual",
      voucherCode: input.voucherCode,
      voucherUrl: input.voucherUrl ?? null,
      failReason: null,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    });
    await this.notifyFulfilled(fulfilled.userId, Number(fulfilled.coins), input.voucherCode);
    return toRedemptionDto(fulfilled, true);
  }

  private notifyFulfilled(userId: string, coins: number, code: string): Promise<void> {
    return this.notifications.enqueue({
      userId,
      type: "WALLET",
      title: "Your voucher is ready 🎁",
      body: `Your redemption of ${coins} coins is complete. Voucher code: ${code}`,
      route: "/wallet",
    });
  }
}

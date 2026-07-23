import {
  VoucherProviderError,
  type IssueVoucherParams,
  type IssuedVoucher,
} from "./voucher-provider.js";
import { XoxodayClientProvider, type XoxodayClientOptions } from "./xoxoday-base.provider.js";

/**
 * Loose shape for the Plum order/voucher response. Field names are read
 * defensively (several fallbacks) because the exact envelope depends on the
 * Plum account's API version.
 */
interface PlumOrderResponse {
  data?: {
    placeOrder?: PlumOrderResult;
    order?: PlumOrderResult;
  };
  error?: string;
  message?: string;
}

interface PlumOrderResult {
  success?: number;
  message?: string;
  orderId?: string | number;
  orderNumber?: string | number;
  vouchers?: PlumVoucher[];
  data?: PlumVoucher[];
}

interface PlumVoucher {
  voucherCode?: string;
  code?: string;
  pin?: string;
  voucherNo?: string;
  activationUrl?: string;
  url?: string;
}

export interface XoxodayCodeOptions extends XoxodayClientOptions {}

/**
 * Xoxoday Plum gift-card **code** provider.
 *
 * Unlike {@link XoxodayPlumProvider} (which returns a claim link), this places
 * a Plum order for a specific product/SKU + denomination and returns an actual
 * voucher code the user redeems on the brand's site. `IssueVoucherParams`:
 *   - `campaignId` carries the catalog item's `providerBrandId` = Plum product
 *     ID / SKU (falls back to the configured default product id);
 *   - `amount` is the denomination (voucher face value);
 *   - `redemptionId` is sent as the order idempotency key so a retried approval
 *     can never place a duplicate paid order.
 *
 * VERIFY BEFORE GOING LIVE: the request envelope + response field names below
 * are modelled on the documented Plum GraphQL-style order API. Confirm them
 * against your Plum account's live docs/playground and adjust this one file if
 * they differ — everything else (auth, refresh, dispatch, DB) is provider
 * agnostic. Until real credentials are set the provider is never invoked, so
 * this shape cannot cause a wrong payout.
 */
export class XoxodayCodeProvider extends XoxodayClientProvider {
  readonly name = "xoxo_code";

  constructor(
    baseUrl: string,
    accessToken: string,
    private readonly defaultProductId: string,
    options: XoxodayCodeOptions = {},
  ) {
    super(baseUrl, accessToken, options);
  }

  async issueVoucher(params: IssueVoucherParams): Promise<IssuedVoucher> {
    const productId = params.campaignId?.trim() || this.defaultProductId.trim();
    if (!productId) {
      throw new VoucherProviderError("Xoxoday product/SKU ID is not configured for this voucher");
    }
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new VoucherProviderError("Xoxoday code order needs a positive denomination");
    }

    const response = await this.authorizedPost("api/order", {
      query: "xoxo.mutation.placeOrder",
      tag: "plumProPlaceOrder",
      variables: {
        data: {
          productId,
          denomination: params.amount,
          quantity: 1,
          // Idempotency: Plum de-dupes on the caller reference, so a retried
          // approval of the same redemption cannot place a second paid order.
          poNumber: params.redemptionId,
          notifyAdminLevel: 0,
        },
      },
    });

    const body = await this.readJson<PlumOrderResponse>(response, "place order");
    const order = body.data?.placeOrder ?? body.data?.order;
    if (!response.ok || !order || (order.success !== undefined && order.success !== 1)) {
      const detail = order?.message ?? body.message ?? body.error ?? "no message";
      throw new VoucherProviderError(
        `Xoxoday rejected the voucher order (HTTP ${response.status}): ${detail}`,
      );
    }

    const voucher = order.vouchers?.[0] ?? order.data?.[0];
    const code = (voucher?.voucherCode ?? voucher?.code ?? voucher?.pin ?? voucher?.voucherNo)
      ?.toString()
      .trim();
    if (!code) {
      throw new VoucherProviderError("Xoxoday order succeeded but returned no voucher code");
    }

    const url = (voucher?.activationUrl ?? voucher?.url)?.toString().trim();
    const ref = (order.orderId ?? order.orderNumber)?.toString();
    return { code, url: url || undefined, ref: ref || undefined };
  }
}

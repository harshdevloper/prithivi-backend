import {
  VoucherProviderError,
  type IssueVoucherParams,
  type IssuedVoucher,
} from "./voucher-provider.js";
import { XoxodayClientProvider, type XoxodayClientOptions } from "./xoxoday-base.provider.js";

interface PlumGenerateLinkResponse {
  data?: {
    generateLink?: {
      success?: number;
      message?: string;
      links?: string[];
      batchId?: string;
      campaignId?: string;
    };
  };
  error?: string;
  message?: string;
}

export interface XoxodayPlumOptions extends XoxodayClientOptions {
  linkExpiryDays?: number;
}

/**
 * Xoxoday Plum Reward **Link** provider.
 *
 * The provider uses a Plum dashboard campaign rather than a voucher brand.
 * `IssueVoucherParams.campaignId` is the catalog-specific campaign ID and the
 * constructor campaign is the fallback. Plum returns a claim URL (not a gift
 * card code), so user clients must treat `url` as the redeemable credential.
 * For actual gift-card codes see {@link XoxodayCodeProvider}.
 */
export class XoxodayPlumProvider extends XoxodayClientProvider {
  readonly name = "plum";

  private readonly linkExpiryDays: number;

  constructor(
    baseUrl: string,
    accessToken: string,
    private readonly defaultCampaignId: string,
    options: XoxodayPlumOptions = {},
  ) {
    super(baseUrl, accessToken, options);
    this.linkExpiryDays = options.linkExpiryDays ?? 90;
  }

  async issueVoucher(params: IssueVoucherParams): Promise<IssuedVoucher> {
    const campaignId = params.campaignId?.trim() || this.defaultCampaignId.trim();
    if (!campaignId) {
      throw new VoucherProviderError("Xoxoday Plum campaign ID is not configured");
    }

    const response = await this.authorizedPost("api/generateLink", {
      query: "xoxo_link.mutation.generateLink",
      tag: "xoxo_link",
      variables: {
        data: {
          campaignId,
          links_quantity: 1,
          link_expiry: this.expiryDate(),
        },
      },
    });

    const body = await this.readJson<PlumGenerateLinkResponse>(response, "generate link");
    const result = body.data?.generateLink;
    if (!response.ok || result?.success !== 1) {
      const detail = result?.message ?? body.message ?? body.error ?? "no message";
      throw new VoucherProviderError(
        `Xoxoday Plum rejected reward-link generation (HTTP ${response.status}): ${detail}`,
      );
    }

    const url = result.links?.[0]?.trim();
    if (!url) {
      throw new VoucherProviderError("Xoxoday Plum response contained no reward link");
    }

    try {
      new URL(url);
    } catch {
      throw new VoucherProviderError("Xoxoday Plum returned an invalid reward link");
    }

    return { url, ref: result.batchId };
  }

  private expiryDate(): string {
    const days = Math.max(1, Math.min(this.linkExpiryDays, 3650));
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${date.getUTCFullYear()}`;
  }
}

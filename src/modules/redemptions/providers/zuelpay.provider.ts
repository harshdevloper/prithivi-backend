import {
  VoucherProviderError,
  type IssueVoucherParams,
  type IssuedVoucher,
  type VoucherProvider,
} from "./voucher-provider.js";

/** Shape from ZuelPay's public product page (zuelpay.in/Gift_Voucher_API). */
interface ZuelPayIssueResponse {
  status: boolean;
  txn_id?: string;
  vouchers?: { code: string; pin?: string; expires_at?: string; redemption_url?: string }[];
  message?: string;
}

/**
 * ZuelPay Gift Voucher API — POST {base}/voucher/issue, Bearer API key.
 *
 * CAUTION: field names/casing come from ZuelPay's public marketing page, not
 * their gated API reference — verify against the real docs (console signup at
 * console.zuelpay.com) before going live. Absent env credentials the app runs
 * in manual-fulfillment mode and this class is never constructed.
 */
export class ZuelPayProvider implements VoucherProvider {
  readonly name = "zuelpay";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly brandId: string,
  ) {}

  async issueVoucher(params: IssueVoucherParams): Promise<IssuedVoucher> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/voucher/issue`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          brand_id: this.brandId,
          amount: params.coins,
          quantity: 1,
          ref_id: params.redemptionId, // ZuelPay idempotency reference
          recipient_email: params.userEmail,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new VoucherProviderError(
        timedOut ? "ZuelPay request timed out after 15s" : `ZuelPay request failed: ${String(error)}`,
      );
    }

    let body: ZuelPayIssueResponse;
    try {
      body = (await response.json()) as ZuelPayIssueResponse;
    } catch {
      throw new VoucherProviderError(`ZuelPay returned non-JSON response (HTTP ${response.status})`);
    }

    if (!response.ok || body.status !== true) {
      throw new VoucherProviderError(
        `ZuelPay rejected voucher issue (HTTP ${response.status}): ${body.message ?? "no message"}`,
      );
    }

    const voucher = body.vouchers?.[0];
    if (!voucher?.code) {
      throw new VoucherProviderError("ZuelPay response contained no voucher code");
    }

    return { code: voucher.code, url: voucher.redemption_url, ref: body.txn_id };
  }
}

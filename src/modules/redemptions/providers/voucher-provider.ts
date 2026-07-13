/** Thrown when the voucher provider rejects or fails an issue call. */
export class VoucherProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoucherProviderError";
  }
}

export interface IssueVoucherParams {
  /** Coin amount being redeemed — passed 1:1 as the voucher amount. */
  coins: number;
  userEmail: string;
  /** Our redemption id — sent as the provider's idempotency reference. */
  redemptionId: string;
}

export interface IssuedVoucher {
  code: string;
  url?: string;
  /** Provider-side transaction id, stored as providerRef. */
  ref?: string;
}

export interface VoucherProvider {
  readonly name: string;
  issueVoucher(params: IssueVoucherParams): Promise<IssuedVoucher>;
}

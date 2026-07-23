/** Thrown when the voucher provider rejects or fails an issue call. */
export class VoucherProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoucherProviderError";
  }
}

export interface IssueVoucherParams {
  /** Voucher face value: the catalog denomination, or coins 1:1 for legacy
   *  amount-only redemptions. */
  amount: number;
  /** Catalog-item Plum campaign ID; falls back to the provider default. */
  campaignId?: string;
  userEmail: string;
  /** Our redemption id — sent as the provider's idempotency reference. */
  redemptionId: string;
}

export interface IssuedVoucher {
  /** Traditional voucher providers return a code; Plum Reward Links do not. */
  code?: string;
  url?: string;
  /** Provider-side transaction id, stored as providerRef. */
  ref?: string;
}

export interface VoucherProvider {
  readonly name: string;
  issueVoucher(params: IssueVoucherParams): Promise<IssuedVoucher>;
}

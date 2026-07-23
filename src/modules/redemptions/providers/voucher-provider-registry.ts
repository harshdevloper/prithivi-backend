import { env } from "../../../config/env.js";
import type { SettingsService } from "../../settings/services/settings.service.js";
import type { VoucherProvider } from "./voucher-provider.js";
import type { XoxodayClientProvider, XoxodayClientOptions } from "./xoxoday-base.provider.js";
import { XoxodayPlumProvider } from "./xoxoday-plum.provider.js";
import { XoxodayCodeProvider } from "./xoxoday-code.provider.js";

export interface ResolvedXoxodayConfig {
  enabled: boolean;
  baseUrl: string;
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  defaultCampaignId: string;
  defaultProductId: string;
  linkExpiryDays: number;
  tokenStatePath?: string;
}

export interface ProviderStatus {
  /** Provider is enabled AND has an access token → can auto-issue. */
  configured: boolean;
  enabled: boolean;
  hasRefreshCredentials: boolean;
  baseUrl: string;
  /** Which catalog `provider` values will auto-issue right now. */
  activeProviders: string[];
}

/**
 * Builds voucher providers from the current admin settings (with env as the
 * fallback for any key an admin hasn't overridden). Providers are constructed
 * per issue attempt so a settings change takes effect without a redeploy; the
 * rotating-token state lives in a file, so per-call construction is cheap and
 * safe. `resolve()` returns null when Xoxoday isn't configured/enabled, which
 * routes the redemption to manual fulfillment.
 */
export class VoucherProviderRegistry {
  constructor(private readonly settings: SettingsService) {}

  async config(): Promise<ResolvedXoxodayConfig> {
    const str = async (key: string, fallback: string): Promise<string> => {
      const value = (await this.settings.getString(key)).trim();
      return value || fallback;
    };
    const linkExpiryRaw = await str("xoxoday.linkExpiryDays", String(env.XOXODAY_LINK_EXPIRY_DAYS));
    const linkExpiryDays = Number(linkExpiryRaw);

    return {
      enabled: await this.settings.getBoolean("xoxoday.enabled"),
      baseUrl: await str("xoxoday.baseUrl", env.XOXODAY_BASE_URL),
      accessToken: await str("xoxoday.accessToken", env.XOXODAY_ACCESS_TOKEN ?? ""),
      refreshToken: await str("xoxoday.refreshToken", env.XOXODAY_REFRESH_TOKEN ?? ""),
      clientId: await str("xoxoday.clientId", env.XOXODAY_CLIENT_ID ?? ""),
      clientSecret: await str("xoxoday.clientSecret", env.XOXODAY_CLIENT_SECRET ?? ""),
      defaultCampaignId: await str("xoxoday.defaultCampaignId", env.XOXODAY_CAMPAIGN_ID),
      defaultProductId: await str("xoxoday.defaultProductId", ""),
      linkExpiryDays: Number.isFinite(linkExpiryDays) ? linkExpiryDays : env.XOXODAY_LINK_EXPIRY_DAYS,
      tokenStatePath: env.XOXODAY_TOKEN_STATE_FILE,
    };
  }

  async status(): Promise<ProviderStatus> {
    const cfg = await this.config();
    const configured = cfg.enabled && Boolean(cfg.accessToken);
    return {
      configured,
      enabled: cfg.enabled,
      hasRefreshCredentials: Boolean(cfg.refreshToken && cfg.clientId && cfg.clientSecret),
      baseUrl: cfg.baseUrl,
      activeProviders: configured ? ["plum", "xoxo_code"] : [],
    };
  }

  /** Provider for a catalog item's `provider` value, or null → manual queue. */
  async resolve(name: string): Promise<VoucherProvider | null> {
    if (name === "manual") return null;
    const cfg = await this.config();
    if (!cfg.enabled || !cfg.accessToken) return null;
    return this.build(name, cfg);
  }

  /**
   * Verifies the current credentials against Xoxoday for the admin "Test
   * connection" action. Uses the code provider's shared auth layer.
   */
  async test(): Promise<{ ok: boolean; message: string }> {
    const cfg = await this.config();
    if (!cfg.enabled) {
      return { ok: false, message: "Xoxoday is disabled. Enable it before testing." };
    }
    if (!cfg.accessToken) {
      return { ok: false, message: "No Xoxoday access token configured." };
    }
    const provider = this.build("xoxo_code", cfg) as XoxodayClientProvider;
    return provider.verifyCredentials();
  }

  private build(name: string, cfg: ResolvedXoxodayConfig): VoucherProvider | null {
    const options: XoxodayClientOptions = {
      refreshToken: cfg.refreshToken || undefined,
      clientId: cfg.clientId || undefined,
      clientSecret: cfg.clientSecret || undefined,
      tokenStatePath: cfg.tokenStatePath,
    };
    if (name === "plum") {
      return new XoxodayPlumProvider(cfg.baseUrl, cfg.accessToken, cfg.defaultCampaignId, {
        ...options,
        linkExpiryDays: cfg.linkExpiryDays,
      });
    }
    if (name === "xoxo_code") {
      return new XoxodayCodeProvider(cfg.baseUrl, cfg.accessToken, cfg.defaultProductId, options);
    }
    return null;
  }
}

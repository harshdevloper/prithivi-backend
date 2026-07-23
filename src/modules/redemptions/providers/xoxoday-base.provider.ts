import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  VoucherProviderError,
  type IssueVoucherParams,
  type IssuedVoucher,
  type VoucherProvider,
} from "./voucher-provider.js";

interface XoxodayRefreshResponse {
  access_token?: string;
  refresh_token?: string;
  data?: { access_token?: string; refresh_token?: string };
  error?: string;
  error_description?: string;
  message?: string;
}

export interface XoxodayClientOptions {
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  /** Optional persistent-disk file used to survive Plum refresh-token rotation. */
  tokenStatePath?: string;
  fetchFn?: typeof fetch;
}

/**
 * Shared Xoxoday (Plum) OAuth + HTTP machinery for every Xoxoday voucher
 * provider. Both the reward-link and the gift-card-code providers authenticate
 * against the same Plum account, so token acquisition, the documented
 * refresh-token rotation flow (`/token/user`), the persistent token-state file,
 * timeouts and JSON parsing all live here once.
 *
 * Subclasses implement only `name` + `issueVoucher`, using `authorizedPost()`
 * for calls that need a Bearer token and auto-refresh-on-401.
 */
export abstract class XoxodayClientProvider implements VoucherProvider {
  abstract readonly name: string;
  abstract issueVoucher(params: IssueVoucherParams): Promise<IssuedVoucher>;

  protected accessToken: string;
  protected refreshToken?: string;
  protected readonly fetchFn: typeof fetch;
  private refreshInFlight: Promise<void> | null = null;
  private tokenStateLoadInFlight: Promise<void> | null = null;

  constructor(
    protected readonly baseUrl: string,
    accessToken: string,
    protected readonly options: XoxodayClientOptions = {},
  ) {
    this.accessToken = accessToken;
    this.refreshToken = options.refreshToken;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  /**
   * POST a JSON `body` to `${baseUrl}/${pathSuffix}` with Bearer auth. On a
   * 401/403 it runs the refresh-token flow once and retries with the new token.
   */
  protected async authorizedPost(pathSuffix: string, body: unknown): Promise<Response> {
    await this.loadTokenState();
    let response = await this.postJson(pathSuffix, body);
    if ((response.status === 401 || response.status === 403) && this.canRefresh()) {
      await this.refreshAccessToken();
      response = await this.postJson(pathSuffix, body);
    }
    return response;
  }

  /**
   * Lightweight credential check for the admin "Test connection" action. When
   * refresh credentials are present it exercises the (verified) `/token/user`
   * refresh endpoint — the strongest proof the base URL + client id/secret +
   * refresh token all line up. Note this consumes+rotates the refresh token,
   * but the rotated pair is persisted, so subsequent issue calls stay valid.
   */
  async verifyCredentials(): Promise<{ ok: boolean; message: string }> {
    await this.loadTokenState();
    if (this.canRefresh()) {
      try {
        await this.refreshAccessToken();
        return {
          ok: true,
          message: "Refreshed the access token successfully — Xoxoday credentials are valid.",
        };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    }
    if (this.accessToken.trim()) {
      return {
        ok: true,
        message:
          "Access token is set. Refresh credentials (client id/secret + refresh token) are not " +
          "configured, so validity can only be confirmed the next time a voucher is issued.",
      };
    }
    return { ok: false, message: "No Xoxoday access token is configured." };
  }

  private postJson(pathSuffix: string, body: unknown): Promise<Response> {
    return this.request(`${this.normalizedBaseUrl()}/${pathSuffix.replace(/^\/+/, "")}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });
  }

  protected canRefresh(): boolean {
    return Boolean(this.refreshToken && this.options.clientId && this.options.clientSecret);
  }

  private refreshAccessToken(): Promise<void> {
    this.refreshInFlight ??= this.doRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<void> {
    if (!this.canRefresh()) {
      throw new VoucherProviderError(
        "Xoxoday access token expired; refresh is not configured",
      );
    }

    const response = await this.request(`${this.normalizedBaseUrl()}/token/user`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
      }),
    });
    const body = await this.readJson<XoxodayRefreshResponse>(response, "refresh token");
    const accessToken = body.access_token ?? body.data?.access_token;
    const refreshToken = body.refresh_token ?? body.data?.refresh_token;

    if (!response.ok || !accessToken) {
      const detail = body.error_description ?? body.message ?? body.error ?? "no message";
      throw new VoucherProviderError(
        `Xoxoday token refresh failed (HTTP ${response.status}): ${detail}`,
      );
    }

    this.accessToken = accessToken;
    if (refreshToken) this.refreshToken = refreshToken;
    await this.persistTokenState();
  }

  /**
   * Plum rotates refresh tokens. A persistent state file prevents a later
   * process restart from falling back to the now-stale token in configuration.
   * The file belongs on a private persistent server disk.
   */
  private loadTokenState(): Promise<void> {
    if (!this.options.tokenStatePath) return Promise.resolve();
    this.tokenStateLoadInFlight ??= this.doLoadTokenState();
    return this.tokenStateLoadInFlight;
  }

  private async doLoadTokenState(): Promise<void> {
    const statePath = this.options.tokenStatePath;
    if (!statePath) return;
    try {
      const state = JSON.parse(await readFile(statePath, "utf8")) as {
        accessToken?: unknown;
        refreshToken?: unknown;
      };
      if (typeof state.accessToken === "string" && state.accessToken.trim()) {
        this.accessToken = state.accessToken;
      }
      if (typeof state.refreshToken === "string" && state.refreshToken.trim()) {
        this.refreshToken = state.refreshToken;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw new VoucherProviderError(
        `Could not read Xoxoday token state: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async persistTokenState(): Promise<void> {
    const statePath = this.options.tokenStatePath;
    if (!statePath) return;
    const directory = path.dirname(statePath);
    const temporaryPath = `${statePath}.${process.pid}.tmp`;
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(
        temporaryPath,
        JSON.stringify({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          updatedAt: new Date().toISOString(),
        }),
        { encoding: "utf8", mode: 0o600 },
      );
      await rename(temporaryPath, statePath);
    } catch (error) {
      throw new VoucherProviderError(
        `Could not persist rotated Xoxoday tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  protected normalizedBaseUrl(): string {
    return this.baseUrl.replace(/\/+$/, "");
  }

  protected async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchFn(url, { ...init, signal: AbortSignal.timeout(15_000) });
    } catch (error) {
      const timedOut =
        error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      throw new VoucherProviderError(
        timedOut
          ? "Xoxoday request timed out after 15s"
          : `Xoxoday request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  protected async readJson<T>(response: Response, operation: string): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch {
      throw new VoucherProviderError(
        `Xoxoday returned non-JSON during ${operation} (HTTP ${response.status})`,
      );
    }
  }
}

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { XoxodayPlumProvider } from "./xoxoday-plum.provider.js";

const issueParams = {
  amount: 100,
  userEmail: "player@example.com",
  redemptionId: "redemption-1",
};

describe("XoxodayPlumProvider", () => {
  it("generates one reward link with the catalog campaign", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              generateLink: {
                success: 1,
                links: ["https://plum.example/claim/abc"],
                batchId: "batch-1",
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const provider = new XoxodayPlumProvider(
      "https://accounts.xoxoday.com/chef/v1/oauth/",
      "access-token",
      "default-campaign",
      { fetchFn, linkExpiryDays: 30 },
    );

    await expect(
      provider.issueVoucher({ ...issueParams, campaignId: "campaign-42" }),
    ).resolves.toEqual({ url: "https://plum.example/claim/abc", ref: "batch-1" });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://accounts.xoxoday.com/chef/v1/oauth/api/generateLink");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer access-token");
    const payload = JSON.parse(String(init?.body));
    expect(payload).toMatchObject({
      query: "xoxo_link.mutation.generateLink",
      tag: "xoxo_link",
      variables: { data: { campaignId: "campaign-42", links_quantity: 1 } },
    });
    expect(payload.variables.data.link_expiry).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });

  it("refreshes an expired access token once and retries", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "expired" }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "new-access", refresh_token: "new-refresh" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { generateLink: { success: 1, links: ["https://plum.example/claim/new"] } },
          }),
          { status: 200 },
        ),
      );
    const provider = new XoxodayPlumProvider(
      "https://accounts.xoxoday.com/chef/v1/oauth",
      "old-access",
      "campaign-1",
      {
        refreshToken: "old-refresh",
        clientId: "client",
        clientSecret: "secret",
        fetchFn,
      },
    );

    await expect(provider.issueVoucher(issueParams)).resolves.toMatchObject({
      url: "https://plum.example/claim/new",
    });
    expect(fetchFn.mock.calls[1][0]).toBe("https://accounts.xoxoday.com/chef/v1/oauth/token/user");
    expect((fetchFn.mock.calls[2][1]?.headers as Record<string, string>).authorization).toBe(
      "Bearer new-access",
    );
  });

  it("rejects a successful response that has no claim link", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ data: { generateLink: { success: 1, links: [] } } }), {
          status: 200,
        }),
    );
    const provider = new XoxodayPlumProvider("https://example.com", "token", "campaign", {
      fetchFn,
    });

    await expect(provider.issueVoucher(issueParams)).rejects.toThrow(
      "response contained no reward link",
    );
  });

  it("persists the rotated token pair for server restarts", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "money-marathon-plum-"));
    const tokenStatePath = path.join(directory, "tokens.json");
    try {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response("{}", { status: 401 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: "persisted-access",
              refresh_token: "persisted-refresh",
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: { generateLink: { success: 1, links: ["https://plum.example/claim/saved"] } },
            }),
            { status: 200 },
          ),
        );
      const provider = new XoxodayPlumProvider(
        "https://accounts.xoxoday.com/chef/v1/oauth",
        "expired-access",
        "campaign",
        {
          refreshToken: "old-refresh",
          clientId: "client",
          clientSecret: "secret",
          tokenStatePath,
          fetchFn,
        },
      );

      await provider.issueVoucher(issueParams);
      const state = JSON.parse(await readFile(tokenStatePath, "utf8"));
      expect(state).toMatchObject({
        accessToken: "persisted-access",
        refreshToken: "persisted-refresh",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

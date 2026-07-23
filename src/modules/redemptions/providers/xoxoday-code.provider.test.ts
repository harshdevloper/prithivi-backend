import { describe, expect, it, vi } from "vitest";
import { XoxodayCodeProvider } from "./xoxoday-code.provider.js";

const issueParams = {
  amount: 500,
  userEmail: "player@example.com",
  redemptionId: "redemption-9",
};

const orderOk = (code: string) =>
  new Response(
    JSON.stringify({
      data: {
        placeOrder: {
          success: 1,
          orderId: "ord-1",
          vouchers: [{ voucherCode: code, activationUrl: "https://xoxo.example/redeem/1" }],
        },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

describe("XoxodayCodeProvider", () => {
  it("places an order and returns the gift-card code with the catalog product id", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => orderOk("AMZN-123"));
    const provider = new XoxodayCodeProvider(
      "https://accounts.xoxoday.com/chef/v1/oauth/",
      "access-token",
      "default-product",
      { fetchFn },
    );

    await expect(
      provider.issueVoucher({ ...issueParams, campaignId: "prod-42" }),
    ).resolves.toEqual({
      code: "AMZN-123",
      url: "https://xoxo.example/redeem/1",
      ref: "ord-1",
    });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://accounts.xoxoday.com/chef/v1/oauth/api/order");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer access-token");
    const payload = JSON.parse(String(init?.body));
    expect(payload.variables.data).toMatchObject({
      productId: "prod-42",
      denomination: 500,
      quantity: 1,
      poNumber: "redemption-9", // idempotency key
    });
  });

  it("falls back to the default product id and rejects an order with no code", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ data: { placeOrder: { success: 1, vouchers: [] } } }), {
          status: 200,
        }),
    );
    const provider = new XoxodayCodeProvider("https://example.com", "token", "default-product", {
      fetchFn,
    });

    await expect(provider.issueVoucher(issueParams)).rejects.toThrow("no voucher code");
    expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body)).variables.data.productId).toBe(
      "default-product",
    );
  });

  it("refreshes an expired access token once, then retries the order", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "expired" }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "new-access", refresh_token: "new-refresh" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(orderOk("NEW-CODE"));
    const provider = new XoxodayCodeProvider(
      "https://accounts.xoxoday.com/chef/v1/oauth",
      "old-access",
      "prod-1",
      { refreshToken: "old-refresh", clientId: "client", clientSecret: "secret", fetchFn },
    );

    await expect(provider.issueVoucher(issueParams)).resolves.toMatchObject({ code: "NEW-CODE" });
    expect(fetchFn.mock.calls[1][0]).toBe("https://accounts.xoxoday.com/chef/v1/oauth/token/user");
    expect((fetchFn.mock.calls[2][1]?.headers as Record<string, string>).authorization).toBe(
      "Bearer new-access",
    );
  });
});

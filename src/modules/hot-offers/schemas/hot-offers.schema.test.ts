import { describe, expect, it } from "vitest";
import { upsertOfferSchema } from "./hot-offers.schema.js";

const accepts = (playStoreUrl: string): boolean =>
  upsertOfferSchema.safeParse({
    categoryId: "00000000-0000-4000-8000-000000000001",
    title: "Try Zepto",
    shortDescription: "Order groceries",
    description: "Order groceries",
    rewardAmount: 50,
    playStoreUrl,
  }).success;

describe("upsertOfferSchema offer link", () => {
  it("accepts Play Store and any other web link", () => {
    expect(accepts("https://play.google.com/store/apps/details?id=com.zepto")).toBe(true);
    expect(accepts("https://zepto.onelink.me/abc?pid=reward")).toBe(true);
    expect(accepts("http://example.com/offer")).toBe(true);
  });

  it("rejects script and non-web schemes", () => {
    expect(accepts("javascript:alert(1)")).toBe(false);
    expect(accepts("data:text/html,hi")).toBe(false);
    expect(accepts("ftp://example.com/app.apk")).toBe(false);
    expect(accepts("not a url")).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { HotOffersRepository } from "./hot-offers.repository.js";

describe("mobile offer queries", () => {
  it("filters completion in SQL and reads only the current page's card/proof fields", async () => {
    const findMany = vi.fn(async (_args: unknown) => [
      { id: "offer", submissions: [{ id: "proof" }] },
    ]);
    const count = vi.fn(async () => 1);
    const repo = new HotOffersRepository({ offer: { findMany, count } } as unknown as PrismaClient);
    const [cards, total] = await repo.listOfferCards(
      { page: 2, limit: 10, sort: "priority" },
      "alice",
    );
    const args = findMany.mock.calls[0]![0] as unknown as Record<string, any>;
    expect(args.where.NOT).toEqual({
      completedBehavior: "HIDE",
      submissions: { some: { userId: "alice", status: "APPROVED" } },
    });
    expect(args.select.submissions).toEqual({
      where: { userId: "alice", status: "APPROVED" },
      select: { id: true },
      take: 1,
    });
    expect(args.select.description).toBeUndefined();
    expect(args.select.instructions).toBeUndefined();
    expect(args.select.terms).toBeUndefined();
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(count).toHaveBeenCalledWith({ where: args.where });
    expect(cards[0]?.completed).toBe(true);
    expect(total).toBe(1);
  });

  it("anonymous lists never query user submissions and use a deterministic tie-breaker", async () => {
    const findMany = vi.fn(async (_args: unknown) => []);
    const repo = new HotOffersRepository({
      offer: { findMany, count: vi.fn(async () => 0) },
    } as unknown as PrismaClient);
    await repo.listOfferCards({ page: 1, limit: 10, sort: "reward" });
    const args = findMany.mock.calls[0]![0] as Record<string, any>;
    expect(args.select.submissions).toBeUndefined();
    expect(args.where.NOT).toBeUndefined();
    expect(args.orderBy.at(-1)).toEqual({ id: "asc" });
  });
});

describe("admin proof queue", () => {
  const setup = () => {
    const findMany = vi.fn(async (_args: unknown) => []);
    const count = vi.fn(async () => 14);
    const findUnique = vi.fn(async () => ({ id: "proof", images: [{ url: "original" }] }));
    const queryRaw = vi.fn(async (_query: unknown) => []);
    const repo = new HotOffersRepository({
      offerSubmission: { findMany, count, findUnique },
      $queryRaw: queryRaw,
    } as unknown as PrismaClient);
    return { repo, findMany, count, findUnique, queryRaw };
  };

  it("the badge only counts rows and does not retrieve users or image history", async () => {
    const { repo, count, findMany } = setup();
    expect(await repo.countSubmissionsAdmin({ status: "PENDING", isProduct: false })).toBe(14);
    expect(count).toHaveBeenCalledWith({ where: { status: "PENDING", offer: { isProduct: false } } });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("limits previews, keeps exact image counts, and uses stable indexed pagination", async () => {
    const { repo, findMany, count, queryRaw } = setup();
    await repo.listSubmissionsAdmin({ skip: 10, take: 10, status: "PENDING", isProduct: false, preview: true });
    const query = queryRaw.mock.calls[0]![0] as { sql: string; values: unknown[] };
    expect(query.sql).toContain("LIMIT 3");
    expect(query.sql).toContain('i."submissionId" = page."id"');
    expect(query.sql).toContain('ORDER BY page."status" ASC, page."createdAt" DESC, page."id" ASC');
    expect(query.values).toEqual(["PENDING", false, 10, 10]);
    expect(query.sql).not.toContain("PENDING");
    expect(findMany).not.toHaveBeenCalled();
    expect(count).toHaveBeenCalledWith({ where: { status: "PENDING", offer: { isProduct: false } } });
  });

  it("keeps legacy full lists and on-demand details complete", async () => {
    const { repo, findMany, findUnique } = setup();
    await repo.listSubmissionsAdmin({ skip: 0, take: 10 });
    const args = findMany.mock.calls[0]![0] as Record<string, any>;
    expect(args.include.images.take).toBeUndefined();
    expect((await repo.findSubmissionDetails("proof"))?.images).toHaveLength(1);
    const details = findUnique.mock.calls[0] as unknown as [{ include: { images: { take?: number } } }];
    expect(details[0].include.images.take).toBeUndefined();
  });
});

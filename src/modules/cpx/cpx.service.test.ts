import { Prisma, type PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { Env } from "../../config/env.js";
import type { NotificationsService } from "../notifications/services/notifications.service.js";
import type { SettingsService } from "../settings/services/settings.service.js";
import { CpxService, md5, type CpxPostbackQuery } from "./cpx.service.js";

const SECRET = "s3cret";

/** Just enough in-memory Prisma for the postback path. */
const fakePrisma = () => {
  const rows = new Map<string, { transId: string; userId: string; status: string; coins: Prisma.Decimal }>();
  let balance = new Prisma.Decimal(0);
  const ledger: string[] = [];
  const tx = {
    cpxTransaction: {
      create: async ({ data }: { data: { transId: string; userId: string; status: string; coins: Prisma.Decimal } }) => {
        if (rows.has(data.transId)) {
          throw new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" });
        }
        rows.set(data.transId, { ...data });
      },
      findUnique: async ({ where }: { where: { transId: string } }) => rows.get(where.transId) ?? null,
      updateMany: async ({ where, data }: { where: { transId: string; status: string }; data: { status: string } }) => {
        const row = rows.get(where.transId);
        if (!row || row.status !== where.status) return { count: 0 };
        row.status = data.status;
        return { count: 1 };
      },
    },
    wallet: {
      upsert: async () => ({ id: "w1" }),
      update: async ({ data }: { data: { balance: { increment?: Prisma.Decimal; decrement?: Prisma.Decimal } } }) => {
        balance = data.balance.increment ? balance.add(data.balance.increment) : balance.sub(data.balance.decrement!);
        return { balance };
      },
    },
    walletTransaction: {
      create: async ({ data }: { data: { type: string; amount: Prisma.Decimal } }) => {
        ledger.push(`${data.type} ${data.amount.toString()}`);
      },
    },
    user: { findUnique: async ({ where }: { where: { id: string } }) => (where.id === "u1" ? { id: "u1" } : null) },
  };
  const prisma = { ...tx, $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) };
  return { prisma: prisma as unknown as PrismaClient, ledger, balance: () => balance.toNumber() };
};

const service = (prisma: PrismaClient) =>
  new CpxService(
    prisma,
    {
      getBoolean: async () => true,
      getString: async (key: string) => (key === "cpx.appId" ? "123" : SECRET),
    } as unknown as SettingsService,
    { enqueue: async () => {} } as unknown as NotificationsService,
    {} as Env,
  );

const pb = (over: Partial<CpxPostbackQuery> = {}): CpxPostbackQuery => ({
  status: 1,
  trans_id: "t1",
  user_id: "u1",
  amount_local: 50,
  hash: md5(`t1-${SECRET}`),
  ...over,
});

describe("CPX postback", () => {
  it("rejects a forged hash without touching the wallet", async () => {
    const f = fakePrisma();
    await expect(service(f.prisma).postback(pb({ hash: md5("t1-wrong") }))).rejects.toMatchObject({ statusCode: 403 });
    expect(f.ledger).toEqual([]);
  });

  it("credits once, ignores the retry, and reverses exactly once", async () => {
    const f = fakePrisma();
    const cpx = service(f.prisma);
    expect(await cpx.postback(pb())).toBe("credited");
    expect(await cpx.postback(pb())).toBe("duplicate");
    expect(await cpx.postback(pb({ status: 2 }))).toBe("reversed");
    expect(await cpx.postback(pb({ status: 2 }))).toBe("duplicate");
    expect(f.ledger).toEqual(["CREDIT 50", "DEBIT 50"]);
    expect(f.balance()).toBe(0);
  });

  it("a reversal that arrives first blocks the late credit", async () => {
    const f = fakePrisma();
    const cpx = service(f.prisma);
    expect(await cpx.postback(pb({ status: 2 }))).toBe("reversed");
    expect(await cpx.postback(pb())).toBe("duplicate");
    expect(f.ledger).toEqual([]);
  });

  it("signs the wall URL with md5(userId-secret)", async () => {
    const { url } = await service(fakePrisma().prisma).wall("u1");
    expect(url).toContain(`secure_hash=${md5(`u1-${SECRET}`)}`);
    expect(url).toContain("app_id=123");
  });
});

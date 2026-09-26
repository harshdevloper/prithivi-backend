/** Read-only comparison against DATABASE_URL; prints timings/counts, never proof or user data. */
import "dotenv/config";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { isDeepStrictEqual } from "node:util";
import { PrismaClient } from "@prisma/client";
import { HotOffersRepository } from "../src/modules/hot-offers/repositories/hot-offers.repository.js";
import { toSubmissionDto } from "../src/modules/hot-offers/schemas/submissions.schema.js";

const prisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
let statements = 0;
prisma.$on("query", () => { statements += 1; });
const repo = new HotOffersRepository(prisma);

async function main(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  for (const filter of [
    { status: "PENDING" as const, skip: 0 },
    { status: "PENDING" as const, skip: 10 },
    { isProduct: false, skip: 0 },
    { isProduct: true, skip: 0 },
    { skip: 0 },
  ]) {
    const params = { ...filter, take: 10 };
    statements = 0;
    const before = performance.now();
    const [full, total] = await repo.listSubmissionsAdmin(params);
    const fullMs = performance.now() - before;
    const fullStatements = statements;
    statements = 0;
    const start = performance.now();
    const [compact, compactTotal] = await repo.listSubmissionsAdmin({ ...params, preview: true });
    const compactMs = performance.now() - start;
    const compactStatements = statements;
    const originals = full.map((item) => toSubmissionDto(item, true));
    const previews = compact.map((item) => toSubmissionDto(item, true));
    assert.equal(compactTotal, total);
    const expected = originals.map((item) => ({
      ...item,
      screenshotUrls: item.screenshotUrls.slice(0, 3),
      screenshotCount: Math.max(1, item.screenshotUrls.length),
    }));
    if (!isDeepStrictEqual(previews, expected)) {
      console.error(JSON.stringify({ mismatchedFields: expected.map((row, index) =>
        Object.keys(row).filter((key) => !isDeepStrictEqual(
          row[key as keyof typeof row], previews[index]?.[key as keyof typeof row],
        )),
      ) }));
    }
    assert.deepEqual(previews, expected);
    console.log(JSON.stringify({
      filter, rows: compact.length, total,
      fullMs: Math.round(fullMs), compactMs: Math.round(compactMs),
      fullStatements, compactStatements,
      fullBytes: Buffer.byteLength(JSON.stringify(originals)),
      compactBytes: Buffer.byteLength(JSON.stringify(previews)),
      matching: true,
    }));
  }
}

main().catch((error: unknown) => {
  // Assertion diffs can contain sensitive proof data; only report the error class.
  console.error(`Verification failed: ${error instanceof Error ? error.name : "unknown error"}`);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());

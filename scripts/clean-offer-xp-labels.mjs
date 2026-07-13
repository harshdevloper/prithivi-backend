// One-off: XP was removed from the platform, but legacy Offer.rewardLabel still says things
// like "50 + 500 XP". Null the label so the UI falls back to the numeric coin reward.
// Reward *values* (rewardAmount / rewardCoins) are left untouched.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const where = { rewardLabel: { contains: "XP", mode: "insensitive" } };

const before = await prisma.offer.findMany({ where, select: { id: true, rewardLabel: true } });
for (const o of before) console.log(`  ${o.id}  ${JSON.stringify(o.rewardLabel)} -> null`);

const { count } = await prisma.offer.updateMany({ where, data: { rewardLabel: null } });
console.log(`Cleared rewardLabel on ${count} offers`);

const left = await prisma.offer.count({ where });
if (left !== 0) throw new Error(`Expected 0 offers with XP labels, found ${left}`);
console.log("Verified: no Offer.rewardLabel contains XP");

await prisma.$disconnect();

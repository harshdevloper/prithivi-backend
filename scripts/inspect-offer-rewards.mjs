// Read-only: dump every Offer's reward fields to spot legacy XP text in rewardLabel.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const offers = await prisma.offer.findMany({
  select: { id: true, title: true, rewardAmount: true, rewardCoins: true, rewardLabel: true },
  orderBy: { createdAt: "asc" },
});

console.table(
  offers.map((o) => ({
    id: o.id,
    title: o.title,
    rewardAmount: o.rewardAmount.toString(),
    rewardCoins: o.rewardCoins,
    rewardLabel: o.rewardLabel,
    hasXP: /xp/i.test(o.rewardLabel ?? ""),
  })),
);
console.log(
  `${offers.length} offers, ${offers.filter((o) => /xp/i.test(o.rewardLabel ?? "")).length} with "XP" in rewardLabel`,
);

await prisma.$disconnect();

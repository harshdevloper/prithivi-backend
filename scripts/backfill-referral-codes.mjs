// One-off: assign a unique 8-char referral code to every user missing one.
import { PrismaClient } from "@prisma/client";
import { randomInt } from "node:crypto";

const prisma = new PrismaClient();
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const code = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

const users = await prisma.user.findMany({ where: { referralCode: null }, select: { id: true } });
let done = 0;
for (const { id } of users) {
  for (;;) {
    try {
      await prisma.user.update({ where: { id }, data: { referralCode: code() } });
      done++;
      break;
    } catch (e) {
      if (e?.code !== "P2002") throw e; // retry only on unique collision
    }
  }
}
console.log(`Backfilled ${done} of ${users.length} users`);
await prisma.$disconnect();

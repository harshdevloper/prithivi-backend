import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const main = async (): Promise<void> => {
  const baseUrl = "https://moneymarathon.in/";
  const rewardsUrl = "https://moneymarathon.in/rewards";

  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: "web.baseUrl" },
      create: { key: "web.baseUrl", value: baseUrl },
      update: { value: baseUrl },
    }),
    prisma.feedbackPage.updateMany({
      where: { category: { slug: "feedback-zone" } },
      data: { websiteUrl: rewardsUrl },
    }),
  ]);

  console.log(`Website domain updated to ${baseUrl}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

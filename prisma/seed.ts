import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@rewardhub.local";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "RewardHub Admin";

/** Idempotent Hot Offers content so every layer has data to render in dev. */
const seedHotOffers = async (): Promise<void> => {
  const categories = [
    {
      slug: "feedback-zone",
      title: "Feedback Zone",
      subtitle: "Test apps, share feedback, earn rewards",
      priority: 100,
      featured: true,
    },
    {
      slug: "gaming-offers",
      title: "Gaming Offers",
      subtitle: "Play new games and level up your earnings",
      priority: 90,
    },
    {
      slug: "survey-offers",
      title: "Survey Offers",
      subtitle: "Quick surveys, instant reward points",
      priority: 80,
    },
    {
      slug: "cashback-offers",
      title: "Cashback Offers",
      subtitle: "Shop and get a slice back",
      priority: 70,
    },
  ];

  for (const category of categories) {
    await prisma.offerCategory.upsert({
      where: { slug: category.slug },
      create: { ...category, status: "PUBLISHED" },
      update: {},
    });
  }

  const feedbackZone = await prisma.offerCategory.findUniqueOrThrow({
    where: { slug: "feedback-zone" },
  });

  await prisma.feedbackPage.upsert({
    where: { categoryId: feedbackZone.id },
    create: {
      categoryId: feedbackZone.id,
      title: "Feedback Zone",
      description:
        "Install hand-picked apps, use them for a few minutes and share your honest " +
        "feedback. Every completed review earns you reward points.",
      benefits: [
        "Fresh offers added every week",
        "Rewards credited after review",
        "No purchase required",
      ],
      rewardPoints: 500,
      buttonText: "Explore offers",
      websiteUrl: "http://localhost:5174/", // dev URL of rewardhub/web; replace in prod
      status: "PUBLISHED",
    },
    update: {},
  });

  const gaming = await prisma.offerCategory.findUniqueOrThrow({
    where: { slug: "gaming-offers" },
  });

  const offers = [
    {
      slug: "puzzle-quest-demo",
      categoryId: feedbackZone.id,
      title: "Puzzle Quest — try & review",
      appName: "Puzzle Quest",
      shortDescription: "Play 3 levels and tell us what you think.",
      description:
        "Install Puzzle Quest, clear the first three levels, then submit your " +
        "feedback through the in-app form. Reward is credited after review.",
      features: ["Casual puzzle gameplay", "Offline play", "Small download"],
      instructions: ["Install from Play Store", "Clear 3 levels", "Submit feedback"],
      requirements: ["Android 10+", "New installs only"],
      terms: "One reward per user. Fraudulent installs are rejected.",
      rewardAmount: 50,
      rewardLabel: "50 + 500 XP",
      estimatedTime: "10 min",
      rating: 4.5,
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.example.puzzle",
      featured: true,
      priority: 100,
    },
    {
      slug: "arena-legends-demo",
      categoryId: gaming.id,
      title: "Arena Legends — reach level 5",
      appName: "Arena Legends",
      shortDescription: "Battle to level 5 and claim your bounty.",
      description:
        "Install Arena Legends and reach player level 5. Progress is verified " +
        "manually; rewards are announced in the app.",
      instructions: ["Install from Play Store", "Reach level 5"],
      rewardAmount: 120,
      estimatedTime: "2 days",
      rating: 4.2,
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.example.arena",
      priority: 90,
    },
  ];

  for (const offer of offers) {
    await prisma.offer.upsert({
      where: { slug: offer.slug },
      create: { ...offer, status: "PUBLISHED" },
      update: {},
    });
  }

  console.log(`Seeded hot offers: ${categories.length} categories, ${offers.length} offers`);
};

/**
 * Seeds a SUPER_ADMIN account. The admin signs in via Google with this email;
 * the matching row is linked on first sign-in and keeps its elevated role.
 */
const main = async (): Promise<void> => {
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "SUPER_ADMIN",
      wallet: { create: {} },
    },
    update: { role: "SUPER_ADMIN" },
  });

  console.log(`Seeded SUPER_ADMIN: ${admin.email} (${admin.id})`);

  await seedHotOffers();
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

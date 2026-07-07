import { PrismaClient } from "@prisma/client";

import { seedAchievements } from "@/lib/gamification/seedAchievements";

const prisma = new PrismaClient();

async function main() {
  await seedAchievements(prisma);
  console.log("Seeded achievements");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

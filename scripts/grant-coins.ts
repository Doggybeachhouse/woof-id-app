import {
  CoinSourceType,
  JourneyEventType,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

function usage() {
  console.error(`Usage:
  DATABASE_URL="postgresql://..." npx tsx scripts/grant-coins.ts <email> <amount> [idempotency-key] [--all-dogs]

Credits Woof Coins to the user's dog profile(s). Balance lives on DogProfile.woofCoins
with a matching CoinLedger row (sourceType MANUAL).

Default: credits the user's oldest dog only. --all-dogs credits each dog the full amount.

Examples:
  npx tsx scripts/grant-coins.ts info@doggybeachhouse.com 1000
  npx tsx scripts/grant-coins.ts info@doggybeachhouse.com 1000 support-ticket-42
`);
}

async function grantToDog(
  dogProfileId: string,
  amount: number,
  reason: string,
  sourceId: string,
) {
  const existing = await prisma.coinLedger.findFirst({
    where: {
      dogProfileId,
      sourceType: CoinSourceType.MANUAL,
      sourceId,
    },
  });
  if (existing) {
    const dog = await prisma.dogProfile.findUnique({
      where: { id: dogProfileId },
      select: { name: true, woofId: true, woofCoins: true },
    });
    return {
      skipped: true as const,
      dog,
      ledgerId: existing.id,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const dog = await tx.dogProfile.update({
      where: { id: dogProfileId },
      data: { woofCoins: { increment: amount } },
      select: { id: true, name: true, woofId: true, woofCoins: true },
    });

    const ledger = await tx.coinLedger.create({
      data: {
        dogProfileId,
        amount,
        reason,
        sourceType: CoinSourceType.MANUAL,
        sourceId,
      },
    });

    await tx.journeyEvent.create({
      data: {
        dogProfileId,
        eventType: JourneyEventType.COINS_EARNED,
        title: `+${amount} Woof Coins`,
        body: reason,
        metadata: { amount, sourceType: CoinSourceType.MANUAL, sourceId },
      },
    });

    return { dog, ledgerId: ledger.id };
  });

  return { skipped: false as const, ...updated };
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "DATABASE_URL is required (copy from Neon dashboard or Vercel).",
    );
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((a) => a !== "--all-dogs");
  const allDogs = process.argv.includes("--all-dogs");
  const [emailArg, amountArg, idempotencyKeyArg] = args;

  if (!emailArg || !amountArg) {
    usage();
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const amount = Number.parseInt(amountArg, 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    console.error("Amount must be a positive integer.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      dogs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  if (user.dogs.length === 0) {
    console.error(`User ${email} has no dog profiles; cannot grant coins.`);
    process.exit(1);
  }

  const targets = allDogs ? user.dogs : [user.dogs[0]!];
  const baseKey =
    idempotencyKeyArg?.trim() || `grant-${email}-${amount}`;
  const reason = `Manual grant (${amount} Woof Coins)`;

  console.log(
    `User: ${user.email} (${user.id}), dogs: ${user.dogs.length}, crediting: ${targets.map((d) => d.name).join(", ")}`,
  );

  for (const dog of targets) {
    const sourceId = allDogs
      ? `${baseKey}:dog:${dog.id}`
      : `${baseKey}:dog:${dog.id}`;
    const result = await grantToDog(dog.id, amount, reason, sourceId);

    if (result.skipped) {
      console.log(
        `SKIP ${result.dog?.woofId} (${result.dog?.name}): already granted (ledger ${result.ledgerId}), balance ${result.dog?.woofCoins}`,
      );
    } else {
      console.log(
        `OK ${result.dog.woofId} (${result.dog.name}): +${amount} -> balance ${result.dog.woofCoins} (ledger ${result.ledgerId})`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

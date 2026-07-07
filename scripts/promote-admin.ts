import { PrismaClient, type UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function usage() {
  console.error(`Usage:
  DATABASE_URL="postgresql://..." npx tsx scripts/promote-admin.ts list
  DATABASE_URL="postgresql://..." npx tsx scripts/promote-admin.ts promote <email> [ADMIN|STAFF]

Examples:
  npx tsx scripts/promote-admin.ts list
  npx tsx scripts/promote-admin.ts promote info@doggybeachhouse.com ADMIN
`);
}

async function listUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Users (${users.length}):`);
  for (const user of users) {
    console.log(
      `${user.createdAt.toISOString()}  ${user.role.padEnd(5)}  ${user.email}  (${user.id})`,
    );
  }
}

async function promoteUser(email: string, role: UserRole) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user) {
    console.error(`No user found for ${normalized}`);
    process.exit(1);
  }

  if (user.role === role) {
    console.log(`${normalized} already has role ${role}`);
    return;
  }

  const updated = await prisma.user.update({
    where: { email: normalized },
    data: { role },
    select: { email: true, role: true },
  });

  console.log(`Updated ${updated.email} -> ${updated.role}`);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required (copy from Neon dashboard or Vercel).");
    process.exit(1);
  }

  const [command, email, roleArg] = process.argv.slice(2);

  if (command === "list") {
    await listUsers();
    return;
  }

  if (command === "promote") {
    if (!email) {
      usage();
      process.exit(1);
    }

    const role = (roleArg?.toUpperCase() ?? "ADMIN") as UserRole;
    if (role !== "ADMIN" && role !== "STAFF") {
      console.error("Role must be ADMIN or STAFF");
      process.exit(1);
    }

    await promoteUser(email, role);
    return;
  }

  usage();
  process.exit(1);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

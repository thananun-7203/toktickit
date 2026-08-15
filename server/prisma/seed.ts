import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
// Requirement: running the seed twice must NOT create duplicates.
// Uses upsert on the unique `name` field, so it is safe to run repeatedly.
const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"];

async function main() {
  const prisma = getPrisma();

  for (const name of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`Category ready: ${category.name} (id ${category.id})`);
  }

  const total = await prisma.category.count();
  console.log(`Seed complete. Total categories in database: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
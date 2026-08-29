import { getPrisma } from "../src/prisma.js";

// Lab 2 Issue 2 — seed the four categories (from Lab 1), six related systems,
// and four active + one inactive Development Requester.
// Requirement: running the seed twice must NOT create duplicates.
// Uses upsert on the unique `name` / `email` fields, so it is safe to re-run.
const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"];

const RELATED_SYSTEMS = [
  { name: "CRM", description: "Customer relationship management platform" },
  { name: "Report Portal", description: "Business reporting and export" },
  { name: "Payroll", description: "Monthly payroll processing" },
  { name: "Inventory", description: "Stock and warehouse management" },
  { name: "Email Service", description: "Corporate email and calendar" },
  { name: "HR System", description: "Human resources and onboarding" },
  { name: "ERP", description: "Enterprise resource planning" },
];

const DEVELOPMENT_REQUESTERS = [
  { name: "Somchai Jaidee", email: "somchai@toktick.it", isActive: true },
  { name: "Somsri Rakdee", email: "somsri@toktick.it", isActive: true },
  { name: "Anan Kongthong", email: "anan@toktick.it", isActive: true },
  { name: "Preecha Sombat", email: "preecha@toktick.it", isActive: true },
  { name: "Noppadol Sitthirit", email: "noppadol@toktick.it", isActive: false },
];

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

  for (const system of RELATED_SYSTEMS) {
    const related = await prisma.relatedSystem.upsert({
      where: { name: system.name },
      update: {},
      create: system,
    });
    console.log(`RelatedSystem ready: ${related.name} (id ${related.id})`);
  }

  for (const requester of DEVELOPMENT_REQUESTERS) {
    const dev = await prisma.developmentRequester.upsert({
      where: { email: requester.email },
      update: { name: requester.name, isActive: requester.isActive },
      create: requester,
    });
    console.log(`DevelopmentRequester ready: ${dev.name} (id ${dev.id}, active ${dev.isActive})`);
  }

  const [cats, systems, requesters, activeRequesters] = await Promise.all([
    prisma.category.count(),
    prisma.relatedSystem.count(),
    prisma.developmentRequester.count(),
    prisma.developmentRequester.count({ where: { isActive: true } }),
  ]);

  console.log(
    `Seed complete. Categories: ${cats}, RelatedSystems: ${systems}, ` +
      `Requesters: ${requesters} (${activeRequesters} active).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

/**
 * One-off wipe of catalog/manufacturer/sales data. Does not delete auth users.
 * Run: npx tsx scripts/wipe-business-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
  },
});

async function main() {
  await prisma.invoice.deleteMany();
  await prisma.catalogImport.deleteMany();
  await prisma.product.deleteMany();
  await prisma.manufacturer.deleteMany();
  console.log("Wiped manufacturers, products, catalogs, and invoices.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaTx?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

/**
 * Session / direct Postgres. The pooler on port 6543 (transaction mode) cannot
 * keep Prisma interactive transactions open — they die with "Transaction not found".
 */
export const prismaTx =
  globalForPrisma.prismaTx ??
  new PrismaClient({
    datasources: {
      db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaTx = prismaTx;
}

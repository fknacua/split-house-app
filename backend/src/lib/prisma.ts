import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

export const prisma = globalThis.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "pretty",
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Test database connection only if DATABASE_URL is available
if (process.env.DATABASE_URL) {
  prisma.$connect()
    .then(() => {
      console.log("✅ Database connected successfully");
    })
    .catch((error) => {
      console.error("❌ Database connection failed:", error);
    });
} else {
  console.log("⚠️ DATABASE_URL not found, skipping database connection");
}

export * from '@prisma/client';

export default prisma;
export type { PrismaClient } from "@prisma/client";

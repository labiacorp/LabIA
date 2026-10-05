import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const connectionString = process.env.DATABASE_URL;
const local = process.env.NODE_ENV !== "production" && connectionString
  && ["localhost", "127.0.0.1"].includes(new URL(connectionString).hostname);
// ponytail: the embedded preview database serializes queries; hosted Neon keeps its existing adapter.
const adapter = local ? new PrismaPg({ connectionString, max: 1 }) : new PrismaNeon({ connectionString });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

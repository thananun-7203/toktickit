import { Prisma } from "@prisma/client";

export function isPrismaSerializationConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034") return true;
  if (error.code !== "P2010") return false;
  const rawCode = typeof error.meta?.code === "string" ? error.meta.code : null;
  return rawCode === "40001" || rawCode === "40P01";
}

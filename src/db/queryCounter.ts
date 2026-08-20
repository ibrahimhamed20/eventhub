import { prisma } from "./prisma.js";

let count = 0;

/**
 * Counts every query Prisma sends to the database. Used to PROVE
 * the N+1 problem exists and that DataLoader actually fixes it —
 * rather than assuming either.
 */
export function installQueryCounter(): void {
  prisma.$on("query" as never, () => {
    count++;
  });
}

export const queryCounter = {
  reset: () => {
    count = 0;
  },
  get: () => count,
};

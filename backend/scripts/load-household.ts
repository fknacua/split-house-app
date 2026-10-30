import { readFile } from "node:fs/promises";
import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { prisma } from "@/lib/prisma";
import { openMonthIfNeeded } from "@/lib/month-open";
import { HouseholdFileError, parseHouseholdFile } from "@/lib/household/household-file";

/**
 * Loads a household into an empty database from a local JSON file (Phase 8.2, the November 2026
 * dry run): creates the people and the first household version, then opens its starting month, so
 * Home has a month to show even before the calendar reaches it.
 *
 * Usage, from `backend/`, with the target database's env file:
 *   npx tsx --env-file=.env.prod scripts/load-household.ts prisma/local/household.json
 *
 * Refuses to run when the database already has a person or a household version, so it never
 * overwrites. Prints counts and field paths only, never names, numbers or amounts.
 */
async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: tsx --env-file=<env file> scripts/load-household.ts <household.json>");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set: pass --env-file");

  const file = parseHouseholdFile(JSON.parse(await readFile(path, "utf8")));
  console.log(`Target database host: ${new URL(process.env.DATABASE_URL).hostname}`);

  const [people, versions] = await Promise.all([prisma.person.count(), prisma.householdVersion.count()]);
  if (people > 0 || versions > 0) {
    throw new Error(`Refusing to load: the database already has ${people} people and ${versions} versions`);
  }

  await prisma.$transaction([
    prisma.person.createMany({ data: file.people }),
    prisma.householdVersion.create({
      data: {
        startsFromMonth: file.startsFromMonth,
        schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
        config: file.config,
      },
    }),
  ]);
  const opened = await openMonthIfNeeded(prisma, file.startsFromMonth);
  const charges = await prisma.charge.count({ where: { month: file.startsFromMonth } });

  console.log(`Created ${file.people.length} people and the version starting ${file.startsFromMonth}`);
  console.log(`Opened ${opened?.month ?? "no month"} with ${charges} rent and recurring charges`);
}

main()
  .catch((err) => {
    console.error(err instanceof HouseholdFileError ? err.message : `Failed: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

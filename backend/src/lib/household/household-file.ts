import {
  e164Phone,
  householdConfigSchema,
  monthKey,
  type HouseholdConfig,
} from "@splithouse/shared";

/** A `Person` row the load script creates. */
export interface HouseholdFilePerson {
  id: string;
  name: string;
  whatsappE164: string | null;
  isOwner: boolean;
}

/** A parsed household file: the people to create and the first version's config. */
export interface HouseholdFile {
  startsFromMonth: string;
  people: HouseholdFilePerson[];
  config: HouseholdConfig;
}

/** Thrown when a household file is invalid. Messages name field paths only, never values. */
export class HouseholdFileError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid household file:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
}

type RawPerson = Record<string, unknown> & { name?: unknown; whatsappE164?: unknown };

/**
 * Parses the local household file the dry-run load script reads: the household config with each
 * person's `name` and `whatsappE164` beside their config entry, plus `startsFromMonth`. Keys
 * starting with `_` (notes) are ignored. Beyond the shared schema it requires a name for everyone,
 * a WhatsApp number for everyone except the owner, and rent above zero for every tenant.
 *
 * @param json - The file's parsed JSON.
 * @returns The `Person` rows (the config's `personId` becomes the row id) and the config.
 * @throws {HouseholdFileError} When anything is missing or invalid; lists every problem by path.
 */
export function parseHouseholdFile(json: unknown): HouseholdFile {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new HouseholdFileError(["(root): must be an object"]);
  }
  const { startsFromMonth, people, ...rest } = json as Record<string, unknown>;
  const rawPeople: RawPerson[] = Array.isArray(people) ? (people as RawPerson[]) : [];
  const problems: string[] = [];

  if (!monthKey.safeParse(startsFromMonth).success) problems.push("startsFromMonth: use YYYY-MM");

  const configInput = Object.fromEntries(Object.entries(rest).filter(([key]) => !key.startsWith("_")));
  const parsed = householdConfigSchema.safeParse({
    ...configInput,
    people: rawPeople.map((person) =>
      Object.fromEntries(Object.entries(person).filter(([key]) => key !== "name" && key !== "whatsappE164")),
    ),
  });
  if (!parsed.success) {
    problems.push(...parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`));
  }

  rawPeople.forEach((p, i) => {
    if (typeof p.name !== "string" || !p.name.trim()) problems.push(`people.${i}.name: required`);
    if (p.role === "OWNER") {
      if (p.whatsappE164 != null && !e164Phone.safeParse(p.whatsappE164).success) {
        problems.push(`people.${i}.whatsappE164: invalid`);
      }
    } else if (!e164Phone.safeParse(p.whatsappE164).success) {
      problems.push(`people.${i}.whatsappE164: required, +65 and the number`);
    }
    if (p.role === "TENANT" && !(typeof p.rentCents === "number" && p.rentCents > 0)) {
      problems.push(`people.${i}.rentCents: must be above 0 for a tenant`);
    }
  });

  if (problems.length > 0 || !parsed.success) throw new HouseholdFileError(problems);

  return {
    startsFromMonth: startsFromMonth as string,
    people: rawPeople.map((p, i) => ({
      id: parsed.data.people[i].personId,
      name: (p.name as string).trim(),
      whatsappE164: (p.whatsappE164 as string | null | undefined) ?? null,
      isOwner: parsed.data.people[i].role === "OWNER",
    })),
    config: parsed.data,
  };
}

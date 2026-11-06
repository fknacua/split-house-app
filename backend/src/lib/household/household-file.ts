import {
  e164Phone,
  householdConfigSchema,
  messageTemplatesSchema,
  monthKey,
  type HouseholdConfig,
  type MessageTemplates,
  type PersonColor,
  type PersonConfig,
} from "@splithouse/shared";
import { nextPersonColor } from "./person-color";
import { viaPeopleOf } from "./route-via";

/** A `Person` row the load script creates. */
export interface HouseholdFilePerson {
  id: string;
  name: string;
  whatsappE164: string | null;
  color: PersonColor;
  isOwner: boolean;
}

/** A parsed household file: the people to create, the first version's config and the message wording. */
export interface HouseholdFile {
  startsFromMonth: string;
  people: HouseholdFilePerson[];
  config: HouseholdConfig;
  /** Null when the file has none, so the defaults apply. */
  templates: MessageTemplates | null;
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
 * a WhatsApp number for everyone except the owner, and rent above zero for every occupied tenant room.
 * `templates` is optional, and goes to `MessageTemplates` rather than the config.
 *
 * The file's shape, with the rest of each entry as in `householdConfigSchema` (schema version 3):
 * ```json
 * {
 *   "startsFromMonth": "2026-11",
 *   "rooms": [
 *     { "id": "room-master", "roomType": "MASTER", "name": "Master room", "airconUnits": 1 },
 *     { "id": "room-2", "roomType": "TENANT", "name": "Room 2", "airconUnits": 1, "rentCents": XXXXXX, "includeInTotal": true },
 *     { "id": "room-living", "roomType": "COMMON", "name": "Living room", "airconUnits": 2 }
 *   ],
 *   "people": [
 *     { "personId": "person-alex", "name": "Alex", "whatsappE164": null, "role": "OWNER", "roomId": "room-master" },
 *     { "personId": "person-sam", "name": "Sam", "whatsappE164": "+6581234567", "role": "TENANT", "roomId": "room-2", "utilityShares": 1000 }
 *   ],
 *   "categories": {
 *     "rent": { "landlordRentCents": XXXXXX, "landlordDueDay": 1, "ownerBps": 10000, "primaryBps": 0 },
 *     "utilities": { "totalShares": 5000, "ownerBps": 10000, "primaryBps": 0 },
 *     "aircon": { "ownerBps": 10000, "primaryBps": 0 }
 *   },
 *   "templates": { "monthly": "...", "nudge": "..." }
 * }
 * ```
 * Coming from schema version 1: a tenant's `rentCents` and `airconUnits` move onto their room, and they
 * gain a `roomId`. `sharedRentCents` becomes `landlordRentCents`, which is the master rent plus the rent
 * of occupied rooms with `includeInTotal` on. Aircon's `totalUnits` goes: the total is the sum of the rooms.
 *
 * @param json - The file's parsed JSON.
 * @returns The `Person` rows (the config's `personId` becomes the row id; colors are assigned, Teal
 *   for the owner and the others in file order), the config and the wording.
 * @throws {HouseholdFileError} When anything is missing or invalid; lists every problem by path.
 */
export function parseHouseholdFile(json: unknown): HouseholdFile {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new HouseholdFileError(["(root): must be an object"]);
  }
  const { startsFromMonth, people, templates, ...rest } = json as Record<string, unknown>;
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

  const wording =
    templates === undefined
      ? null
      : messageTemplatesSchema.safeParse(parsed.success ? nestFileSectionTitles(templates, parsed.data.people) : templates);
  if (wording && !wording.success) {
    problems.push(...wording.error.issues.map((i) => `templates.${i.path.join(".")}: ${i.message}`));
  }
  if (wording?.success && parsed.success) {
    const known = new Set(parsed.data.people.map((p) => p.personId));
    wording.data.overrides.forEach((o, i) => {
      if (!known.has(o.personId)) problems.push(`templates.overrides.${i}.personId: Unknown person`);
    });
    for (const [recipientId, titles] of Object.entries(wording.data.sectionTitles)) {
      if (!known.has(recipientId)) problems.push(`templates.sectionTitles.${recipientId}: Unknown person`);
      for (const personId of Object.keys(titles)) {
        if (!known.has(personId)) problems.push(`templates.sectionTitles.${recipientId}.${personId}: Unknown person`);
      }
    }
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
  });

  if (problems.length > 0 || !parsed.success) throw new HouseholdFileError(problems);

  const occupied = new Set(parsed.data.people.map((p) => p.roomId));
  parsed.data.rooms.forEach((room, i) => {
    if (room.roomType === "TENANT" && occupied.has(room.id) && room.rentCents <= 0) {
      problems.push(`rooms.${i}.rentCents: must be above 0 for an occupied room`);
    }
  });
  if (problems.length > 0) throw new HouseholdFileError(problems);

  const usedColors: PersonColor[] = [];
  return {
    startsFromMonth: startsFromMonth as string,
    people: rawPeople.map((p, i) => {
      const isOwner = parsed.data.people[i].role === "OWNER";
      const color = isOwner ? "TEAL" : nextPersonColor(usedColors);
      usedColors.push(color);
      return {
        id: parsed.data.people[i].personId,
        name: (p.name as string).trim(),
        whatsappE164: (p.whatsappE164 as string | null | undefined) ?? null,
        color,
        isOwner,
      };
    }),
    config: parsed.data,
    templates: wording?.success ? wording.data : null,
  };
}

/**
 * Reads a file's older flat section titles, `{ personId: title }`, in every message that holds that person's section:
 * their own and each one their charges go via. Nested titles pass through.
 *
 * @param templates - The file's `templates`.
 * @param people - The file's people, with their routes.
 * @returns The templates with nested section titles.
 */
function nestFileSectionTitles(templates: unknown, people: PersonConfig[]): unknown {
  if (typeof templates !== "object" || templates === null) return templates;
  const { sectionTitles } = templates as { sectionTitles?: unknown };
  if (typeof sectionTitles !== "object" || sectionTitles === null) return templates;
  const nested: Record<string, Record<string, unknown>> = {};
  for (const [personId, entry] of Object.entries(sectionTitles)) {
    if (typeof entry !== "string") {
      nested[personId] = { ...nested[personId], ...(entry as Record<string, unknown>) };
      continue;
    }
    const person = people.find((p) => p.personId === personId);
    for (const recipientId of [personId, ...(person ? viaPeopleOf(person) : [])]) {
      nested[recipientId] = { ...nested[recipientId], [personId]: entry };
    }
  }
  return { ...templates, sectionTitles: nested };
}

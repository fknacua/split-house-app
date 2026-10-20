import type { HouseholdConfig } from "@/lib/household/config";

// Nov 2026 fixtures from the Data Model doc, with fictional names.
// Alex = owner, Priya = primary tenant, Sam = Tenant 1, Jordan = Tenant 2.
export const PERSON_IDS = {
  alex: "person-alex",
  priya: "person-priya",
  sam: "person-sam",
  jordan: "person-jordan",
} as const;

export const NOV_2026_CONFIG: HouseholdConfig = {
  people: [
    { personId: PERSON_IDS.alex, role: "OWNER", rentCents: 0, utilityShares: 0, airconUnits: 0, routes: {}, dueDays: {}, depositCents: 0 },
    {
      personId: PERSON_IDS.priya,
      role: "PRIMARY",
      rentCents: 0,
      utilityShares: 0,
      airconUnits: 0,
      routes: {},
      dueDays: { RENT: 7, UTILITIES: 7, AIRCON: 7, RECURRING: 7 },
      depositCents: 0,
    },
    {
      personId: PERSON_IDS.sam,
      role: "TENANT",
      rentCents: 95000,
      utilityShares: 1000,
      airconUnits: 1,
      routes: {
        UTILITIES: { kind: "VIA", viaPersonId: PERSON_IDS.priya },
        AIRCON: { kind: "VIA", viaPersonId: PERSON_IDS.priya },
      },
      dueDays: { RENT: 28 },
      depositCents: 0,
    },
    {
      personId: PERSON_IDS.jordan,
      role: "TENANT",
      rentCents: 95000,
      utilityShares: 1000,
      airconUnits: 1,
      routes: {},
      dueDays: { RENT: 1, UTILITIES: 4, AIRCON: 4 },
      depositCents: 95000,
    },
  ],
  categories: {
    rent: { sharedRentCents: 335000, ownerBps: 5000, primaryBps: 5000 },
    utilities: { totalShares: 5000, ownerBps: 5000, primaryBps: 5000 },
    aircon: { totalUnits: 6, ownerBps: 5000, primaryBps: 5000 },
  },
  recurring: [
    { id: "recurring-starhub", label: "Starhub", amountCents: 2750, personId: PERSON_IDS.priya },
  ],
  templates: {
    monthly: "Hi {name}! Eto na yung breakdown for {month} 😊\n\n{lines}\n\nTotal: {total}\nPaki-send by {dueDate}. Salamat!",
    nudge: "Hi {name}! Paalala lang, yung {charge} for {month} ({amount}) ay due nung {dueDate}. Salamat! 🙏",
    overrides: [],
    lineLabels: {},
  },
};

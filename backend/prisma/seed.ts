import "dotenv/config";
import { parseArgs } from "node:util";
import { prisma } from "@/lib/prisma";
import { openMonthIfNeeded } from "@/lib/month-open";
import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS, VERSION_A_CONFIG } from "@/lib/fixtures/household";
import { buildMonthCharges, buildUtilitiesCharges, type EngineCharge } from "@/lib/split/engine";
import { BILL_FIXTURE } from "@/lib/fixtures/bill";
import { generateBillFixturePdf } from "@/lib/fixtures/generate-bill-pdf";
import { countPdfPages } from "@/services/bill/read-bill.service";

// Fictional household (see docs/SplitHouse — Data Model.md "Fixtures"). Dev
// branch only: refuses to run against production. Always wipes the domain
// tables first (never the Better Auth tables) and reseeds, so it is safe to
// rerun — `npm run seed:reset` is just this script.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: NODE_ENV is production.");
  process.exit(1);
}

/**
 * The Home states the seed can set up for the current month. Aug to Oct 2026 are the
 * same in every scenario. `devNow` is the `DEV_NOW` to use with it. Later Phase 5
 * steps add their scenarios here.
 */
const SCENARIOS = {
  // October is not created and only Aug and Sep are seeded: Home's first request on 1 Oct opens
  // October, so a bill for October can be uploaded.
  uploadOct: { devNow: "2026-10-01T09:00:00+08:00" },
  // November is not created: Home's first request on 1 Nov opens it.
  upload: { devNow: "2026-11-01T09:00:00+08:00" },
  // November is not created either; it has an unsaved bill draft waiting.
  draft: { devNow: "2026-11-01T09:00:00+08:00" },
  // November is open with its bill saved and utilities charges built, and no message sent.
  unsent: { devNow: "2026-11-01T09:00:00+08:00" },
  // As unsent, with the monthly messages opened on 2 Nov, Jordan's rent nudged, and a few payments in.
  collecting: { devNow: "2026-11-03T09:00:00+08:00" },
  // As collecting a day later: Jordan's rent is paid and his utilities are due today.
  dueToday: { devNow: "2026-11-04T09:00:00+08:00" },
  // As collecting a week on: everyone's utilities are paid, so the bill is fully collected, but it
  // is not marked paid yet.
  fullyCollected: { devNow: "2026-11-10T09:00:00+08:00" },
  // As collecting, but every charge is paid and the bill is marked paid.
  settled: { devNow: "2026-11-29T09:00:00+08:00" },
} as const;

type ScenarioName = keyof typeof SCENARIOS;

function parseScenario(): ScenarioName {
  const { values } = parseArgs({ options: { scenario: { type: "string", default: "upload" } } });
  const name = values.scenario;
  if (!name || !(name in SCENARIOS)) {
    console.error(`Unknown scenario "${name}". Use one of: ${Object.keys(SCENARIOS).join(", ")}.`);
    process.exit(1);
  }
  return name as ScenarioName;
}

const scenario = parseScenario();

const PERSON_NAMES: Record<string, string> = {
  [PERSON_IDS.alex]: "Alex",
  [PERSON_IDS.priya]: "Priya",
  [PERSON_IDS.sam]: "Sam",
  [PERSON_IDS.jordan]: "Jordan",
};

// Every saved bill gets the synthetic two-page fixture PDF (invented values, nothing from a real
// bill), so Open on View bill shows a real document. Its values do not match each month's bill.
const SAMPLE_PDF = new Uint8Array(await generateBillFixturePdf());
const SAMPLE_PDF_PAGES = await countPdfPages(SAMPLE_PDF);

async function wipeDomainTables() {
  await prisma.messageEvent.deleteMany();
  await prisma.task.deleteMany();
  await prisma.charge.deleteMany();
  await prisma.chargeGroup.deleteMany();
  await prisma.billFile.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.billDraft.deleteMany();
  await prisma.month.deleteMany();
  await prisma.householdVersion.deleteMany();
  await prisma.person.deleteMany();
  await prisma.settings.deleteMany();
}

async function seedPeople() {
  for (const [personId, name] of Object.entries(PERSON_NAMES)) {
    await prisma.person.create({
      data: {
        id: personId,
        name,
        whatsappE164: personId === PERSON_IDS.alex ? null : "+6581234567",
        isOwner: personId === PERSON_IDS.alex,
      },
    });
  }
}

type ChargeInsert = Omit<EngineCharge, "category"> & {
  category: EngineCharge["category"] | "CORRECTION";
  month: string;
  householdVersionId: string;
  billId?: string;
  correctsMonth?: string;
  correctsCategory?: EngineCharge["category"];
  createdAt?: string;
  paidCents?: number;
  paidOn?: string;
  paidByPersonId?: string;
};

async function insertCharge(c: ChargeInsert) {
  return prisma.charge.create({
    data: {
      month: c.month,
      personId: c.personId,
      payViaPersonId: c.payViaPersonId,
      category: c.category,
      label: c.label,
      amountCents: c.amountCents,
      dueDate: c.dueDate ? new Date(c.dueDate) : null,
      billId: c.billId ?? null,
      correctsMonth: c.correctsMonth ?? null,
      correctsCategory: c.correctsCategory ?? null,
      ...(c.createdAt ? { createdAt: new Date(c.createdAt) } : {}),
      householdVersionId: c.householdVersionId,
      paidCents: c.paidCents ?? null,
      paidOn: c.paidOn ? new Date(c.paidOn) : null,
      paidByPersonId: c.paidByPersonId ?? null,
    },
  });
}

function payerFor(c: { personId: string; payViaPersonId: string | null }): string {
  return c.payViaPersonId ?? c.personId;
}

/** Sample Electricity, Gas and Water lines that add up to a past month's Current Charges. */
function sampleLines(currentChargesCents: number) {
  const electricity = Math.round(currentChargesCents * 0.65);
  const gas = Math.round(currentChargesCents * 0.1);
  return [
    { label: "Electricity", cents: electricity },
    { label: "Gas", cents: gas },
    { label: "Water", cents: currentChargesCents - electricity - gas },
  ];
}

interface PastMonthResult {
  rentAndRecurring: Awaited<ReturnType<typeof insertCharge>>[];
  utilities: Awaited<ReturnType<typeof insertCharge>>[];
  billId: string;
}

async function seedPastMonth(
  month: string,
  householdVersionId: string,
  billingPeriod: { start: string; end: string; dueDate: string; currentChargesCents: number },
): Promise<PastMonthResult> {
  const bill = await prisma.bill.create({
    data: {
      month,
      currentChargesCents: billingPeriod.currentChargesCents,
      billingPeriodStart: new Date(billingPeriod.start),
      billingPeriodEnd: new Date(billingPeriod.end),
      dueDate: new Date(billingPeriod.dueDate),
      lines: sampleLines(billingPeriod.currentChargesCents),
      parseStatus: "PARSED",
      createdAt: new Date(`${month}-02T10:00:00+08:00`),
      file: {
        create: {
          filename: `${month}-sample-bill.pdf`,
          mimeType: "application/pdf",
          sizeBytes: SAMPLE_PDF.byteLength,
          pageCount: SAMPLE_PDF_PAGES,
          bytes: SAMPLE_PDF,
        },
      },
    },
  });

  const rentAndRecurring = await Promise.all(
    buildMonthCharges(VERSION_A_CONFIG, month).map((c) =>
      insertCharge({ ...c, month, householdVersionId }),
    ),
  );
  const utilities = await Promise.all(
    buildUtilitiesCharges(VERSION_A_CONFIG, { month, currentChargesCents: billingPeriod.currentChargesCents }).map(
      (c) => insertCharge({ ...c, month, householdVersionId, billId: bill.id }),
    ),
  );

  return { rentAndRecurring, utilities, billId: bill.id };
}

async function markPaid(chargeId: string, personId: string, paidOn: string, amountCents?: number) {
  const charge = await prisma.charge.findUniqueOrThrow({ where: { id: chargeId } });
  await prisma.charge.update({
    where: { id: chargeId },
    data: { paidCents: amountCents ?? charge.amountCents, paidOn: new Date(paidOn), paidByPersonId: personId },
  });
}

async function markBillPaid(billId: string, paidOn: string) {
  const bill = await prisma.bill.findUniqueOrThrow({ where: { id: billId } });
  await prisma.bill.update({
    where: { id: billId },
    data: { paidCents: bill.currentChargesCents, paidOn: new Date(paidOn) },
  });
}

async function seedMonthlyMessage(month: string, personId: string, chargeId: string, openedAt: string) {
  await prisma.messageEvent.create({
    data: {
      month,
      personId,
      kind: "MONTHLY",
      chargeId,
      renderedText: `Hi ${PERSON_NAMES[personId]}! Eto na yung breakdown for ${month}. (seed placeholder text)`,
      openedAt: new Date(openedAt),
    },
  });
}

/**
 * October 2026: one short-paid charge, one unpaid, plus September's correction. Left out of the
 * `uploadOct` scenario, where it is 1 Oct and Home opens October itself.
 */
async function seedOctober(versionAId: string) {
  await prisma.month.create({ data: { month: "2026-10", householdVersionId: versionAId, openedAt: new Date("2026-10-01T09:00:00+08:00") } });
  const oct = await seedPastMonth("2026-10", versionAId, {
    start: "2026-09-16",
    end: "2026-10-15",
    dueDate: "2026-10-25",
    currentChargesCents: 42800,
  });
  const samRent = oct.rentAndRecurring.find((c) => c.personId === PERSON_IDS.sam)!;
  await markPaid(samRent.id, PERSON_IDS.sam, "2026-10-29", samRent.amountCents - 2000); // short by $20, history only, no carry
  const jordanRent = oct.rentAndRecurring.find((c) => c.personId === PERSON_IDS.jordan)!;
  // left unpaid on purpose
  for (const charge of [...oct.rentAndRecurring, ...oct.utilities]) {
    if (charge.id === samRent.id || charge.id === jordanRent.id) continue;
    await markPaid(charge.id, payerFor(charge), "2026-10-18");
  }
  for (const personId of [PERSON_IDS.priya, PERSON_IDS.sam, PERSON_IDS.jordan]) {
    const charge = [...oct.rentAndRecurring, ...oct.utilities].find((c) => c.personId === personId);
    if (charge) await seedMonthlyMessage("2026-10", personId, charge.id, "2026-10-02T10:00:00+08:00");
  }
  await prisma.messageEvent.create({
    data: {
      month: "2026-10",
      personId: PERSON_IDS.jordan,
      kind: "NUDGE",
      chargeId: jordanRent.id,
      renderedText: `Hi ${PERSON_NAMES[PERSON_IDS.jordan]}! Paalala lang, yung Rent for 2026-10 ay due na. (seed placeholder text)`,
      openedAt: new Date("2026-10-27T18:00:00+08:00"),
    },
  });
  // A shortfall found later in Jordan's September utilities, corrected in October.
  await insertCharge({
    personId: PERSON_IDS.jordan,
    category: "CORRECTION",
    label: "Correction: September utilities",
    amountCents: 1500,
    payViaPersonId: null,
    dueDate: null,
    month: "2026-10",
    correctsMonth: "2026-09",
    correctsCategory: "UTILITIES",
    createdAt: "2026-10-05T10:00:00+08:00",
    householdVersionId: versionAId,
  });
  // Sam overpaid September's utilities by $5.00: a credit, added on 2 Oct and paid out on 12 Oct.
  const samCredit = await insertCharge({
    personId: PERSON_IDS.sam,
    category: "CORRECTION",
    label: "Correction: September utilities",
    amountCents: -500,
    payViaPersonId: null,
    dueDate: null,
    month: "2026-10",
    correctsMonth: "2026-09",
    correctsCategory: "UTILITIES",
    createdAt: "2026-10-02T10:00:00+08:00",
    householdVersionId: versionAId,
  });
  await markPaid(samCredit.id, PERSON_IDS.alex, "2026-10-12");
}

async function main() {
  await wipeDomainTables();
  await seedPeople();

  const versionA = await prisma.householdVersion.create({
    data: { startsFromMonth: "2026-08", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: VERSION_A_CONFIG },
  });
  await prisma.householdVersion.create({
    data: { startsFromMonth: "2026-11", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
  });

  // --- August 2026: fully paid and settled. ---
  await prisma.month.create({ data: { month: "2026-08", householdVersionId: versionA.id, openedAt: new Date("2026-08-01T09:00:00+08:00") } });
  const aug = await seedPastMonth("2026-08", versionA.id, {
    start: "2026-07-16",
    end: "2026-08-15",
    dueDate: "2026-08-25",
    currentChargesCents: 39500,
  });
  for (const charge of [...aug.rentAndRecurring, ...aug.utilities]) {
    await markPaid(charge.id, payerFor(charge), "2026-08-20");
  }
  await markBillPaid(aug.billId, "2026-08-22");
  for (const personId of [PERSON_IDS.priya, PERSON_IDS.sam, PERSON_IDS.jordan]) {
    const charge = [...aug.rentAndRecurring, ...aug.utilities].find((c) => c.personId === personId);
    if (charge) await seedMonthlyMessage("2026-08", personId, charge.id, "2026-08-02T10:00:00+08:00");
  }

  // --- September 2026: fully paid, but corrected later (in October). ---
  await prisma.month.create({ data: { month: "2026-09", householdVersionId: versionA.id, openedAt: new Date("2026-09-01T09:00:00+08:00") } });
  const sep = await seedPastMonth("2026-09", versionA.id, {
    start: "2026-08-16",
    end: "2026-09-15",
    dueDate: "2026-09-25",
    currentChargesCents: 40100,
  });
  for (const charge of [...sep.rentAndRecurring, ...sep.utilities]) {
    await markPaid(charge.id, payerFor(charge), "2026-09-21");
  }
  await markBillPaid(sep.billId, "2026-09-22");
  for (const personId of [PERSON_IDS.priya, PERSON_IDS.sam, PERSON_IDS.jordan]) {
    const charge = [...sep.rentAndRecurring, ...sep.utilities].find((c) => c.personId === personId);
    if (charge) await seedMonthlyMessage("2026-09", personId, charge.id, "2026-09-02T10:00:00+08:00");
  }

  if (scenario !== "uploadOct") await seedOctober(versionA.id);

  // --- November 2026: no month, charges or bill are created. Home opens it on the first
  // request on or after 1 Nov (version B), with rent and recurring charges only and no bill. ---
  if (scenario === "draft") {
    // The synthetic bill PDF and what the parser reads from it (`ParsedBill`); nothing from a real bill.
    await prisma.billDraft.create({
      data: {
        month: "2026-11",
        filename: "2026-11-sample-bill.pdf",
        bytes: SAMPLE_PDF,
        parsedJson: BILL_FIXTURE,
        parseOk: true,
      },
    });
  }

  if (
    scenario === "unsent" ||
    scenario === "collecting" ||
    scenario === "dueToday" ||
    scenario === "fullyCollected" ||
    scenario === "settled"
  ) {
    // Opened through the same function Home uses, so November has version B's rent and recurring
    // charges. The bill is synthetic, with the Nov 2026 fixture total and the View bill board's
    // sample lines; due 16 Nov, saved on 1 Nov.
    const november = await openMonthIfNeeded(prisma, "2026-11");
    if (!november) throw new Error("No household version covers 2026-11");
    const bill = await prisma.bill.create({
      data: {
        month: "2026-11",
        currentChargesCents: 41230,
        billingPeriodStart: new Date("2026-10-03"),
        billingPeriodEnd: new Date("2026-11-02"),
        dueDate: new Date("2026-11-16"),
        lines: [
          { label: "Electricity", cents: 26845 },
          { label: "Gas", cents: 4120 },
          { label: "Water", cents: 10265 },
        ],
        parseStatus: "PARSED",
        createdAt: new Date("2026-11-01T09:00:00+08:00"),
        file: {
          create: {
            filename: "2026-11-sample-bill.pdf",
            mimeType: "application/pdf",
            sizeBytes: SAMPLE_PDF.byteLength,
            pageCount: SAMPLE_PDF_PAGES,
            bytes: SAMPLE_PDF,
          },
        },
      },
    });
    for (const c of buildUtilitiesCharges(NOV_2026_CONFIG, { month: "2026-11", currentChargesCents: 41230 })) {
      await insertCharge({ ...c, month: "2026-11", householdVersionId: november.householdVersionId, billId: bill.id });
    }

    if (scenario === "collecting" || scenario === "dueToday" || scenario === "fullyCollected" || scenario === "settled") {
      const charges = await prisma.charge.findMany({ where: { month: "2026-11" } });
      const find = (personId: string, category: string) => {
        const charge = charges.find((c) => c.personId === personId && c.category === category);
        if (!charge) throw new Error(`No ${category} charge for ${personId}`);
        return charge;
      };
      // Jordan and Priya are the payers who get a monthly message (Sam rides in Priya's).
      await seedMonthlyMessage("2026-11", PERSON_IDS.jordan, find(PERSON_IDS.jordan, "UTILITIES").id, "2026-11-02T10:00:00+08:00");
      await seedMonthlyMessage("2026-11", PERSON_IDS.priya, find(PERSON_IDS.priya, "UTILITIES").id, "2026-11-02T10:05:00+08:00");
      // Jordan's rent was due 1 Nov and is still unpaid, so it was nudged on 2 Nov.
      const jordanRent = find(PERSON_IDS.jordan, "RENT");
      await prisma.messageEvent.create({
        data: {
          month: "2026-11",
          personId: PERSON_IDS.jordan,
          kind: "NUDGE",
          chargeId: jordanRent.id,
          renderedText: `Hi ${PERSON_NAMES[PERSON_IDS.jordan]}! Paalala lang, yung Rent for 2026-11 ay due na. (seed placeholder text)`,
          openedAt: new Date("2026-11-02T18:00:00+08:00"),
        },
      });
      // Sam paid his rent early, and Priya paid her utilities, so some is back and coverage is partial.
      await markPaid(find(PERSON_IDS.sam, "RENT").id, PERSON_IDS.sam, "2026-11-03");
      await markPaid(find(PERSON_IDS.priya, "UTILITIES").id, PERSON_IDS.priya, "2026-11-03");
      // Jordan paid the rent he was nudged for; his utilities fall due on the 4th.
      if (scenario === "dueToday") await markPaid(jordanRent.id, PERSON_IDS.jordan, "2026-11-03");
      if (scenario === "fullyCollected") {
        // Jordan paid his utilities on the 4th and Priya paid Sam's on the 8th; Jordan's rent is
        // still unpaid, so the month is collecting with the bill fully covered.
        await markPaid(find(PERSON_IDS.jordan, "UTILITIES").id, PERSON_IDS.jordan, "2026-11-04");
        await markPaid(find(PERSON_IDS.sam, "UTILITIES").id, PERSON_IDS.priya, "2026-11-08");
      }
      if (scenario === "settled") {
        // Jordan's rent came late, the rest of what was left came on the 27th, and the bill went on
        // its due date. The owner's own charges are not payments to anyone.
        await markPaid(jordanRent.id, PERSON_IDS.jordan, "2026-11-05");
        const unpaid = await prisma.charge.findMany({
          where: { month: "2026-11", paidCents: null, personId: { not: PERSON_IDS.alex } },
        });
        for (const c of unpaid) await markPaid(c.id, c.payViaPersonId ?? c.personId, "2026-11-27");
        await markBillPaid(bill.id, "2026-11-16");
      }
    }
  }

  console.log(`Seeded ${scenario === "uploadOct" ? "Aug-Sep" : "Aug-Oct"} 2026 (history), scenario "${scenario}".`);
  console.log(`Run the backend with DEV_NOW=${SCENARIOS[scenario].devNow}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

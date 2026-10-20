import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { HOUSEHOLD_SCHEMA_VERSION } from "@/lib/household/config";
import { NOV_2026_CONFIG, PERSON_IDS, VERSION_A_CONFIG } from "@/lib/fixtures/household";
import { buildMonthCharges, buildUtilitiesCharges, type EngineCharge } from "@/lib/split/engine";

// Fictional household (see docs/SplitHouse — Data Model.md "Fixtures"). Dev
// branch only: refuses to run against production. Always wipes the domain
// tables first (never the Better Auth tables) and reseeds, so it is safe to
// rerun — `npm run seed:reset` is just this script.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: NODE_ENV is production.");
  process.exit(1);
}

const PERSON_NAMES: Record<string, string> = {
  [PERSON_IDS.alex]: "Alex",
  [PERSON_IDS.priya]: "Priya",
  [PERSON_IDS.sam]: "Sam",
  [PERSON_IDS.jordan]: "Jordan",
};

const PLACEHOLDER_PDF = Buffer.from("%PDF-1.4\n% placeholder bill, seed data only\n%%EOF\n");

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
      provider: "SP Group",
      currentChargesCents: billingPeriod.currentChargesCents,
      billingPeriodStart: new Date(billingPeriod.start),
      billingPeriodEnd: new Date(billingPeriod.end),
      dueDate: new Date(billingPeriod.dueDate),
      lines: [{ label: "Current Charges", cents: billingPeriod.currentChargesCents }],
      parseStatus: "PARSED",
      file: {
        create: {
          filename: `${month}-sample-bill.pdf`,
          mimeType: "application/pdf",
          sizeBytes: PLACEHOLDER_PDF.byteLength,
          bytes: PLACEHOLDER_PDF,
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

async function main() {
  await wipeDomainTables();
  await seedPeople();

  const versionA = await prisma.householdVersion.create({
    data: { startsFromMonth: "2026-08", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: VERSION_A_CONFIG },
  });
  const versionB = await prisma.householdVersion.create({
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
  for (const personId of [PERSON_IDS.priya, PERSON_IDS.sam, PERSON_IDS.jordan]) {
    const charge = [...sep.rentAndRecurring, ...sep.utilities].find((c) => c.personId === personId);
    if (charge) await seedMonthlyMessage("2026-09", personId, charge.id, "2026-09-02T10:00:00+08:00");
  }

  // --- October 2026: one short-paid charge, one unpaid, plus Sep's correction. ---
  await prisma.month.create({ data: { month: "2026-10", householdVersionId: versionA.id, openedAt: new Date("2026-10-01T09:00:00+08:00") } });
  const oct = await seedPastMonth("2026-10", versionA.id, {
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
    householdVersionId: versionA.id,
  });

  // --- November 2026 (current/go-live): rent and recurring only, no bill yet. ---
  await prisma.month.create({ data: { month: "2026-11", householdVersionId: versionB.id, openedAt: new Date("2026-11-01T09:00:00+08:00") } });
  await Promise.all(
    buildMonthCharges(NOV_2026_CONFIG, "2026-11").map((c) =>
      insertCharge({ ...c, month: "2026-11", householdVersionId: versionB.id }),
    ),
  );

  console.log("Seeded Aug-Oct 2026 (history) and Nov 2026 (current, upload state).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

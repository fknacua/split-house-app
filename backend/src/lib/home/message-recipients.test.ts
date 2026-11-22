import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildMonthCharges, buildUtilitiesCharges } from "@/lib/split/engine";
import {
  isChargeUnsent,
  messageRecipientIds,
  unsentAgainIds,
  unsentContext,
  unsentRecipientIds,
  type UnsentCharge,
} from "./message-recipients";

const OWNERS = new Set([PERSON_IDS.alex]);

const CHARGES = [
  ...buildMonthCharges(NOV_2026_CONFIG, "2026-11"),
  ...buildUtilitiesCharges(NOV_2026_CONFIG, { month: "2026-11", currentChargesCents: 41230 }),
];

describe("messageRecipientIds", () => {
  it("is Jordan and Priya: Sam's utilities ride in Priya's message and his direct rent needs none", () => {
    expect(new Set(messageRecipientIds(CHARGES, OWNERS))).toEqual(new Set([PERSON_IDS.jordan, PERSON_IDS.priya]));
  });

  it("is empty before the bill is in, because rent and recurring charges need no message", () => {
    expect(messageRecipientIds(buildMonthCharges(NOV_2026_CONFIG, "2026-11"), OWNERS)).toEqual([]);
  });

  it("lists each person once", () => {
    expect(messageRecipientIds([...CHARGES, ...CHARGES], OWNERS)).toHaveLength(2);
  });
});

describe("unsentRecipientIds", () => {
  const recipients = [PERSON_IDS.jordan, PERSON_IDS.priya];

  it("keeps everyone with no message event", () => {
    expect(unsentRecipientIds(recipients, [])).toEqual(recipients);
  });

  it("drops people who have one, and ignores events for people who need none", () => {
    expect(unsentRecipientIds(recipients, [PERSON_IDS.priya, PERSON_IDS.sam])).toEqual([PERSON_IDS.jordan]);
  });
});

describe("unsent again", () => {
  const { alex, priya, sam, jordan } = PERSON_IDS;
  const MONTH_OPENED = new Date("2026-11-01T09:00:00+08:00");
  const SENT = new Date("2026-11-02T10:00:00+08:00");
  const AFTER = new Date("2026-11-21T10:00:00+08:00");
  const BOOKED: UnsentCharge[] = CHARGES.map((c) => ({ ...c, paidCents: null, createdAt: MONTH_OPENED }));
  const monthly = (personId: string, openedAt = SENT) => ({ personId, kind: "MONTHLY", openedAt });
  const added = (personId: string, extra: Partial<UnsentCharge> = {}): UnsentCharge => ({
    personId,
    payViaPersonId: null,
    category: "ONE_OFF",
    amountCents: 3000,
    paidCents: null,
    createdAt: AFTER,
    ...extra,
  });
  const context = (charges: UnsentCharge[], messages = [monthly(priya), monthly(jordan)]) =>
    unsentContext(charges, messages, OWNERS);

  it("reads a charge added after the payer's last monthly message as unsent", () => {
    const fridge = added(jordan);
    expect(isChargeUnsent(fridge, context([...BOOKED, fridge]))).toBe(true);
  });

  it("reads charges from before the message as sent", () => {
    const ctx = context(BOOKED);
    expect(BOOKED.filter((c) => isChargeUnsent(c, ctx))).toEqual([]);
  });

  it("uses the payer for a charge paid via someone: Sam's lands on Priya", () => {
    const charges = [...BOOKED, added(sam, { payViaPersonId: priya })];
    expect(unsentAgainIds(charges, context(charges))).toEqual([priya]);
  });

  it.each([
    ["paid", added(jordan, { paidCents: 3000 })],
    ["the owner's own share", added(alex)],
  ])("never counts a charge that is %s", (_name, charge) => {
    expect(isChargeUnsent(charge, context([...BOOKED, charge]))).toBe(false);
  });

  it("clears once the monthly message goes out again", () => {
    const charges = [...BOOKED, added(jordan)];
    const later = new Date("2026-11-22T10:00:00+08:00");
    expect(unsentAgainIds(charges, context(charges, [monthly(priya), monthly(jordan), monthly(jordan, later)]))).toEqual([]);
  });

  it("is not unsent again before the first message: that person is still in the first round", () => {
    const charges = [...BOOKED, added(jordan)];
    const ctx = context(charges, [monthly(priya)]);
    expect(unsentAgainIds(charges, ctx)).toEqual([]);
    // The one-off waits for Jordan's first message, as his utilities do.
    expect(isChargeUnsent(added(jordan), ctx)).toBe(true);
  });

  it.each([
    ["utilities", "UTILITIES", true],
    ["aircon", "AIRCON", true],
    ["a one-off", "ONE_OFF", true],
    ["rent", "RENT", false],
    ["a recurring charge", "RECURRING", false],
  ])("before the first message, reads %s as unsent: %s", (_name, category, expected) => {
    const charge = added(jordan, { category, createdAt: MONTH_OPENED });
    expect(isChargeUnsent(charge, context([...BOOKED, charge], []))).toBe(expected);
  });

  it("reads nothing as unsent for someone who gets no message (before the bill)", () => {
    const rentOnly = buildMonthCharges(NOV_2026_CONFIG, "2026-11").map((c) => ({ ...c, paidCents: null, createdAt: MONTH_OPENED }));
    const aircon = added(jordan, { category: "AIRCON" });
    expect(isChargeUnsent(aircon, context([...rentOnly, aircon], []))).toBe(false);
  });
});

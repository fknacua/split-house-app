import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildMonthCharges, buildUtilitiesCharges } from "@/lib/split/engine";
import { messageRecipientIds, unsentRecipientIds } from "./message-recipients";

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

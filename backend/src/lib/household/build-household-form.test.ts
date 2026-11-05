import { householdFormResponseSchema, type HouseholdConfig, type PersonColor } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { JAN_2027_CONFIG, NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildHouseholdForm } from "./build-household-form";

const PEOPLE: { id: string; name: string; whatsappE164: string | null; color: PersonColor; isOwner: boolean }[] = [
  { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", whatsappE164: "+6590000001", color: "BLUE", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null, color: "ORANGE", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: "+6590000003", color: "GREEN", isOwner: false },
];

const form = (personId: string, activeConfig: HouseholdConfig | null = NOV_2026_CONFIG) =>
  buildHouseholdForm({
    month: "2026-12",
    config: NOV_2026_CONFIG,
    activeConfig,
    personId,
    people: PEOPLE,
  });

describe("buildHouseholdForm", () => {
  it("writes the remove dialog for a tenant, with the month and their deposit", () => {
    const body = householdFormResponseSchema.parse(form(PERSON_IDS.jordan));
    expect(body.removeDialog).toEqual({
      title: "Remove Jordan from household?",
      body: "From December 2026 they won’t get any charges or messages, and their utility shares leave the total.",
      roomLine:
        "Room 3 becomes empty and its aircon moves to You and Priya. Their rent was never part of the landlord rent, so your rent doesn’t change. You simply stop receiving it.",
      keeps: ["Past months and History stay as they are", "Their $950.00 deposit stays recorded until you return it"],
    });
  });

  it("moves the rent as well when their room is in the total", () => {
    expect(form(PERSON_IDS.sam).removeDialog?.roomLine).toBe(
      "Room 2 becomes empty. Its $950.00 rent and its aircon move to You and Priya.",
    );
  });

  it("says only you take the room over when there is no primary tenant", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.filter((p) => p.personId !== PERSON_IDS.priya),
    };
    const body = buildHouseholdForm({ month: "2026-12", config, activeConfig: config, personId: PERSON_IDS.jordan, people: PEOPLE });
    expect(body.removeDialog?.roomLine).toContain("its aircon moves to you.");
  });

  it("has no remove dialog for the primary tenant, and no deposit line without a deposit", () => {
    expect(form(PERSON_IDS.priya).removeDialog).toBeNull();
    expect(form(PERSON_IDS.sam).removeDialog?.keeps).toEqual(["Past months and History stay as they are"]);
  });

  it("adds the third line when something goes with them", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      recurring: [{ id: "r", label: "Parking", amountCents: 1000, personId: PERSON_IDS.sam }],
    };
    const body = buildHouseholdForm({ month: "2026-12", config, activeConfig: config, personId: PERSON_IDS.sam, people: PEOPLE });
    expect(body.removeDialog?.keeps.at(-1)).toBe("Their recurring charges go with them");
  });

  it("gives a tenant their values, text and the link to remove them", () => {
    const body = householdFormResponseSchema.parse(form(PERSON_IDS.jordan));
    expect(body.title).toBe("Edit Jordan");
    expect(body.viewTitle).toBe("Jordan");
    expect(body).not.toHaveProperty("sub");
    expect(body.values).toMatchObject({ rentDueDay: 1, utilitiesDueDay: 4, rentViaPersonId: null, depositCents: 95000 });
    expect(body.view.amounts).toEqual([
      { label: "Rent due", value: "1st" },
      { label: "Utilities due", value: "4th" },
      { label: "Deposit held (SGD)", value: "950.00" },
    ]);
    expect(body.secondaryAction).toEqual({ label: "Remove from household", kind: "remove-person" });
  });

  it("shows a tenant's room read-only, with their shares only on View", () => {
    const body = form(PERSON_IDS.jordan);
    const rows = [
      { label: "Room", value: "Room 3" },
      { label: "Rent (SGD)", value: "$950.00" },
      { label: "Aircon units", value: "1" },
    ];
    expect(body.room).toEqual(rows);
    expect(body.view.room).toEqual([rows[0], rows[1], { label: "Utility shares", value: "1" }, rows[2]]);
  });

  it("shows an em dash for no number, None for no deposit and the route as text", () => {
    const { view, values } = form(PERSON_IDS.sam);
    expect(view.details[1]).toEqual({ label: "WhatsApp", value: "—" });
    expect(view.amounts.at(-1)?.value).toBe("None");
    expect(view.amounts[1]).toEqual({ label: "Utilities due", value: "—" });
    expect(view.routes).toEqual([
      { label: "Rent paid", value: "Directly" },
      { label: "Utilities paid", value: "Via Priya" },
    ]);
    expect(values.utilitiesViaPersonId).toBe(PERSON_IDS.priya);
  });

  it("gives the primary tenant no deposit, no room and a Cancel link", () => {
    const body = householdFormResponseSchema.parse(form(PERSON_IDS.priya));
    expect(body.title).toBe("Edit Priya");
    expect(body.values.depositCents).toBeNull();
    expect(body.room).toEqual([]);
    expect(body.view.room).toEqual([]);
    expect(body.view.amounts.map((r) => r.label)).toEqual(["Rent due", "Utilities due"]);
    expect(body.secondaryAction).toEqual({ label: "Cancel", kind: "cancel" });
  });

  it("offers eight colors without Teal, and the selected one's name", () => {
    const body = form(PERSON_IDS.jordan);
    expect(body.colorName).toBe("Green");
    expect(body.swatches).toHaveLength(8);
    expect(body.swatches.some((s) => s.color === "TEAL")).toBe(false);
    expect(body.swatches[0]).toEqual({ color: "BLUE", name: "Blue" });
  });

  it("offers only people who pay directly as Sent via, not the owner", () => {
    expect(form(PERSON_IDS.jordan).sentViaOptions).toEqual([{ personId: PERSON_IDS.priya, name: "Priya" }]);
  });

  it("offers nobody to a tenant someone already pays via", () => {
    const config: HouseholdConfig = {
      ...NOV_2026_CONFIG,
      people: NOV_2026_CONFIG.people.map((p) =>
        p.personId === PERSON_IDS.sam ? { ...p, routes: { RENT: { kind: "VIA", viaPersonId: PERSON_IDS.jordan } } } : p,
      ),
    };
    const body = buildHouseholdForm({
      month: "2026-12",
      config,
      activeConfig: config,
      personId: PERSON_IDS.jordan,
      people: PEOPLE,
    });
    expect(body.sentViaOptions).toEqual([]);
  });

  it("gives the primary tenant no routes to view or pick from", () => {
    const body = form(PERSON_IDS.priya);
    expect(body.sentViaOptions).toEqual([]);
    expect(body.view.routes).toEqual([]);
  });

  it("names next month in the dated group's title", () => {
    expect(form(PERSON_IDS.jordan).datedTitle).toBe("From December 2026");
  });

  it("adds a note only while the saved values differ from the active month's", () => {
    expect(form(PERSON_IDS.jordan).pendingNote).toBeNull();
    expect(form(PERSON_IDS.jordan, JAN_2027_CONFIG).pendingNote).toBe("These take effect from December 2026.");
  });
});

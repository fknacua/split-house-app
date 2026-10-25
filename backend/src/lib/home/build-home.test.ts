import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { buildMonthCharges } from "@/lib/split/engine";
import { buildHome, type HomeChargeRow, type HomeInput, type HomePerson } from "./build-home";

const PEOPLE: HomePerson[] = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

/** The November rent and recurring charges, as the database would return them. */
function novemberCharges(): HomeChargeRow[] {
  return buildMonthCharges(NOV_2026_CONFIG, "2026-11").map((c, i) => ({
    id: `charge-${i}`,
    personId: c.personId,
    payViaPersonId: c.payViaPersonId,
    category: c.category,
    label: c.label,
    amountCents: c.amountCents,
    dueDate: c.dueDate ? new Date(c.dueDate) : null,
    paidCents: null,
  }));
}

function input(overrides: Partial<HomeInput> = {}): HomeInput {
  return {
    month: "2026-11",
    today: "2026-11-01",
    status: "bill_missing",
    config: NOV_2026_CONFIG,
    people: PEOPLE,
    charges: novemberCharges(),
    ...overrides,
  };
}

describe("buildHome, bill_missing on 1 Nov", () => {
  const home = buildHome(input());

  it("names the month", () => {
    expect(home.month).toBe("2026-11");
    expect(home.monthName).toBe("November 2026");
    expect(home.status).toBe("bill_missing");
  });

  it("has one row per charge by due date, with no row for the owner", () => {
    expect(home.rows.map((r) => [r.dueDate, r.title])).toEqual([
      ["2026-11-01", "Rent · Jordan"],
      ["2026-11-04", "Utilities · Jordan"],
      ["2026-11-07", "Rent · Priya"],
      ["2026-11-07", "Starhub · Priya"],
      ["2026-11-07", "Utilities · Priya"],
      ["2026-11-07", "Utilities · Sam"],
      ["2026-11-16", "Utilities bill"],
      ["2026-11-28", "Rent · Sam"],
    ]);
  });

  it("shows the rent due today open, shaded, with Mark paid", () => {
    const row = home.rows[0];
    expect(row.badge).toEqual({ label: "Due today", tone: "info" });
    expect(row.tint).toBe("info");
    expect(row.expanded).toBe(true);
    expect(row.amount).toBe("$950.00");
    expect(row.detail).toBeNull();
    expect(row.actions).toEqual([
      { label: "Mark paid", tone: "outline", icon: "check", target: { kind: "mark-paid", chargeId: row.id } },
    ]);
  });

  it("shows every other charge as upcoming and closed", () => {
    const sam = home.rows.find((r) => r.title === "Rent · Sam")!;
    expect(sam.badge).toEqual({ label: "Upcoming", tone: "neutral" });
    expect(sam.tint).toBe("none");
    expect(sam.expanded).toBe(false);
    expect(sam.actions).toHaveLength(1);
  });

  it("projects utilities rows from the config, with no amount yet and no actions", () => {
    const jordan = home.rows.find((r) => r.title === "Utilities · Jordan")!;
    expect(jordan).toMatchObject({ amount: "—", badge: { label: "Needs bill", tone: "neutral" }, actions: [] });
    expect(jordan.note).toBe("Worked out once the utilities bill is uploaded.");
  });

  it("routes Sam's utilities via Priya, on Priya's due day", () => {
    const sam = home.rows.find((r) => r.title === "Utilities · Sam")!;
    expect(sam.dueDate).toBe("2026-11-07");
    expect(sam.detail).toBe("Pays via Priya");
    expect(sam.link.target).toEqual({ kind: "recipient", month: "2026-11", personId: PERSON_IDS.priya });
  });

  it("dates the bill row from the config and links to the upload", () => {
    const bill = home.rows.find((r) => r.id === "bill")!;
    expect(bill).toMatchObject({
      dueDate: "2026-11-16",
      amount: "—",
      detail: "You pay utilities",
      badge: { label: "Not uploaded", tone: "neutral" },
      actions: [],
      link: { label: "Upload bill", target: { kind: "bill-upload", month: "2026-11" } },
    });
  });

  it("has the waiting hero and the upload footer", () => {
    expect(home.hero.dateLine).toBe("1 Nov · Step 1 of 3");
    expect(home.hero.steps.map((s) => s.state)).toEqual(["current", "todo", "todo"]);
    expect(home.hero.compactStatus).toBe("Waiting on the utilities bill");
    expect(home.hero.body.tiles).toEqual([
      { label: "You’re fronting", value: "$3,602.50" },
      { label: "Utilities bill coverage", value: "No bill yet" },
    ]);
    expect(home.primaryAction).toEqual({
      label: "Upload utilities bill",
      icon: "upload",
      target: { kind: "bill-upload", month: "2026-11" },
    });
  });
});

describe("buildHome, draft on 1 Nov", () => {
  const draft = buildHome(input({ status: "draft" }));
  const missing = buildHome(input());

  it("puts the draft notice in the hero", () => {
    expect(draft.status).toBe("draft");
    expect(draft.hero.notice).toEqual({
      title: "Unfinished bill draft",
      text: "You started uploading a bill for November and didn’t save it.",
      actions: [
        { label: "Continue", tone: "primary", icon: null, target: { kind: "bill-draft-continue", month: "2026-11" } },
        { label: "Discard draft", tone: "outline", icon: null, target: { kind: "bill-draft-discard", month: "2026-11" } },
      ],
    });
  });

  it("is otherwise the same as bill_missing: rows and hero text", () => {
    expect(draft.rows).toEqual(missing.rows);
    expect({ ...draft.hero, notice: null }).toEqual(missing.hero);
  });

  it("turns the footer into Continue bill upload, which opens the draft", () => {
    expect(draft.primaryAction).toEqual({
      label: "Continue bill upload",
      icon: "file-pen",
      target: { kind: "bill-draft-continue", month: "2026-11" },
    });
  });

  it("has no hero notice when there is no draft", () => {
    expect(missing.hero.notice).toBeNull();
  });
});

describe("buildHome, paid charges", () => {
  it("drops Mark paid and the due-today shading, and lowers what you're fronting", () => {
    const charges = novemberCharges().map((c) =>
      c.personId === PERSON_IDS.jordan ? { ...c, paidCents: c.amountCents } : c,
    );
    const home = buildHome(input({ charges }));
    expect(home.rows[0]).toMatchObject({
      badge: { label: "Paid", tone: "success" },
      tint: "none",
      expanded: false,
      actions: [],
    });
    expect(home.hero.body.tiles[0].value).toBe("$2,652.50");
  });

  it("never shows a negative fronting amount", () => {
    const charges = novemberCharges().map((c) => ({ ...c, paidCents: c.amountCents + 1000 }));
    expect(buildHome(input({ charges })).hero.body.tiles[0].value).toBe("$0.00");
  });
});

import { sendResponseSchema, type SendResponse } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { HOME_BADGES } from "@/lib/home/badges";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { renderMonthlyMessage, renderNudgeMessage } from "@/lib/messages/render";
import { whatsappLink } from "@/lib/messages/whatsapp-link";
import { buildSend, sendToOptions, type SendCharge, type SendInput, type SendMessageEvent, type SendPick } from "./build-send";

const { alex, priya, sam, jordan } = PERSON_IDS;

function charge(
  id: string,
  personId: string,
  category: ChargeCategory,
  label: string,
  amountCents: number,
  due: string | null,
  extra: Partial<SendCharge> = {},
): SendCharge {
  return {
    id,
    personId,
    month: "2026-11",
    category,
    label,
    amountCents,
    dueDate: due ? new Date(`${due}T00:00:00+08:00`) : null,
    payViaPersonId: null,
    paidCents: null,
    ...extra,
  };
}

// November with the bill saved: Priya collects Sam's utilities and aircon, Jordan pays directly and
// still owes an October correction.
const CHARGES: SendCharge[] = [
  charge("alex-utilities", alex, "UTILITIES", "Utilities", 12369, null),
  charge("priya-rent", priya, "RENT", "Rent", 167500, "2026-11-07"),
  charge("priya-utilities", priya, "UTILITIES", "Utilities", 12369, "2026-11-07"),
  charge("priya-aircon", priya, "AIRCON", "Aircon", 3667, "2026-11-07"),
  charge("priya-starhub", priya, "RECURRING", "Starhub", 2750, "2026-11-07"),
  charge("sam-rent", sam, "RENT", "Rent", 95000, "2026-11-28"),
  charge("sam-utilities", sam, "UTILITIES", "Utilities", 8246, null, { payViaPersonId: priya }),
  charge("sam-aircon", sam, "AIRCON", "Aircon", 1833, "2026-11-07", { payViaPersonId: priya }),
  charge("jordan-rent", jordan, "RENT", "Rent", 95000, "2026-11-01"),
  charge("jordan-utilities", jordan, "UTILITIES", "Utilities", 8246, "2026-11-04"),
  charge("jordan-aircon", jordan, "AIRCON", "Aircon", 1833, "2026-11-04"),
  charge("jordan-oct-correction", jordan, "CORRECTION", "Correction", 1500, "2026-10-28", { month: "2026-10" }),
];

const at = (iso: string) => new Date(iso);

const MESSAGES: SendMessageEvent[] = [
  { personId: priya, kind: "MONTHLY", chargeId: null, openedAt: at("2026-11-02T10:00:00+08:00") },
  { personId: priya, kind: "MONTHLY", chargeId: null, openedAt: at("2026-11-03T10:00:00+08:00") },
  { personId: jordan, kind: "MONTHLY", chargeId: null, openedAt: at("2026-11-02T11:00:00+08:00") },
  { personId: jordan, kind: "NUDGE", chargeId: "jordan-rent", openedAt: at("2026-11-05T09:00:00+08:00") },
  // One nudge about two charges: two events at the same moment.
  { personId: jordan, kind: "NUDGE", chargeId: "jordan-rent", openedAt: at("2026-11-06T09:00:00+08:00") },
  { personId: jordan, kind: "NUDGE", chargeId: "jordan-utilities", openedAt: at("2026-11-06T09:00:00+08:00") },
];

const PEOPLE = [
  { id: alex, name: "Alex", whatsappE164: null },
  { id: priya, name: "Priya", whatsappE164: "+6580000001" },
  { id: sam, name: "Sam", whatsappE164: "+6580000002" },
  { id: jordan, name: "Jordan", whatsappE164: "+6580000003" },
];

function input(overrides: Partial<SendInput> = {}): SendInput {
  return {
    mode: "monthly",
    month: "2026-11",
    today: "2026-11-08",
    config: NOV_2026_CONFIG,
    templates: DEFAULT_MESSAGE_TEMPLATES,
    people: PEOPLE,
    billCents: 41230,
    charges: CHARGES,
    messages: MESSAGES,
    ...overrides,
  };
}

/** Builds the sheet and checks it parses with the shared schema. */
function build(overrides: Partial<SendInput>, pick: SendPick): SendResponse {
  return sendResponseSchema.parse(buildSend(input(overrides), pick));
}

const names = PEOPLE.map((p) => ({ id: p.id, name: p.name }));
const byId = (ids: string[]) => ids.map((id) => CHARGES.find((c) => c.id === id)!);

describe("sendToOptions", () => {
  it("monthly: everyone who gets a monthly message, never the owner or someone paying via another", () => {
    expect(sendToOptions(input())).toEqual([
      { personId: priya, name: "Priya", detail: "Sent 3 Nov", tone: "default" },
      { personId: jordan, name: "Jordan", detail: "Sent 2 Nov", tone: "default" },
    ]);
  });

  it("monthly: says when the message has not gone out", () => {
    expect(sendToOptions(input({ messages: [] })).map((o) => o.detail)).toEqual([
      "Monthly message not sent",
      "Monthly message not sent",
    ]);
  });

  it("nudge: everyone with an overdue charge after their message, with the count and amount, collected ones included", () => {
    expect(sendToOptions(input({ mode: "nudge" }))).toEqual([
      { personId: priya, name: "Priya", detail: "6 overdue · $1,963.65", tone: "danger" },
      { personId: jordan, name: "Jordan", detail: "4 overdue · $1,065.79", tone: "danger" },
    ]);
  });

  it("nudge: leaves out someone whose monthly message has not gone out", () => {
    const messages = MESSAGES.filter((m) => m.personId !== priya);
    expect(sendToOptions(input({ mode: "nudge", messages })).map((o) => o.personId)).toEqual([jordan]);
  });

  it("nudge: leaves out paid charges, credits and charges not yet due", () => {
    const charges = CHARGES.map((c) => (c.personId === jordan ? { ...c, paidCents: c.amountCents } : c));
    charges.push(charge("jordan-credit", jordan, "CORRECTION", "Credit", -500, "2026-11-01"));
    expect(sendToOptions(input({ mode: "nudge", charges, today: "2026-11-06" })).map((o) => o.personId)).toEqual([]);
  });
});

describe("buildSend with nobody picked", () => {
  it("holds only the To list and the footer", () => {
    const sheet = build({}, { personId: null });
    expect(sheet).toMatchObject({
      mode: "monthly",
      month: "2026-11",
      title: "Send message",
      subtitle: "Nov 2026",
      to: { personId: null, placeholder: "Choose a person" },
      total: null,
      charges: null,
      history: null,
      message: null,
      note: null,
      send: { label: "Send on WhatsApp", target: null },
      shareBill: { label: "Share bill", enabled: true, target: { kind: "share-bill", month: "2026-11" } },
    });
    expect(sheet.to.options).toHaveLength(2);
  });
});

describe("buildSend, monthly", () => {
  it("shows the Total with own charges first, largest first, and what they collect", () => {
    const sheet = build({}, { personId: priya });
    expect(sheet.total).toEqual({
      amount: "$1,963.65",
      sub: "6 charges · due 7 Nov",
      paysFor: "Pays for: Sam",
      chip: HOME_BADGES.sentUnpaid,
      rows: [
        { title: "Rent · Nov", amount: "$1,675.00" },
        { title: "Utilities · Nov", amount: "$123.69" },
        { title: "Aircon · Nov", amount: "$36.67" },
        { title: "Starhub · Nov", amount: "$27.50" },
        { title: "Utilities · Sam · Nov", amount: "$82.46" },
        { title: "Aircon · Sam · Nov", amount: "$18.33" },
      ],
    });
    expect(sheet.charges).toBeNull();
  });

  it("lists every send and offers Send again, sending the breakdown and recording MONTHLY", () => {
    const sheet = build({}, { personId: priya });
    const text = renderMonthlyMessage({
      month: "2026-11",
      recipientId: priya,
      recipientName: "Priya",
      config: NOV_2026_CONFIG,
      templates: DEFAULT_MESSAGE_TEMPLATES,
      billCents: 41230,
      people: names,
      charges: CHARGES,
    }).text;
    expect(sheet.history).toEqual({
      title: "Sent",
      rows: [
        { label: "Sent", date: "2 Nov" },
        { label: "Sent again", date: "3 Nov" },
      ],
    });
    expect(sheet.message).toMatchObject({
      label: "Message",
      meta: "Monthly breakdown template",
      empty: null,
      editTemplate: { label: "Edit template", target: { kind: "edit-template", template: "MONTHLY" } },
    });
    expect(sheet.message?.preview?.text).toBe(text);
    expect(sheet.send).toEqual({
      label: "Send again",
      target: {
        kind: "send-whatsapp",
        url: whatsappLink("+6580000001", text),
        record: { kind: "MONTHLY", month: "2026-11", personId: priya },
      },
    });
  });

  it("reads Not sent and Send on WhatsApp before the first send", () => {
    const sheet = build({ messages: [] }, { personId: jordan });
    expect(sheet.total).toMatchObject({ chip: HOME_BADGES.notSent, sub: "4 charges · due 28 Oct", paysFor: null });
    expect(sheet.history).toBeNull();
    expect(sheet.send.label).toBe("Send on WhatsApp");
  });

  it("reads Paid once everything this month is paid", () => {
    const charges = CHARGES.map((c) => (c.personId === jordan && c.month === "2026-11" ? { ...c, paidCents: c.amountCents } : c));
    expect(build({ charges }, { personId: jordan }).total?.chip).toEqual(HOME_BADGES.paid);
  });

  it("can't send or share before the bill is saved", () => {
    const sheet = build({ billCents: null }, { personId: priya });
    expect(sheet.send.target).toBeNull();
    expect(sheet.shareBill.enabled).toBe(false);
  });

  it("can't send without a WhatsApp number, and says why", () => {
    const people = PEOPLE.map((p) => (p.id === jordan ? { ...p, whatsappE164: null } : p));
    const sheet = build({ people }, { personId: jordan });
    expect(sheet.note).toBe("No WhatsApp number is set up for Jordan.");
    expect(sheet.send.target).toBeNull();
  });

  it("opens the person's own template when they have one", () => {
    const templates = {
      ...DEFAULT_MESSAGE_TEMPLATES,
      overrides: [{ personId: jordan, kind: "MONTHLY" as const, text: "Hi {name}!\n\n{lines}" }],
    };
    expect(build({ templates }, { personId: jordan }).message?.editTemplate.target).toEqual({
      kind: "edit-template",
      template: "MONTHLY",
      personId: jordan,
    });
  });
});

describe("buildSend, nudge", () => {
  const nudge = (pick: SendPick, overrides: Partial<SendInput> = {}) => build({ mode: "nudge", ...overrides }, pick);

  it("ticks the tapped charge and lists every overdue one, earliest due first", () => {
    const sheet = nudge({ personId: jordan, tapped: "jordan-utilities" });
    expect(sheet.title).toBe("Send nudge message");
    expect(sheet.total).toBeNull();
    expect(sheet.charges).toEqual({
      label: "Overdue charges",
      amount: "$82.46",
      sub: "Utilities · Nov",
      selected: "1 of 4 overdue selected",
      chip: { label: "Overdue 4 days", tone: "danger" },
      expandable: true,
      rows: [
        {
          chargeId: "jordan-oct-correction",
          title: "Correction · Oct",
          amount: "$15.00",
          detail: "Due 28 Oct",
          chip: { label: "Overdue 11 days", tone: "danger" },
          ticked: false,
        },
        {
          chargeId: "jordan-rent",
          title: "Rent · Nov",
          amount: "$950.00",
          detail: "Due 1 Nov",
          chip: { label: "Overdue 7 days", tone: "danger" },
          ticked: false,
        },
        {
          chargeId: "jordan-utilities",
          title: "Utilities · Nov",
          amount: "$82.46",
          detail: "Due 4 Nov",
          chip: { label: "Overdue 4 days", tone: "danger" },
          ticked: true,
        },
        {
          chargeId: "jordan-aircon",
          title: "Aircon · Nov",
          amount: "$18.33",
          detail: "Due 4 Nov",
          chip: { label: "Overdue 4 days", tone: "danger" },
          ticked: false,
        },
      ],
    });
  });

  it("ticks the earliest due when the tapped charge is not one of the overdue ones", () => {
    for (const tapped of [null, "jordan-nothing", "sam-rent"]) {
      const rows = nudge({ personId: jordan, tapped }).charges!.rows;
      expect(rows.filter((r) => r.ticked).map((r) => r.chargeId)).toEqual(["jordan-oct-correction"]);
    }
  });

  it("shows the nudges about the ticked charges, one row per send, and offers Nudge again", () => {
    const sheet = nudge({ personId: jordan, ticked: ["jordan-rent", "jordan-utilities"] });
    expect(sheet.history).toEqual({
      title: "Nudges",
      rows: [
        { label: "Nudged", date: "5 Nov" },
        { label: "Nudged again", date: "6 Nov" },
      ],
    });
    expect(sheet.send.label).toBe("Nudge again");
    expect(nudge({ personId: jordan, tapped: "jordan-aircon" }).history).toBeNull();
    expect(nudge({ personId: jordan, tapped: "jordan-aircon" }).send.label).toBe("Send on WhatsApp");
  });

  it("totals the ticked charges, takes the longest-overdue chip, and nudges about exactly them", () => {
    const sheet = nudge({ personId: jordan, ticked: ["jordan-utilities", "jordan-rent", "jordan-nothing"] });
    const text = renderNudgeMessage({
      recipientId: jordan,
      recipientName: "Jordan",
      month: "2026-11",
      config: NOV_2026_CONFIG,
      templates: DEFAULT_MESSAGE_TEMPLATES,
      people: names,
      charges: byId(["jordan-rent", "jordan-utilities"]),
    }).text;
    expect(sheet.charges).toMatchObject({
      amount: "$1,032.46",
      sub: "2 charges",
      selected: "2 of 4 overdue selected",
      chip: { label: "Overdue 7 days" },
    });
    expect(sheet.message).toMatchObject({ meta: "Nudge template", empty: null });
    expect(sheet.message?.preview?.text).toBe(text);
    expect(sheet.send.target).toEqual({
      kind: "send-whatsapp",
      url: whatsappLink("+6580000003", text),
      record: { kind: "NUDGE", month: "2026-11", personId: jordan, chargeIds: ["jordan-rent", "jordan-utilities"] },
    });
  });

  it("with nothing ticked, has no message and can't send", () => {
    const sheet = nudge({ personId: jordan, ticked: [] });
    expect(sheet.charges).toMatchObject({ amount: "$0.00", sub: "No charge selected", chip: null });
    expect(sheet.message).toMatchObject({ preview: null, empty: "Pick at least one charge to see the message." });
    expect(sheet.send).toEqual({ label: "Send on WhatsApp", target: null });
  });

  it("lists the charges Priya collects, nudging them in their own section", () => {
    const sheet = nudge({ personId: priya, ticked: ["priya-rent", "sam-utilities"] });
    expect(sheet.charges?.rows.map((r) => r.title)).toEqual([
      "Rent · Nov",
      "Starhub · Nov",
      "Utilities · Nov",
      "Utilities · Sam · Nov",
      "Aircon · Nov",
      "Aircon · Sam · Nov",
    ]);
    expect(sheet.message?.preview?.sections.map((s) => [s.title, s.subtotal])).toEqual([
      ["Yours:", "$1,675.00"],
      ["Sam’s (please collect):", "$82.46"],
    ]);
  });

  it("with one overdue charge, the card reads Charge and does not open", () => {
    const sheet = nudge({ personId: jordan }, { today: "2026-11-02", charges: CHARGES.filter((c) => c.month === "2026-11") });
    expect(sheet.charges).toMatchObject({ label: "Charge", selected: null, expandable: false, sub: "Rent · Nov" });
  });

  it("opens the person's own nudge template when they have one", () => {
    const templates = {
      ...DEFAULT_MESSAGE_TEMPLATES,
      overrides: [{ personId: jordan, kind: "NUDGE" as const, text: "Hi {name}!\n\n{lines}" }],
    };
    expect(nudge({ personId: jordan }, { templates }).message?.editTemplate.target).toEqual({
      kind: "edit-template",
      template: "NUDGE",
      personId: jordan,
    });
  });
});

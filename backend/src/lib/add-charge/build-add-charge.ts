import {
  formatCents,
  formatDateMedium,
  formatMonthShortLabel,
  type AddChargeConfirm,
  type AddChargeConfirmRow,
  type AddChargePreview,
  type AddChargePreviewRow,
  type AddChargeSheet,
  type AddChargeValues,
  type HouseholdConfig,
  type PersonColor,
  type PersonConfig,
} from "@splithouse/shared";
import { countText, SHARE_SCALE } from "@/lib/household/amount-text";
import { roomOf } from "@/lib/household/room-amounts";
import { viaOf } from "@/lib/household/route-via";
import { remaindersOf } from "@/lib/household/split-remainders";
import {
  buildAirconCharges,
  buildPersonalOneOffCharge,
  buildSharedOneOffCharges,
  type EngineCharge,
} from "@/lib/split/engine";

/** The label every aircon servicing charge is stored under. */
export const AIRCON_LABEL = "Aircon servicing";

const OWNER_NAME = "You";
const EMPTY_PREVIEW = "Enter an amount and choose a split to see who pays what.";

/** The words the split method shows as in the confirm dialog. */
const METHOD_WORDS = { AIRCON: "Per unit", EQUAL: "Equal", PER_SHARE: "Per share", CUSTOM: "Custom" } as const;

/** A person row, as much of it as the sheet needs. */
export interface AddChargePerson {
  id: string;
  name: string;
  color: PersonColor;
}

/** What the builders read: the newest opened month, its pinned config and everyone's name and color. */
export interface AddChargeInput {
  month: string;
  config: HouseholdConfig;
  people: AddChargePerson[];
}

/** The fields as the sheet opens. */
const OPENING_VALUES: AddChargeValues = {
  kind: null,
  label: "",
  amountCents: null,
  scope: "SHARED",
  personId: null,
  split: "EQUAL",
  customAmounts: [],
  dueDate: null,
};

/** The owner, the primary tenant, then the tenants in household order: the order every list in the sheet uses. */
function splitOrder(config: HouseholdConfig): PersonConfig[] {
  const rank = { OWNER: 0, PRIMARY: 1, TENANT: 2 } as const;
  return [...config.people].sort((a, b) => rank[a.role] - rank[b.role]);
}

/** Looks up names and colors, with the owner as `You`. */
function lookup(input: AddChargeInput) {
  const rows = new Map(input.people.map((p) => [p.id, p]));
  const owner = input.config.people.find((p) => p.role === "OWNER");
  return {
    name: (personId: string) => (personId === owner?.personId ? OWNER_NAME : (rows.get(personId)?.name ?? "Someone")),
    plainName: (personId: string) => rows.get(personId)?.name ?? "Someone",
    color: (personId: string): PersonColor => rows.get(personId)?.color ?? "SLATE",
  };
}

/** Everyone except the owner, in household order: the Personal Who list. */
function whoOptions(input: AddChargeInput) {
  const { plainName } = lookup(input);
  return input.config.people.filter((p) => p.role !== "OWNER").map((p) => ({ personId: p.personId, name: plainName(p.personId) }));
}

/** The sum of the typed custom amounts for people in the household; an empty field counts as $0. */
function customSum(config: HouseholdConfig, values: AddChargeValues): number {
  const ids = new Set(config.people.map((p) => p.personId));
  return values.customAmounts.filter((c) => ids.has(c.personId)).reduce((sum, c) => sum + (c.amountCents ?? 0), 0);
}

/** True when the typed custom amounts are all $0 or more and add up to the amount. */
function customAddsUp(config: HouseholdConfig, values: AddChargeValues, totalCents: number): boolean {
  return values.customAmounts.every((c) => (c.amountCents ?? 0) >= 0) && customSum(config, values) === totalCents;
}

/**
 * The split the fields make, through the split engine, whatever the label and due date: the preview shows it before
 * they are filled. Null while there is nothing to split: nothing picked, no amount above $0, nobody picked for
 * Personal, or Custom amounts that don't add up.
 */
function splitCharges(input: AddChargeInput, values: AddChargeValues, airconLabel: string): EngineCharge[] | null {
  const { config } = input;
  const { kind, amountCents, dueDate } = values;
  if (kind === null || amountCents === null || amountCents <= 0) return null;
  if (kind === "AIRCON") return buildAirconCharges(config, { label: airconLabel, totalCents: amountCents, dueDate });

  const basics = { label: values.label.trim(), totalCents: amountCents, dueDate };
  if (values.scope === "PERSONAL") {
    if (!values.personId || !whoOptions(input).some((o) => o.personId === values.personId)) return null;
    return [buildPersonalOneOffCharge(config, basics, values.personId)];
  }
  if (values.split === "CUSTOM") {
    if (!customAddsUp(config, values, amountCents)) return null;
    const parts = values.customAmounts
      .filter((c) => config.people.some((p) => p.personId === c.personId))
      .map((c) => ({ personId: c.personId, amountCents: c.amountCents ?? 0 }));
    return buildSharedOneOffCharges(config, basics, { method: "CUSTOM", parts });
  }
  return buildSharedOneOffCharges(config, basics, { method: values.split });
}

/**
 * The charges the fields make, through the split engine, or null while the fields can't make any yet: nothing picked,
 * no amount above $0, no due date, no label for Other, nobody picked for Personal, or Custom amounts that don't add up.
 * The save stores exactly these.
 *
 * @param input - The month, its config and the people.
 * @param values - The fields as they stand.
 * @param airconLabel - What aircon servicing is stored as: the message templates' aircon line label when saving.
 * @returns One charge per person with an amount, or null.
 */
export function buildAddChargeCharges(input: AddChargeInput, values: AddChargeValues, airconLabel = AIRCON_LABEL): EngineCharge[] | null {
  if (values.dueDate === null || (values.kind === "ONE_OFF" && !values.label.trim())) return null;
  return splitCharges(input, values, airconLabel);
}

/** Why the fields can't be saved: the status and code the save answers with, and a message. */
export interface AddChargeProblem {
  status: 404 | 422;
  code: string;
  message: string;
}

/**
 * The first reason the fields can't be saved, in the sheet's order, or null when they can.
 *
 * @param input - The month, its config and the people.
 * @param values - The fields to save.
 * @returns 422 `no_kind`, `no_label` (Other), `no_amount` ($0 or less), `no_who` (Personal, nobody picked), `no_date`
 * or `split_mismatch` (Custom amounts below $0 or not adding up); 404 `no_person` for a Personal pick who isn't in the
 * month's household or is the owner; or null.
 */
export function addChargeProblem(input: AddChargeInput, values: AddChargeValues): AddChargeProblem | null {
  const unprocessable = (code: string, message: string): AddChargeProblem => ({ status: 422, code, message });
  const { kind, amountCents } = values;
  if (kind === null) return unprocessable("no_kind", "Pick what it’s for.");
  const isOther = kind === "ONE_OFF";
  if (isOther && !values.label.trim()) return unprocessable("no_label", "Add a label.");
  if (amountCents === null || amountCents <= 0) return unprocessable("no_amount", "Enter an amount above $0.00.");
  if (isOther && values.scope === "PERSONAL") {
    if (!values.personId) return unprocessable("no_who", "Pick who it’s for.");
    if (!whoOptions(input).some((o) => o.personId === values.personId)) {
      return { status: 404, code: "no_person", message: "That person isn’t in this month’s household." };
    }
  }
  if (values.dueDate === null) return unprocessable("no_date", "Pick a due date.");
  if (isOther && values.scope === "SHARED" && values.split === "CUSTOM" && !customAddsUp(input.config, values, amountCents)) {
    const alert = customFor(input, values)?.alert;
    return unprocessable("split_mismatch", alert ? `The amounts don’t add up: ${alert}.` : "Each amount must be $0.00 or more.");
  }
  return null;
}

/** The units or shares under a person's name, before the route. Null for Equal, which has none. */
function basisCount(config: HouseholdConfig, person: PersonConfig, values: AddChargeValues): string | null {
  const remainders = remaindersOf(config);
  if (values.kind === "AIRCON") {
    if (person.role === "OWNER") return countText(remainders.units.owner, "unit");
    if (person.role === "PRIMARY") return countText(remainders.units.primary, "unit");
    return countText(roomOf(config, person.personId).airconUnits * SHARE_SCALE, "unit");
  }
  if (values.split !== "PER_SHARE") return null;
  if (person.role === "OWNER") return countText(remainders.shares.owner, "share");
  if (person.role === "PRIMARY") return countText(remainders.shares.primary, "share");
  return countText(person.utilityShares, "share");
}

/** The route as text, e.g. `via Priya`, or null when paid directly. */
function viaText(input: AddChargeInput, via: string | null): string | null {
  return via ? `via ${lookup(input).plainName(via)}` : null;
}

/** The preview rows for charges the fields make: everyone with an amount, in split order. */
function previewRows(input: AddChargeInput, values: AddChargeValues, charges: EngineCharge[], totalCents: number): AddChargePreviewRow[] {
  const { name, color } = lookup(input);
  const byPerson = new Map(charges.map((c) => [c.personId, c]));
  return splitOrder(input.config).flatMap((person) => {
    const charge = byPerson.get(person.personId);
    if (!charge) return [];
    const parts = [basisCount(input.config, person, values), viaText(input, charge.payViaPersonId)].filter((p) => p !== null);
    return [
      {
        personId: person.personId,
        name: name(person.personId),
        basis: parts.length > 0 ? parts.join(" · ") : null,
        value: formatCents(charge.amountCents),
        color: color(person.personId),
        percent: (charge.amountCents / totalCents) * 100,
      },
    ];
  });
}

/** The `Add this charge?` dialog for charges the fields make. */
function confirmFor(input: AddChargeInput, values: AddChargeValues, charges: EngineCharge[]): AddChargeConfirm {
  const amountCents = values.amountCents ?? 0;
  const dueDate = values.dueDate ?? "";
  const { name, plainName } = lookup(input);
  const plain = (label: string, value: string): AddChargeConfirmRow => ({ label, value, items: null });
  const rows: AddChargeConfirmRow[] = [
    plain("What it’s for", values.kind === "AIRCON" ? AIRCON_LABEL : values.label.trim()),
    plain("Amount", formatCents(amountCents)),
  ];
  if (values.kind === "ONE_OFF" && values.scope === "PERSONAL") {
    const [charge] = charges;
    const via = viaText(input, charge.payViaPersonId);
    rows.push(plain("Who", via ? `${plainName(charge.personId)} · ${via}` : plainName(charge.personId)));
  } else {
    const method = values.kind === "AIRCON" ? METHOD_WORDS.AIRCON : METHOD_WORDS[values.split];
    const byPerson = new Map(charges.map((c) => [c.personId, c]));
    const items = splitOrder(input.config).flatMap((p) => {
      const charge = byPerson.get(p.personId);
      return charge ? [{ label: name(p.personId), value: formatCents(charge.amountCents) }] : [];
    });
    rows.push({ label: "Split per person", value: `${method} · ${items.length} ${items.length === 1 ? "person" : "people"}`, items });
  }
  rows.push(plain("Due date", formatDateMedium(dueDate)));
  return { title: "Add this charge?", rows, confirmLabel: `Add ${formatCents(amountCents)}`, cancelLabel: "Go back" };
}

/** The Custom amount fields and their Alert. */
function customFor(input: AddChargeInput, values: AddChargeValues): AddChargePreview["custom"] {
  const { config } = input;
  const { name } = lookup(input);
  const rows = splitOrder(config).map((person) => {
    const via = viaText(input, viaOf(person, "UTILITIES"));
    return { personId: person.personId, label: via ? `${name(person.personId)} · ${via}` : name(person.personId) };
  });
  const total = values.amountCents !== null && values.amountCents > 0 ? values.amountCents : null;
  const left = total === null ? 0 : total - customSum(config, values);
  const alert = left > 0 ? `${formatCents(left)} left to split` : left < 0 ? `${formatCents(-left)} over the total` : null;
  return { heading: "Amounts", rows, alert };
}

/**
 * Everything in the Add charge sheet that follows from the fields as they stand: which fields show, the split
 * preview, Custom's fields and Alert, Save and the confirm dialog. Nothing is stored.
 *
 * @param input - The newest opened month, its config and the people.
 * @param values - The fields as they stand.
 * @returns The preview.
 */
export function buildAddChargePreview(input: AddChargeInput, values: AddChargeValues): AddChargePreview {
  const isOther = values.kind === "ONE_OFF";
  const personal = isOther && values.scope === "PERSONAL";
  const custom = isOther && !personal && values.split === "CUSTOM";
  const amountCents = values.amountCents !== null && values.amountCents > 0 ? values.amountCents : null;

  let preview: AddChargePreview["preview"] = null;
  if (!personal && !custom) {
    const heading = values.kind === "AIRCON" ? "Split by aircon units" : "Split preview";
    const charges = splitCharges(input, values, AIRCON_LABEL);
    if (charges === null || amountCents === null) {
      preview = { heading, empty: EMPTY_PREVIEW, rows: [], accessibilityLabel: null };
    } else {
      const rows = previewRows(input, values, charges, amountCents);
      const spoken = rows.map((r) => `${r.name} ${r.value}`).join(", ");
      preview = { heading, empty: null, rows, accessibilityLabel: `${heading}: ${spoken}` };
    }
  }

  const charges = buildAddChargeCharges(input, values);
  return {
    show: { label: isOther, scope: isOther, who: personal, split: isOther && !personal },
    preview,
    custom: custom ? customFor(input, values) : null,
    save: { label: amountCents === null ? "Save" : `Save ${formatCents(amountCents)}`, enabled: charges !== null },
    confirm: charges === null ? null : confirmFor(input, values, charges),
  };
}

/**
 * The Add charge sheet as it opens, for the newest opened month: the options and the opening preview.
 *
 * @param input - The newest opened month, its config and the people.
 * @returns The sheet.
 */
export function buildAddChargeSheet(input: AddChargeInput): AddChargeSheet {
  return {
    month: input.month,
    title: "Add charge",
    subtitle: formatMonthShortLabel(input.month),
    what: {
      placeholder: "Select",
      options: [
        { value: "AIRCON", label: AIRCON_LABEL },
        { value: "ONE_OFF", label: "Other" },
      ],
    },
    scopes: [
      { value: "SHARED", label: "Shared" },
      { value: "PERSONAL", label: "Personal" },
    ],
    who: { placeholder: "Select person", options: whoOptions(input) },
    splits: [
      { value: "EQUAL", label: "Equal" },
      { value: "PER_SHARE", label: "Per share" },
      { value: "CUSTOM", label: "Custom" },
    ],
    values: OPENING_VALUES,
    preview: buildAddChargePreview(input, OPENING_VALUES),
  };
}

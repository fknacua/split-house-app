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
  splitEqual,
  type EngineCharge,
} from "@/lib/split/engine";

/** The label every aircon servicing charge is stored under. */
export const AIRCON_LABEL = "Aircon servicing";

const OWNER_NAME = "You";
const EMPTY_PREVIEW = "Enter an amount and choose a split to see who pays what.";
const NO_SHARES = "Give at least one person a share above 0.";

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
  shares: [],
  dueDate: null,
};

/** One person's Custom amount or share, as its field shows it: null for an empty field. */
interface PersonValue {
  person: PersonConfig;
  value: number | null;
}

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

/** The amount when it is above $0, else null. */
function positive(amountCents: number | null): number | null {
  return amountCents !== null && amountCents > 0 ? amountCents : null;
}

/** Everyone except the owner, in household order: the Personal Who list. */
function whoOptions(input: AddChargeInput) {
  const { plainName } = lookup(input);
  return input.config.people.filter((p) => p.role !== "OWNER").map((p) => ({ personId: p.personId, name: plainName(p.personId) }));
}

/** The route as text, e.g. `via Priya`, or null when paid directly. */
function viaText(input: AddChargeInput, via: string | null): string | null {
  return via ? `via ${lookup(input).plainName(via)}` : null;
}

/** A person's field label in Custom and Per share: their name, with their utilities route, e.g. `Sam · via Priya`. */
function fieldLabel(input: AddChargeInput, person: PersonConfig): string {
  const name = lookup(input).name(person.personId);
  const via = viaText(input, viaOf(person, "UTILITIES"));
  return via ? `${name} · ${via}` : name;
}

/**
 * Everyone's Custom amount, in split order: the typed ones (an empty field, or someone left out, shows empty), or the
 * Equal split of the amount while nothing is typed, so Custom starts from Equal and follows the amount until a field
 * is typed in. Every value is null while there is no amount yet.
 */
function customAmountsOf(config: HouseholdConfig, values: AddChargeValues): PersonValue[] {
  const order = splitOrder(config);
  if (values.customAmounts.length === 0) {
    const total = positive(values.amountCents);
    const owner = order.find((p) => p.role === "OWNER");
    if (total === null || !owner) return order.map((person) => ({ person, value: null }));
    const equal = splitEqual(total, order.map((p) => p.personId), owner.personId);
    return order.map((person) => ({ person, value: equal[person.personId] }));
  }
  const typed = new Map(values.customAmounts.map((c) => [c.personId, c.amountCents]));
  return order.map((person) => ({ person, value: typed.get(person.personId) ?? null }));
}

/** True when the Custom amounts are all $0 or more and add up to the amount. */
function customAddsUp(amounts: PersonValue[], totalCents: number): boolean {
  return amounts.every((a) => (a.value ?? 0) >= 0) && amounts.reduce((sum, a) => sum + (a.value ?? 0), 0) === totalCents;
}

/** A person's household shares, in thousandths: a tenant's utility shares, or the owner's or primary tenant's part of the rest. */
function householdShares(config: HouseholdConfig, person: PersonConfig): number {
  const remainders = remaindersOf(config);
  if (person.role === "OWNER") return remainders.shares.owner;
  if (person.role === "PRIMARY") return remainders.shares.primary;
  return person.utilityShares;
}

/**
 * Everyone's Per share shares, in split order and thousandths: the household's while none is changed, else the
 * changed ones (an empty field, or someone left out, shows empty and counts as 0). For this charge only.
 */
function sharesOf(config: HouseholdConfig, values: AddChargeValues): PersonValue[] {
  const order = splitOrder(config);
  if (values.shares.length === 0) return order.map((person) => ({ person, value: householdShares(config, person) }));
  const typed = new Map(values.shares.map((s) => [s.personId, s.shares]));
  return order.map((person) => ({ person, value: typed.get(person.personId) ?? null }));
}

/** True when no share is below 0 and at least one is above 0. */
function sharesValid(shares: PersonValue[]): boolean {
  return shares.every((s) => (s.value ?? 0) >= 0) && shares.some((s) => (s.value ?? 0) > 0);
}

/**
 * The split the fields make, through the split engine, whatever the label and due date: the preview shows it before
 * they are filled. Null while there is nothing to split: nothing picked, no amount above $0, nobody picked for
 * Personal, shares that are all 0, or Custom amounts that don't add up.
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
    const amounts = customAmountsOf(config, values);
    if (!customAddsUp(amounts, amountCents)) return null;
    const parts = amounts.map((a) => ({ personId: a.person.personId, amountCents: a.value ?? 0 }));
    return buildSharedOneOffCharges(config, basics, { method: "CUSTOM", parts });
  }
  if (values.split === "PER_SHARE") {
    const shares = sharesOf(config, values);
    if (!sharesValid(shares)) return null;
    const parts = shares.map((s) => ({ personId: s.person.personId, units: s.value ?? 0 }));
    return buildSharedOneOffCharges(config, basics, { method: "PER_SHARE", parts });
  }
  return buildSharedOneOffCharges(config, basics, { method: "EQUAL" });
}

/**
 * The charges the fields make, through the split engine, or null while the fields can't make any yet: nothing picked,
 * no amount above $0, no due date, no label for Other, nobody picked for Personal, shares that are all 0, or Custom
 * amounts that don't add up. The save stores exactly these.
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

/** The Custom amount fields and their Alert. */
function customFor(input: AddChargeInput, values: AddChargeValues): NonNullable<AddChargePreview["custom"]> {
  const amounts = customAmountsOf(input.config, values);
  const rows = amounts.map((a) => ({ personId: a.person.personId, label: fieldLabel(input, a.person), amountCents: a.value }));
  const total = positive(values.amountCents);
  const left = total === null ? 0 : total - amounts.reduce((sum, a) => sum + (a.value ?? 0), 0);
  const alert = left > 0 ? `${formatCents(left)} left to split` : left < 0 ? `${formatCents(-left)} over the total` : null;
  return { heading: "Amounts", rows, alert };
}

/** The Per share fields and their Alert. */
function sharesFor(input: AddChargeInput, values: AddChargeValues): NonNullable<AddChargePreview["shares"]> {
  const shares = sharesOf(input.config, values);
  const rows = shares.map((s) => ({ personId: s.person.personId, label: fieldLabel(input, s.person), shares: s.value }));
  return { heading: "Shares", rows, alert: sharesValid(shares) ? null : NO_SHARES };
}

/**
 * The first reason the fields can't be saved, in the sheet's order, or null when they can.
 *
 * @param input - The month, its config and the people.
 * @param values - The fields to save.
 * @returns 422 `no_kind`, `no_label` (Other), `no_amount` ($0 or less), `no_who` (Personal, nobody picked), `no_date`,
 * `no_shares` (Per share: a share below 0, or all 0) or `split_mismatch` (Custom amounts below $0 or not adding up);
 * 404 `no_person` for a Personal pick who isn't in the month's household or is the owner; or null.
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
  const shared = isOther && values.scope === "SHARED";
  if (shared && values.split === "PER_SHARE" && !sharesValid(sharesOf(input.config, values))) {
    return unprocessable("no_shares", NO_SHARES);
  }
  if (shared && values.split === "CUSTOM" && !customAddsUp(customAmountsOf(input.config, values), amountCents)) {
    const { alert } = customFor(input, values);
    return unprocessable("split_mismatch", alert ? `The amounts don’t add up: ${alert}.` : "Each amount must be $0.00 or more.");
  }
  return null;
}

/** The units or shares under a person's name, before the route. Null for Equal and Custom, which have none. */
function basisCount(config: HouseholdConfig, person: PersonConfig, values: AddChargeValues): string | null {
  if (values.kind === "AIRCON") {
    const remainders = remaindersOf(config);
    if (person.role === "OWNER") return countText(remainders.units.owner, "unit");
    if (person.role === "PRIMARY") return countText(remainders.units.primary, "unit");
    return countText(roomOf(config, person.personId).airconUnits * SHARE_SCALE, "unit");
  }
  if (values.split !== "PER_SHARE") return null;
  const shares = sharesOf(config, values).find((s) => s.person.personId === person.personId)?.value ?? 0;
  return countText(shares, "share");
}

/** One person's amount for the preview, with the route it is paid by. */
interface PreviewAmount {
  personId: string;
  amountCents: number;
  payViaPersonId: string | null;
}

/** The preview rows: everyone with an amount above $0, in split order, each with their part of the bar. */
function previewRows(input: AddChargeInput, values: AddChargeValues, amounts: PreviewAmount[]): AddChargePreviewRow[] {
  const { name, color } = lookup(input);
  const shown = amounts.filter((a) => a.amountCents > 0);
  const sum = shown.reduce((s, a) => s + a.amountCents, 0);
  const byPerson = new Map(shown.map((a) => [a.personId, a]));
  return splitOrder(input.config).flatMap((person) => {
    const amount = byPerson.get(person.personId);
    if (!amount) return [];
    const parts = [basisCount(input.config, person, values), viaText(input, amount.payViaPersonId)].filter((p) => p !== null);
    return [
      {
        personId: person.personId,
        name: name(person.personId),
        basis: parts.length > 0 ? parts.join(" · ") : null,
        value: formatCents(amount.amountCents),
        color: color(person.personId),
        percent: (amount.amountCents / sum) * 100,
      },
    ];
  });
}

/**
 * What the preview shows: the split's charges, or for Custom the amounts as they stand, added up or not. Null while
 * there is nothing to split.
 */
function previewAmounts(input: AddChargeInput, values: AddChargeValues): PreviewAmount[] | null {
  if (values.kind === "ONE_OFF" && values.split === "CUSTOM") {
    if (positive(values.amountCents) === null) return null;
    return customAmountsOf(input.config, values).map((a) => ({
      personId: a.person.personId,
      amountCents: a.value ?? 0,
      payViaPersonId: viaOf(a.person, "UTILITIES"),
    }));
  }
  return splitCharges(input, values, AIRCON_LABEL);
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

/**
 * Everything in the Add charge sheet that follows from the fields as they stand: which fields show, the split
 * preview, Custom's and Per share's fields and Alerts, Save and the confirm dialog. Nothing is stored.
 *
 * @param input - The newest opened month, its config and the people.
 * @param values - The fields as they stand.
 * @returns The preview.
 */
export function buildAddChargePreview(input: AddChargeInput, values: AddChargeValues): AddChargePreview {
  const isOther = values.kind === "ONE_OFF";
  const personal = isOther && values.scope === "PERSONAL";
  const shared = isOther && !personal;
  const amountCents = positive(values.amountCents);

  let preview: AddChargePreview["preview"] = null;
  if (!personal) {
    const heading = values.kind === "AIRCON" ? "Split by aircon units" : "Split preview";
    const amounts = previewAmounts(input, values);
    const rows = amounts === null ? [] : previewRows(input, values, amounts);
    if (rows.length === 0) {
      preview = { heading, empty: EMPTY_PREVIEW, rows: [], accessibilityLabel: null };
    } else {
      const spoken = rows.map((r) => `${r.name} ${r.value}`).join(", ");
      preview = { heading, empty: null, rows, accessibilityLabel: `${heading}: ${spoken}` };
    }
  }

  const charges = buildAddChargeCharges(input, values);
  return {
    show: { label: isOther, scope: isOther, who: personal, split: shared },
    preview,
    custom: shared && values.split === "CUSTOM" ? customFor(input, values) : null,
    shares: shared && values.split === "PER_SHARE" ? sharesFor(input, values) : null,
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

import { z } from 'zod';
import { dateKey, monthKey, personColor } from '../schemas/primitives';

/** What an Add charge charge is for: aircon servicing, or anything else (Other). */
export const ADD_CHARGE_KINDS = ['AIRCON', 'ONE_OFF'] as const;

/** What an Add charge charge is for. */
export type AddChargeKind = (typeof ADD_CHARGE_KINDS)[number];

/** Who an Other charge is for: everyone, or one person. */
export const ADD_CHARGE_SCOPES = ['SHARED', 'PERSONAL'] as const;

/** Who an Other charge is for. */
export type AddChargeScope = (typeof ADD_CHARGE_SCOPES)[number];

/** How a shared Other charge is split. Aircon is always split by units and has no choice. */
export const ADD_CHARGE_SPLITS = ['EQUAL', 'PER_SHARE', 'CUSTOM'] as const;

/** How a shared Other charge is split. */
export type AddChargeSplit = (typeof ADD_CHARGE_SPLITS)[number];

/** One person's typed amount in a Custom split. */
export const addChargeCustomAmountSchema = z.object({
  personId: z.string().min(1),
  /** Null while the field is empty, which counts as $0. */
  amountCents: z.number().int().nullable(),
});

/** One person's typed amount in a Custom split. */
export type AddChargeCustomAmount = z.infer<typeof addChargeCustomAmountSchema>;

/**
 * The Add charge sheet's fields as they stand. `POST /api/add-charge/preview` takes them as they are typed, so any
 * of them can be empty; the save (Phase 13B.3) takes the same fields. Fields the chosen kind and scope don't show
 * are ignored: aircon reads only the amount and due date, and Personal ignores the split.
 */
export const addChargeValuesSchema = z.object({
  /** Null until What's it for is picked. */
  kind: z.enum(ADD_CHARGE_KINDS).nullable(),
  /** Other only. */
  label: z.string(),
  /** Null while the field is empty or not a number. */
  amountCents: z.number().int().nullable(),
  /** Other only. */
  scope: z.enum(ADD_CHARGE_SCOPES),
  /** Personal only: who it is for. Null until picked. */
  personId: z.string().min(1).nullable(),
  /** Shared Other only. */
  split: z.enum(ADD_CHARGE_SPLITS),
  /** Custom only: one entry per person with a typed amount. People left out count as $0. */
  customAmounts: z.array(addChargeCustomAmountSchema),
  /** Null until picked. A past day is allowed. */
  dueDate: dateKey.nullable(),
});

/** The Add charge sheet's fields as they stand. */
export type AddChargeValues = z.infer<typeof addChargeValuesSchema>;

/**
 * `POST /api/add-charge` body: the fields and a key the app makes once per sheet, sent again on every Retry, so a save
 * whose response was lost is never stored twice. A repeated key answers with the first save's response, whatever the
 * fields now hold.
 */
export const addChargeRequestSchema = addChargeValuesSchema.extend({
  idempotencyKey: z.string().min(8).max(100),
});

/** `POST /api/add-charge` body. */
export type AddChargeRequest = z.infer<typeof addChargeRequestSchema>;

/** `POST /api/add-charge`: what was stored, so the app can refetch the month. */
export const addChargeResponseSchema = z.object({
  /** The newest opened month, where the charges landed. */
  month: monthKey,
  /** The group holding a shared charge's per-person charges; null for Personal, which has one charge. */
  chargeGroupId: z.string().nullable(),
  /** Every charge stored, the owner's own share included. */
  chargeIds: z.array(z.string()).min(1),
});

/** `POST /api/add-charge` response. */
export type AddChargeResponse = z.infer<typeof addChargeResponseSchema>;

/** `POST /api/add-charge/preview` body: the fields as they stand. Nothing is stored. */
export const addChargePreviewRequestSchema = addChargeValuesSchema;

/** `POST /api/add-charge/preview` body. */
export type AddChargePreviewRequest = z.infer<typeof addChargePreviewRequestSchema>;

/** A choice in a Select, a connected button group or a chip row: the value sent back and its label. */
export const addChargeOptionSchema = <T extends readonly [string, ...string[]]>(values: T) =>
  z.object({ value: z.enum(values), label: z.string() });

/** One person in the Personal Who Select. */
export const addChargeWhoOptionSchema = z.object({
  personId: z.string(),
  /** e.g. `Sam`. */
  name: z.string(),
});

/** One person in the Personal Who Select. */
export type AddChargeWhoOption = z.infer<typeof addChargeWhoOptionSchema>;

/** One person's row in the split preview, with their part of the bar above it. */
export const addChargePreviewRowSchema = z.object({
  personId: z.string(),
  /** e.g. `Priya`, or `You` for the owner. */
  name: z.string(),
  /**
   * Under the name: e.g. `2 units`, `1 unit · via Priya` (aircon), `1.5 shares · via Priya` (Per share), or
   * `via Priya` (Equal). Null when there is nothing to say.
   */
  basis: z.string().nullable(),
  /** e.g. `$X,XXX.XX`. */
  value: z.string(),
  /** The person's bar segment. */
  color: personColor,
  /** The segment's width, above 0 and up to 100. */
  percent: z.number().gt(0).max(100),
});

/** One person's row in the split preview. */
export type AddChargePreviewRow = z.infer<typeof addChargePreviewRowSchema>;

/** One row of the confirm dialog. A row with `items` is the `Split per person` toggle, which expands to them. */
export const addChargeConfirmRowSchema = z.object({
  label: z.string(),
  value: z.string(),
  /** Each person's amount (name as `label`, amount as `value`); null for a plain row. */
  items: z.array(z.object({ label: z.string(), value: z.string() })).min(1).nullable(),
});

/** One row of the confirm dialog. */
export type AddChargeConfirmRow = z.infer<typeof addChargeConfirmRowSchema>;

/** The `Add this charge?` dialog. It has no body text. */
export const addChargeConfirmSchema = z.object({
  /** `Add this charge?`. */
  title: z.string(),
  /**
   * In order: `What it’s for`, `Amount`, then `Split per person` (shared, with items) or `Who` (Personal), then
   * `Due date`.
   */
  rows: z.array(addChargeConfirmRowSchema).min(1),
  /** e.g. `Add $X,XXX.XX`. */
  confirmLabel: z.string(),
  /** `Go back`. */
  cancelLabel: z.string(),
});

/** The `Add this charge?` dialog. */
export type AddChargeConfirm = z.infer<typeof addChargeConfirmSchema>;

/** `POST /api/add-charge/preview`: everything in the sheet that follows from the fields as they stand. */
export const addChargePreviewSchema = z.object({
  /** Which fields show, below What's it for, the Amount and the Due date (always shown). */
  show: z.object({
    /** Label: Other only. */
    label: z.boolean(),
    /** Shared | Personal: Other only. */
    scope: z.boolean(),
    /** Who: Personal only. */
    who: z.boolean(),
    /** The split chips: shared Other only. */
    split: z.boolean(),
  }),
  /** The split preview; null for Personal and Custom, which have none. */
  preview: z
    .object({
      /** `Split by aircon units` for aircon, `Split preview` otherwise. */
      heading: z.string(),
      /** The dashed placeholder while there is nothing to split yet; null once `rows` are filled. */
      empty: z.string().nullable(),
      /** Everyone with an amount: the owner, the primary tenant, then the tenants. Empty while `empty` shows. */
      rows: z.array(addChargePreviewRowSchema),
      /** The bar read out, e.g. `Split preview: You $X.XX, Priya $X.XX`; null while `empty` shows. */
      accessibilityLabel: z.string().nullable(),
    })
    .nullable(),
  /** Custom's amount fields; null unless the split is Custom. */
  custom: z
    .object({
      /** `Amounts`. */
      heading: z.string(),
      /** One field per person, in the preview's order, labelled e.g. `You`, `Sam · via Priya`. */
      rows: z.array(z.object({ personId: z.string(), label: z.string() })).min(1),
      /** The warning Alert, e.g. `$X.XX left to split` or `$X.XX over the total`; null when they add up or there is no total yet. */
      alert: z.string().nullable(),
    })
    .nullable(),
  save: z.object({
    /** e.g. `Save $X,XXX.XX` once the amount is above $0, otherwise `Save`. */
    label: z.string(),
    /** True once every field the sheet shows is filled in and valid, and Custom adds up. */
    enabled: z.boolean(),
  }),
  /** The confirm dialog; null while Save is disabled. */
  confirm: addChargeConfirmSchema.nullable(),
});

/** `POST /api/add-charge/preview` response. */
export type AddChargePreview = z.infer<typeof addChargePreviewSchema>;

/** `GET /api/add-charge`: the Add charge sheet for the newest opened month, as it opens. */
export const addChargeSheetSchema = z.object({
  /** The newest opened month, where the charge lands. */
  month: monthKey,
  /** `Add charge`. */
  title: z.string(),
  /** e.g. `Nov 2026`. */
  subtitle: z.string(),
  what: z.object({
    /** `Select`. */
    placeholder: z.string(),
    /** `Aircon servicing` and `Other`. */
    options: z.array(addChargeOptionSchema(ADD_CHARGE_KINDS)).min(1),
  }),
  /** `Shared` and `Personal`. */
  scopes: z.array(addChargeOptionSchema(ADD_CHARGE_SCOPES)).min(1),
  who: z.object({
    /** `Select person`. */
    placeholder: z.string(),
    /** Everyone in the month's household except the owner, in household order. */
    options: z.array(addChargeWhoOptionSchema),
  }),
  /** `Equal`, `Per share` and `Custom`. */
  splits: z.array(addChargeOptionSchema(ADD_CHARGE_SPLITS)).min(1),
  /** The fields as the sheet opens: nothing picked, Shared, Equal, no due date. */
  values: addChargeValuesSchema,
  /** The preview for `values`, so the sheet renders without a preview call. */
  preview: addChargePreviewSchema,
});

/** `GET /api/add-charge` response. */
export type AddChargeSheet = z.infer<typeof addChargeSheetSchema>;

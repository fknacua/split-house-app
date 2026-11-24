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

/** What the sheet adds: a charge, or a correction to a paid charge. */
export const ADD_CHARGE_MODES = ['CHARGE', 'CORRECTION'] as const;

/** What the sheet adds. */
export type AddChargeMode = (typeof ADD_CHARGE_MODES)[number];

/**
 * Correction mode's fields as they stand. Person and Month only narrow the Charge list; the charge decides what is
 * corrected.
 */
export const addCorrectionValuesSchema = z.object({
  /** Null until picked. */
  personId: z.string().min(1).nullable(),
  /** Null until picked. */
  month: monthKey.nullable(),
  /** The charge to correct, always the original. Null until picked. */
  chargeId: z.string().min(1).nullable(),
  /** The correct amount, not the difference: $0 is a full refund. Null while the field is empty. */
  amountCents: z.number().int().nullable(),
  /** Today as the sheet opens. Read only for a higher amount; a refund is dated today. */
  dueDate: dateKey.nullable(),
});

/** Correction mode's fields as they stand. */
export type AddCorrectionValues = z.infer<typeof addCorrectionValuesSchema>;

/**
 * `GET /api/add-charge` query. `chargeId`: the charge `Add correction` was tapped on, so the sheet opens as
 * `Add correction` with it picked and Person, Month and Charge read-only.
 */
export const addChargeQuerySchema = z.object({
  chargeId: z.string().min(1).optional(),
});

/** `GET /api/add-charge` query. */
export type AddChargeQuery = z.infer<typeof addChargeQuerySchema>;

/** One person's typed amount in a Custom split. */
export const addChargeCustomAmountSchema = z.object({
  personId: z.string().min(1),
  /** Null while the field is empty, which counts as $0. */
  amountCents: z.number().int().nullable(),
});

/** One person's typed amount in a Custom split. */
export type AddChargeCustomAmount = z.infer<typeof addChargeCustomAmountSchema>;

/** One person's share in a Per share split, changed for this charge only. */
export const addChargeShareSchema = z.object({
  personId: z.string().min(1),
  /** In thousandths, so 1.5 shares is 1500. Null while the field is empty, which counts as 0. */
  shares: z.number().int().nullable(),
});

/** One person's share in a Per share split. */
export type AddChargeShare = z.infer<typeof addChargeShareSchema>;

/**
 * The Add charge sheet's fields as they stand. `POST /api/add-charge/preview` takes them as they are typed, so any
 * of them can be empty; the save (Phase 13B.3) takes the same fields. Fields the chosen kind and scope don't show
 * are ignored: aircon reads only the amount and due date, and Personal ignores the split.
 */
export const addChargeValuesSchema = z.object({
  /** Charge or Correction. Correction mode reads only `correction`; Charge mode ignores it. */
  mode: z.enum(ADD_CHARGE_MODES),
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
  /**
   * Custom only. Empty until a field is typed in: the Equal split of the amount is used then (and follows the
   * amount). Once one is typed, the app sends every field's amount; people left out count as $0.
   */
  customAmounts: z.array(addChargeCustomAmountSchema),
  /**
   * Per share only. Empty until a field is changed: the household's shares (the pinned version's utility shares, with
   * the owner's and primary tenant's part of the rest) are used then. Once one is changed, the app sends every field's
   * shares; people left out count as 0. Changes apply to this charge only.
   */
  shares: z.array(addChargeShareSchema),
  /** Null until picked. A past day is allowed. */
  dueDate: dateKey.nullable(),
  /** Correction mode's fields. */
  correction: addCorrectionValuesSchema,
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

/** `POST /api/add-charge`: what was stored, so the app can refetch the month. A correction is one charge in no group. */
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

/** The `Add this charge?` or `Add this correction?` dialog. */
export const addChargeConfirmSchema = z.object({
  /** `Add this charge?` or `Add this correction?`. */
  title: z.string(),
  /** `It will be linked to the original charge.` for a correction; null for a charge, which has no body text. */
  body: z.string().nullable(),
  /**
   * A charge, in order: `What it’s for`, `Amount`, then `Split per person` (shared, with items) or `Who` (Personal),
   * then `Due date`. A correction: `For`, `New amount`, `Outcome` (e.g. `Adds $X.XX`), then `Due date` for a higher one.
   */
  rows: z.array(addChargeConfirmRowSchema).min(1),
  /** e.g. `Add $X,XXX.XX`, or `Yes, add it` for a correction. */
  confirmLabel: z.string(),
  /** `Go back`. */
  cancelLabel: z.string(),
});

/** The `Add this charge?` or `Add this correction?` dialog. */
export type AddChargeConfirm = z.infer<typeof addChargeConfirmSchema>;

/** `POST /api/add-charge/preview`: everything in the sheet that follows from the fields as they stand. */
export const addChargePreviewSchema = z.object({
  /** Which Charge-mode fields show, below What's it for, the Amount and the Due date (always shown). All false in Correction mode. */
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
  /** The split preview; null for Personal, which has none, and in Correction mode. For Custom it follows the typed amounts, added up or not. */
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
      /**
       * One field per person, in the preview's order, labelled e.g. `You`, `Sam · via Priya`, with the amount to show:
       * the typed one, or the Equal split while nothing is typed (null with no amount yet).
       */
      rows: z.array(z.object({ personId: z.string(), label: z.string(), amountCents: z.number().int().nullable() })).min(1),
      /** The warning Alert, e.g. `$X.XX left to split` or `$X.XX over the total`; null when they add up or there is no total yet. */
      alert: z.string().nullable(),
    })
    .nullable(),
  /** Per share's share fields; null unless the split is Per share. */
  shares: z
    .object({
      /** `Shares`. */
      heading: z.string(),
      /** One field per person, in the preview's order, with the shares to show (thousandths): changed, or the household's. */
      rows: z.array(z.object({ personId: z.string(), label: z.string(), shares: z.number().int().nullable() })).min(1),
      /** The warning Alert when no one has a share above 0, or a share is below 0; null otherwise. */
      alert: z.string().nullable(),
    })
    .nullable(),
  /** Correction mode's parts; null in Charge mode. */
  correction: z
    .object({
      /** Under the Charge field: how many times the picked charge was corrected, e.g. `1 correction`; null when none or nothing is picked. */
      corrections: z.string().nullable(),
      /** The info Alert, e.g. `Refund $X.XX to Sam yourself. This is saved as history.`; null while the amount is empty or unchanged. */
      outcome: z.string().nullable(),
      /** The amount can be typed in once a charge is picked. */
      amountEnabled: z.boolean(),
      /** Due date is enabled only for an amount higher than the current one. */
      dueDateEnabled: z.boolean(),
    })
    .nullable(),
  save: z.object({
    /** A charge: e.g. `Save $X,XXX.XX` once the amount is above $0, otherwise `Save`. A correction: always `Save`. */
    label: z.string(),
    /** True once every field the sheet shows is filled in and valid, Custom adds up, and a correction's amount has changed. */
    enabled: z.boolean(),
  }),
  /** The confirm dialog; null while Save is disabled. */
  confirm: addChargeConfirmSchema.nullable(),
});

/** `POST /api/add-charge/preview` response. */
export type AddChargePreview = z.infer<typeof addChargePreviewSchema>;

/** A Select's placeholder. */
const placeholderSchema = z.object({ placeholder: z.string() });

/** One paid charge that can be corrected, in the Charge Select. */
export const addCorrectionChargeOptionSchema = z.object({
  chargeId: z.string(),
  /** The charge's label and its current amount (the original plus every correction), e.g. `Utilities · $X.XX`. */
  label: z.string(),
});

/** One month in the Month Select, with the person's charges in it that can be corrected. */
export const addCorrectionMonthOptionSchema = z.object({
  month: monthKey,
  /** e.g. `Oct 2026`. */
  label: z.string(),
  /** Utilities, then aircon, then one-off charges. */
  charges: z.array(addCorrectionChargeOptionSchema).min(1),
});

/** One person in the Person Select, with the months they have a charge in that can be corrected. */
export const addCorrectionPersonOptionSchema = z.object({
  personId: z.string(),
  /** e.g. `Sam`. */
  name: z.string(),
  /** Newest first. */
  months: z.array(addCorrectionMonthOptionSchema).min(1),
});

/** One person in the Person Select. */
export type AddCorrectionPersonOption = z.infer<typeof addCorrectionPersonOptionSchema>;

/** `GET /api/add-charge`: the Add charge sheet for the newest opened month, as it opens. */
export const addChargeSheetSchema = z.object({
  /** The newest opened month, where the charge or correction lands. */
  month: monthKey,
  /** `Add charge`, or `Add correction` when opened from a charge. */
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
  /** The `Charge | Correction` group; null when opened from a charge, which has no toggle. */
  modes: z
    .object({
      /** `Add as`. */
      label: z.string(),
      /** `Charge` and `Correction`. */
      options: z.array(addChargeOptionSchema(ADD_CHARGE_MODES)).min(1),
    })
    .nullable(),
  /** Correction mode's Selects. */
  correction: z.object({
    /** True when opened from a charge: Person, Month and Charge are read-only rows, filled in. */
    locked: z.boolean(),
    /** `Select person`. */
    person: placeholderSchema,
    /** `Select month`. */
    month: placeholderSchema,
    /** `Select charge`. */
    charge: placeholderSchema,
    /**
     * Everyone in the month's household except the owner who has a paid utilities, aircon or one-off charge, in
     * household order, each with their months and charges.
     */
    people: z.array(addCorrectionPersonOptionSchema),
  }),
  /**
   * The fields as the sheet opens: Charge mode with nothing picked, Shared, Equal, no due date, no Custom amounts or
   * shares typed, and Correction's Due date today. Opened from a charge: Correction mode with that charge picked.
   */
  values: addChargeValuesSchema,
  /** The preview for `values`, so the sheet renders without a preview call. */
  preview: addChargePreviewSchema,
});

/** `GET /api/add-charge` response. */
export type AddChargeSheet = z.infer<typeof addChargeSheetSchema>;

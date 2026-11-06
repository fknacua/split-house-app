import { z } from 'zod';
import { messagePreviewSchema } from './recipient';

/** The templates that can be edited: the path of `GET /api/templates/:kind`. */
export const templateKindSchema = z.enum(['MONTHLY', 'NUDGE']);

/** The monthly breakdown or the nudge. */
export type TemplateKind = z.infer<typeof templateKindSchema>;

/** The charge types whose line label can be edited. Recurring charges, one-offs and corrections read their own stored label. */
export const LINE_LABEL_TYPES = ['RENT', 'UTILITIES', 'AIRCON'] as const;

/** One of {@link LINE_LABEL_TYPES}. */
export type LineLabelType = (typeof LINE_LABEL_TYPES)[number];

/** `GET /api/templates/:kind` query: whose version to load. Missing means the one everyone else uses. */
export const templateFormQuerySchema = z.object({
  personId: z.string().min(1).optional(),
});

/** `GET /api/templates/:kind` query: whose version to load. */
export type TemplateFormQuery = z.infer<typeof templateFormQuerySchema>;

/** One line label's field on the template editor. */
export const templateLineLabelSchema = z.object({
  type: z.enum(LINE_LABEL_TYPES),
  /** The field's label, the name the charge has by default, e.g. `Utilities bill`. */
  label: z.string(),
  /** The label in use, which is the default when there is no custom one, e.g. `Kuryente at tubig`. */
  value: z.string(),
});

/** One line label's field on the template editor. */
export type TemplateLineLabel = z.infer<typeof templateLineLabelSchema>;

/** `GET /api/templates/:kind`: the template editor with the current values, ready to render. */
export const templateFormResponseSchema = z.object({
  kind: templateKindSchema,
  /** `Monthly breakdown` or `Nudge`. */
  title: z.string(),
  /** `Message template`. */
  sub: z.string(),
  /** The person loaded, or null for the one everyone else uses. */
  personId: z.string().nullable(),
  /** The person's own version, else the one everyone else uses. */
  text: z.string(),
  /** The chips that insert at the cursor, e.g. `{name}`. */
  placeholders: z.array(z.string()),
  appliesTo: z.object({
    /** `Everyone` first, with a null `personId`, then everyone but the owner in this month's or next month's household. */
    options: z.array(z.object({ personId: z.string().nullable(), label: z.string() })),
    /** e.g. `Everyone without their own version uses this.`. */
    note: z.string(),
  }),
  lineLabels: z.object({
    /** `Line labels`. */
    title: z.string(),
    /** e.g. `How each charge is named in {lines}. Nudges use them too.`. */
    note: z.string(),
    /** The fields, the same on both templates: the labels are the whole household's, used by both. */
    rows: z.array(templateLineLabelSchema),
  }),
  /** Who the nudge preview can show, for the compact sample group. Empty on the monthly breakdown or with a person loaded. */
  samples: z.array(z.object({ personId: z.string(), label: z.string() })),
  /** The link under Save. */
  secondaryAction: z.object({
    label: z.string(),
    kind: z.enum(['cancel', 'remove-version']),
  }),
  /** The remove dialog's text. Null unless the person has their own version. */
  removeDialog: z.object({ title: z.string(), body: z.string() }).nullable(),
});

/** `GET /api/templates/:kind`: the template editor with the current values, ready to render. */
export type TemplateFormResponse = z.infer<typeof templateFormResponseSchema>;

/** `POST /api/templates` body: a template and the line labels, which apply immediately. */
export const templateSaveRequestSchema = z.object({
  /** Which template. */
  template: templateKindSchema,
  /** Whose own version, or null for the one everyone else uses. */
  personId: z.string().min(1).nullable(),
  /** Sent as written, including `*bold*` markers. Null removes the person's own version. */
  text: z.string().nullable(),
  /** The labels to change, for the whole household. One matching the default clears the custom label. */
  lineLabels: z.partialRecord(z.enum(LINE_LABEL_TYPES), z.string()).optional(),
});

/** `POST /api/templates` body: a template and the line labels, which apply immediately. */
export type TemplateSaveRequest = z.infer<typeof templateSaveRequestSchema>;

/** `POST /api/templates`: the save went through. Refetch the screens that show the wording. */
export const templateSaveResponseSchema = z.object({
  saved: z.literal(true),
});

/** `POST /api/templates`: the save went through. */
export type TemplateSaveResponse = z.infer<typeof templateSaveResponseSchema>;

/** `POST /api/templates/preview` body: the draft as it would be saved, and who to show it on. */
export const templatePreviewRequestSchema = templateSaveRequestSchema.extend({
  text: z.string(),
  /** One of the form's `samples`. Ignored with a person chosen. Missing or unknown means the first choice. */
  samplePersonId: z.string().min(1).nullable().optional(),
});

/** `POST /api/templates/preview` body: the draft as it would be saved, and who to show it on. */
export type TemplatePreviewRequest = z.infer<typeof templatePreviewRequestSchema>;

/** `POST /api/templates/preview`: the draft rendered on a sample person with every line, dated the active month. Nothing is stored. */
export const templatePreviewResponseSchema = z.object({
  /** e.g. `Priya · Nov 2026 sample`, or `Jordan · Rent · Nov 2026 sample` on a nudge. */
  meta: z.string(),
  preview: messagePreviewSchema,
  /** Whether Save would store something, with no errors. */
  canSave: z.boolean(),
  /** Messages by request field name: `text` and `lineLabels.{type}`. */
  errors: z.record(z.string(), z.string()),
});

/** `POST /api/templates/preview`: the draft rendered on a sample person with every line, dated the active month. Nothing is stored. */
export type TemplatePreviewResponse = z.infer<typeof templatePreviewResponseSchema>;

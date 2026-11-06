import { z } from 'zod';
import { countMessageCharacters } from '../lib/message-text';
import { personColor } from '../schemas/primitives';
import { messagePreviewSchema } from './recipient';

/** The templates that can be edited: the path of `GET /api/templates/:kind`. */
export const templateKindSchema = z.enum(['MONTHLY', 'NUDGE']);

/** The monthly breakdown or the nudge. */
export type TemplateKind = z.infer<typeof templateKindSchema>;

/** The charge types whose line label can be edited. Recurring charges, one-offs and corrections read their own stored label. */
export const LINE_LABEL_TYPES = ['RENT', 'UTILITIES', 'AIRCON'] as const;

/** One of {@link LINE_LABEL_TYPES}. */
export type LineLabelType = (typeof LINE_LABEL_TYPES)[number];

/** The most characters a template's text can have, as counted by `countMessageCharacters`. */
export const TEMPLATE_LIMITS: Record<TemplateKind, number> = {
  MONTHLY: 1000,
  NUDGE: 500,
};

/** The message rules for one template: not empty, and within its limit. */
function templateMessageSchema(kind: TemplateKind) {
  return z
    .string()
    .refine((text) => text.trim() !== '', { message: 'Message can’t be empty', abort: true })
    // No message: the counter under the field shows the count in danger instead.
    .refine((text) => countMessageCharacters(text) <= TEMPLATE_LIMITS[kind], { message: '' });
}

/**
 * The template text's rules per template, which the editor validates against as the user types and the save is parsed
 * with. Empty fails with `Message can’t be empty`; over the limit fails with an empty message.
 */
export const templateMessageSchemas = {
  MONTHLY: templateMessageSchema('MONTHLY'),
  NUDGE: templateMessageSchema('NUDGE'),
} as const;

/** `GET /api/templates/:kind/editor` and `DELETE /api/templates/:kind` query: whose custom template. Missing means the Default. */
export const templatePersonQuerySchema = z.object({
  personId: z.string().min(1).optional(),
});

/** `GET /api/templates/:kind/editor` and `DELETE /api/templates/:kind` query: whose custom template. */
export type TemplatePersonQuery = z.infer<typeof templatePersonQuerySchema>;

/** A confirm dialog's text, written by the server. */
export const templateDialogSchema = z.object({
  title: z.string(),
  body: z.string(),
  confirmLabel: z.string(),
  cancelLabel: z.string(),
});

/** A confirm dialog's text, written by the server. */
export type TemplateDialog = z.infer<typeof templateDialogSchema>;

/** One custom template's card on the landing page. */
export const templateCustomCardSchema = z.object({
  personId: z.string(),
  /** e.g. `Jordan`. */
  name: z.string(),
  /** The avatar's letter, e.g. `J`. */
  initial: z.string(),
  /** The avatar's fill. */
  color: personColor,
  /** `{role} · {room}`, e.g. `Tenant · Room 3`. */
  sub: z.string(),
  /** Their template rendered on them, dated the active month. */
  preview: messagePreviewSchema,
});

/** One custom template's card on the landing page. */
export type TemplateCustomCard = z.infer<typeof templateCustomCardSchema>;

/** `GET /api/templates/:kind`: one template's landing page, with the Default and the custom templates, ready to render. */
export const templateLandingResponseSchema = z.object({
  kind: templateKindSchema,
  /** `Monthly breakdown` or `Nudge`. */
  title: z.string(),
  /** `Message template`. */
  sub: z.string(),
  default: z.object({
    /** `Default`. */
    title: z.string(),
    /** `What everyone else gets`. */
    sub: z.string(),
    /** The Default rendered on the primary tenant, else a tenant, dated the active month. Null with nobody to show it on. */
    preview: messagePreviewSchema.nullable(),
  }),
  custom: z.object({
    /** `Custom templates`. */
    title: z.string(),
    /** Whether Add more is enabled: someone still has no custom template. */
    canAdd: z.boolean(),
    /** In the household order: the primary tenant, then the tenants. */
    cards: z.array(templateCustomCardSchema),
  }),
  forWho: z.object({
    /** `For who`. */
    title: z.string(),
    /** Everyone without a custom template, e.g. `Sam · Tenant`. Tapping one opens their new custom template. */
    rows: z.array(z.object({ personId: z.string(), label: z.string() })),
  }),
});

/** `GET /api/templates/:kind`: one template's landing page, ready to render. */
export type TemplateLandingResponse = z.infer<typeof templateLandingResponseSchema>;

/** One line label's field in the Line labels sheet. */
export const templateLineLabelSchema = z.object({
  type: z.enum(LINE_LABEL_TYPES),
  /** The field's label, the name the charge has by default, e.g. `Utilities bill`. */
  label: z.string(),
  /** The label in use, which is the default when there is no custom one, e.g. `Kuryente at tubig`. */
  value: z.string(),
});

/** One line label's field in the Line labels sheet. */
export type TemplateLineLabel = z.infer<typeof templateLineLabelSchema>;

/** One section title's field in the Line labels sheet: the title of the section holding a person's lines. */
export const templateSectionTitleSchema = z.object({
  personId: z.string(),
  /** The field's label, the person's name, e.g. `Priya`. */
  label: z.string(),
  /** The custom title without the colon, e.g. `Master Bedroom Share`, or empty for `Yours` or `{name}’s (please collect)`. */
  value: z.string(),
});

/** One section title's field in the Line labels sheet. */
export type TemplateSectionTitle = z.infer<typeof templateSectionTitleSchema>;

/** `GET /api/templates/:kind/editor`: the template editor for the Default or one person's custom template, ready to render. */
export const templateEditorResponseSchema = z.object({
  kind: templateKindSchema,
  /** The person whose custom template this is, or null for the Default. */
  personId: z.string().nullable(),
  /** `Default` or `Custom template for {name}`. */
  title: z.string(),
  /** `Monthly breakdown` or `Nudge`. */
  sub: z.string(),
  /** The saved text; a new custom template starts from the Default's. */
  text: z.string(),
  /** The most characters the text can have. */
  limit: z.number().int().positive(),
  /** The Insert chips, e.g. `{name}`. */
  placeholders: z.array(z.string()),
  /** `Restore to original` and its dialog. Only on the Default once it differs from the built-in text. */
  restore: z.object({ label: z.string(), dialog: templateDialogSchema }).nullable(),
  /** The link under Save: `Cancel`, or `Remove this template` on a saved custom template. */
  secondaryAction: z.object({
    label: z.string(),
    kind: z.enum(['cancel', 'remove']),
  }),
  /** The remove dialog's text. Null unless `secondaryAction` removes. */
  removeDialog: templateDialogSchema.nullable(),
  /** The Line labels sheet, opened from `Edit line labels` under Preview. */
  labels: z.object({
    /** `Line labels`. */
    title: z.string(),
    /** e.g. `How each charge is named in {lines}.`. */
    hint: z.string(),
    /** e.g. `Shared with Nudge templates`. */
    sharedNote: z.string(),
    /** The household's labels, the same in every template. */
    rows: z.array(templateLineLabelSchema),
    /** The section title fields, one per person. Null on the Nudge, which has no sections. */
    sectionTitles: z
      .object({
        /** `Section titles`. */
        title: z.string(),
        rows: z.array(templateSectionTitleSchema),
      })
      .nullable(),
  }),
});

/** `GET /api/templates/:kind/editor`: the template editor, ready to render. */
export type TemplateEditorResponse = z.infer<typeof templateEditorResponseSchema>;

const saveFor = <K extends TemplateKind>(kind: K) =>
  z.object({
    /** Which template. */
    template: z.literal(kind),
    /** Whose custom template, or null for the Default. Saving one for someone without one adds it. */
    personId: z.string().min(1).nullable(),
    /** Sent as written, including `*bold*` markers. */
    text: templateMessageSchemas[kind],
  });

/** `POST /api/templates` body: the Default's or one person's text, which applies immediately. The text follows {@link templateMessageSchemas}. */
export const templateSaveRequestSchema = z.discriminatedUnion('template', [saveFor('MONTHLY'), saveFor('NUDGE')]);

/** `POST /api/templates` body: the Default's or one person's text, which applies immediately. */
export type TemplateSaveRequest = z.infer<typeof templateSaveRequestSchema>;

/** `POST /api/templates`, `DELETE /api/templates/:kind`, `POST /api/templates/:kind/restore` and `POST /api/templates/labels`: the save went through. Refetch the screens that show the wording. */
export const templateSaveResponseSchema = z.object({
  saved: z.literal(true),
});

/** The save went through. */
export type TemplateSaveResponse = z.infer<typeof templateSaveResponseSchema>;

/** `POST /api/templates/labels` body: the line labels and section titles together, which apply immediately. */
export const templateLabelsSaveRequestSchema = z.object({
  /** The labels to change. One matching the default clears the custom label. */
  lineLabels: z.partialRecord(z.enum(LINE_LABEL_TYPES), z.string().trim().min(1, 'Enter a label.')),
  /** The section titles to change, by person. An empty one goes back to `Yours` or `{name}’s (please collect)`. */
  sectionTitles: z.record(z.string().min(1), z.string().trim()).optional(),
});

/** `POST /api/templates/labels` body: the line labels and section titles together. */
export type TemplateLabelsSaveRequest = z.infer<typeof templateLabelsSaveRequestSchema>;

/** `POST /api/templates/preview` body: the draft as it would be saved. Any text is accepted, so a draft that breaks a rule still previews. */
export const templatePreviewRequestSchema = z.object({
  template: templateKindSchema,
  /** Whose custom template, which the draft is shown on, or null for the Default. */
  personId: z.string().min(1).nullable(),
  text: z.string(),
});

/** `POST /api/templates/preview` body: the draft as it would be saved. */
export type TemplatePreviewRequest = z.infer<typeof templatePreviewRequestSchema>;

/** `POST /api/templates/preview`: the draft rendered with every line, dated the active month. Nothing is stored. */
export const templatePreviewResponseSchema = z.object({
  /** Shown on the person whose custom template it is, else as the landing's Default card. Null for blank text (`Nothing to preview yet`) or with nobody to show it on. */
  preview: messagePreviewSchema.nullable(),
});

/** `POST /api/templates/preview`: the draft rendered with every line, dated the active month. */
export type TemplatePreviewResponse = z.infer<typeof templatePreviewResponseSchema>;

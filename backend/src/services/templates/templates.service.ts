import type {
  MessageTemplates,
  TemplateEditorResponse,
  TemplateKind,
  TemplateLabelsSaveRequest,
  TemplateLandingResponse,
  TemplatePersonQuery,
  TemplatePreviewRequest,
  TemplatePreviewResponse,
  TemplateSaveRequest,
  TemplateSaveResponse,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { buildTemplateEditor } from "@/lib/templates/build-template-editor";
import { buildTemplateLanding } from "@/lib/templates/build-template-landing";
import { buildTemplatePreview } from "@/lib/templates/build-template-preview";
import {
  applyLabelsSave,
  applyTemplateRemove,
  applyTemplateRestore,
  applyTemplateSave,
  changedTemplates,
} from "@/lib/templates/plan-templates-save";
import { defaultPreviewPerson, templatePeople, type TemplatePerson } from "@/lib/templates/template-people";
import { readActiveConfig, readNextVersion, type HouseholdFormDb } from "@/services/household/household-form.service";
import {
  readMessageTemplates,
  writeMessageTemplates,
  type MessageTemplatesDb,
  type MessageTemplatesWriteDb,
} from "./message-templates.service";

/** The slice of the Prisma client the template screens read, so tests can pass an in-memory fake. */
export type TemplatesDb = HouseholdFormDb & MessageTemplatesDb;

/** The slice of the Prisma client the template saves use. */
export type TemplatesWriteDb = TemplatesDb & MessageTemplatesWriteDb;

/** Reads the active month, both months' configs, who can have a custom template, everyone's names and the wording. */
async function readTemplatesContext(db: TemplatesDb) {
  const next = await readNextVersion(db);
  const [activeConfig, templates] = await Promise.all([readActiveConfig(db, next), readMessageTemplates(db)]);
  const configs = activeConfig ? [next.config, activeConfig] : [next.config];
  return {
    month: next.activeMonth,
    configs,
    templates,
    templatePeople: templatePeople(configs, next.people),
    people: next.people.map((p) => ({ id: p.id, name: p.name })),
  };
}

/**
 * Finds someone who can have a custom template.
 *
 * @throws {ApiError} 404 `no_person` for someone unknown, the owner, or someone in neither this month's nor next month's household.
 */
function findPerson(people: TemplatePerson[], personId: string): TemplatePerson {
  const person = people.find((p) => p.personId === personId);
  if (!person) throw new ApiError(404, "no_person", "This person is not in the household.");
  return person;
}

/** Stores the new wording when it differs from what is stored. */
async function store(db: MessageTemplatesWriteDb, current: MessageTemplates, next: MessageTemplates): Promise<TemplateSaveResponse> {
  const changed = changedTemplates(current, next);
  if (changed) await writeMessageTemplates(db, changed);
  return { saved: true };
}

/**
 * Reads one template's landing page: the Default, the custom templates and the For who rows. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param kind - The monthly breakdown or the nudge.
 * @returns The landing page.
 * @throws {ApiError} 409 `no_household` before first run; 404 `no_version` when no version covers next month.
 */
export async function getTemplateLanding(db: TemplatesDb, kind: TemplateKind): Promise<TemplateLandingResponse> {
  const context = await readTemplatesContext(db);
  return buildTemplateLanding({ kind, ...context });
}

/**
 * Reads the template editor for the Default or one person's custom template, saved or new. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param kind - The monthly breakdown or the nudge.
 * @param query - Whose custom template. Missing means the Default.
 * @returns The template editor.
 * @throws {ApiError} The same as `getTemplateLanding`; 404 `no_person` as `findPerson`.
 */
export async function getTemplateEditor(db: TemplatesDb, kind: TemplateKind, query: TemplatePersonQuery): Promise<TemplateEditorResponse> {
  const { month, configs, templates, templatePeople, people } = await readTemplatesContext(db);
  if (query.personId) findPerson(templatePeople, query.personId);
  return buildTemplateEditor({ kind, personId: query.personId ?? null, templates, templatePeople, month, configs, people });
}

/**
 * Renders a draft on the person whose custom template it is, else on the Default's person, dated the active month,
 * with every line from sample charges. Nothing is stored.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param request - The draft.
 * @returns The rendered message, or null for blank text or with nobody to show it on.
 * @throws {ApiError} The same as `getTemplateEditor`.
 */
export async function previewTemplate(db: TemplatesDb, request: TemplatePreviewRequest): Promise<TemplatePreviewResponse> {
  const { month, templates, templatePeople, people } = await readTemplatesContext(db);
  const person = request.personId ? findPerson(templatePeople, request.personId) : defaultPreviewPerson(templatePeople);
  if (!person) return { preview: null };
  return {
    preview: buildTemplatePreview({
      kind: request.template,
      text: request.text,
      month,
      config: person.config,
      templates,
      person: { id: person.personId, name: person.name },
      people,
    }),
  };
}

/**
 * Saves the Default's text or one person's custom template, adding it when they have none. Applies immediately to
 * every message not yet sent; what was sent stays stored on its `MessageEvent`. Saving the same text again is harmless.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param request - The save, already parsed with the shared schema, which refuses empty text.
 * @returns That it went through.
 * @throws {ApiError} The same as `getTemplateEditor`.
 */
export async function saveTemplate(db: TemplatesWriteDb, request: TemplateSaveRequest): Promise<TemplateSaveResponse> {
  const { templates, templatePeople } = await readTemplatesContext(db);
  if (request.personId) findPerson(templatePeople, request.personId);
  return store(db, templates, applyTemplateSave(templates, request));
}

/**
 * Removes a person's custom template, so they get the Default. A monthly one takes its Section labels with it.
 * Removing one that is already gone is harmless.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param kind - The monthly breakdown or the nudge.
 * @param personId - Whose.
 * @returns That it went through.
 * @throws {ApiError} The same as `getTemplateEditor`.
 */
export async function removeTemplate(db: TemplatesWriteDb, kind: TemplateKind, personId: string): Promise<TemplateSaveResponse> {
  const { templates, templatePeople } = await readTemplatesContext(db);
  findPerson(templatePeople, personId);
  return store(db, templates, applyTemplateRemove(templates, kind, personId));
}

/**
 * Saves the built-in text as the Default. Custom templates stay.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param kind - The monthly breakdown or the nudge.
 * @returns That it went through.
 * @throws {ApiError} The same as `getTemplateLanding`.
 */
export async function restoreTemplate(db: TemplatesWriteDb, kind: TemplateKind): Promise<TemplateSaveResponse> {
  const { templates } = await readTemplatesContext(db);
  return store(db, templates, applyTemplateRestore(templates, kind));
}

/**
 * Saves the line labels and section titles together, for every template.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param request - The save, already parsed with the shared schema, which refuses a blank label.
 * @returns That it went through.
 * @throws {ApiError} The same as `getTemplateLanding`; 404 `no_person` for a section title of someone who can't have one.
 */
export async function saveTemplateLabels(db: TemplatesWriteDb, request: TemplateLabelsSaveRequest): Promise<TemplateSaveResponse> {
  const { templates, templatePeople } = await readTemplatesContext(db);
  for (const [recipientId, titles] of Object.entries(request.sectionTitles ?? {})) {
    for (const personId of [recipientId, ...Object.keys(titles)]) findPerson(templatePeople, personId);
  }
  return store(db, templates, applyLabelsSave(templates, request));
}

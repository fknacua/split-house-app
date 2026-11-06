import type {
  TemplateFormQuery,
  TemplateFormResponse,
  TemplateKind,
  TemplatePreviewRequest,
  TemplatePreviewResponse,
  TemplateSaveRequest,
  TemplateSaveResponse,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { buildTemplateForm, templatePersonIds } from "@/lib/templates/build-template-form";
import { buildTemplatePreview, previewPersonId } from "@/lib/templates/build-template-preview";
import { applyTemplatesSave, planTemplatesSave } from "@/lib/templates/plan-templates-save";
import { readActiveConfig, readNextVersion, type HouseholdFormDb } from "@/services/household/household-form.service";
import {
  readMessageTemplates,
  writeMessageTemplates,
  type MessageTemplatesDb,
  type MessageTemplatesWriteDb,
} from "./message-templates.service";

/** The slice of the Prisma client the template editor reads, so tests can pass an in-memory fake. */
export type TemplatesDb = HouseholdFormDb & MessageTemplatesDb;

/**
 * Reads who a template can apply to, and refuses a person who isn't one of them.
 *
 * @throws {ApiError} 404 `no_person` for someone unknown, the owner, or someone in neither this month's nor next month's household.
 */
async function readPersonIds(
  db: TemplatesDb,
  next: Awaited<ReturnType<typeof readNextVersion>>,
  personId: string | null | undefined,
): Promise<string[]> {
  const activeConfig = await readActiveConfig(db, next);
  const personIds = templatePersonIds(activeConfig ? [next.config, activeConfig] : [next.config]);
  if (personId && (!next.people.some((p) => p.id === personId) || !personIds.includes(personId))) {
    throw new ApiError(404, "no_person", "This person is not in the household.");
  }
  return personIds;
}

/**
 * Reads the template editor with the current values. Read-only.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param kind - The monthly breakdown or the nudge.
 * @param query - Whose version to load. Missing means the one everyone else uses.
 * @returns The template editor.
 * @throws {ApiError} 409 `no_household` before first run; 404 `no_version` when no version covers next month; 404
 * `no_person` as `readPersonIds`.
 */
export async function getTemplateForm(db: TemplatesDb, kind: TemplateKind, query: TemplateFormQuery): Promise<TemplateFormResponse> {
  const next = await readNextVersion(db);
  const [personIds, templates] = await Promise.all([readPersonIds(db, next, query.personId), readMessageTemplates(db)]);
  return buildTemplateForm({
    kind,
    personId: query.personId ?? null,
    config: next.config,
    templates,
    personIds,
    people: next.people,
  });
}

/**
 * Renders a draft on a sample person, dated the active month, with what Save would do. The lines come from next month's
 * version through the split engine with sample totals, so every line always shows. Nothing is stored.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param request - The draft and who to show it on.
 * @returns The caption, the rendered message, whether Save is allowed and the errors per field.
 * @throws {ApiError} The same as `getTemplateForm`.
 */
export async function previewTemplate(db: TemplatesDb, request: TemplatePreviewRequest): Promise<TemplatePreviewResponse> {
  const next = await readNextVersion(db);
  const [, templates] = await Promise.all([readPersonIds(db, next, request.personId), readMessageTemplates(db)]);
  const { activeMonth, config, people } = next;

  const sampleId = previewPersonId(config, {
    kind: request.template,
    personId: request.personId,
    samplePersonId: request.samplePersonId,
  });
  const plan = planTemplatesSave(templates, request);
  return {
    ...buildTemplatePreview({
      kind: request.template,
      text: request.text,
      month: activeMonth,
      config,
      templates: applyTemplatesSave(templates, request),
      person: { id: sampleId, name: people.find((p) => p.id === sampleId)?.name ?? "Someone" },
      people: people.map((p) => ({ id: p.id, name: p.name })),
    }),
    canSave: plan.canSave,
    errors: plan.errors,
  };
}

/**
 * Saves a template and the line labels, running the preview's checks again. Applies immediately to every message not
 * yet sent; what was sent stays stored on its `MessageEvent`.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param request - The save.
 * @returns That it went through.
 * @throws {ApiError} The same as `getTemplateForm`; 422 `invalid_edit` when a rule fails; 422 `no_changes` when there is
 * nothing to store.
 */
export async function saveTemplate(db: TemplatesDb & MessageTemplatesWriteDb, request: TemplateSaveRequest): Promise<TemplateSaveResponse> {
  const next = await readNextVersion(db);
  const [, templates] = await Promise.all([readPersonIds(db, next, request.personId), readMessageTemplates(db)]);
  const plan = planTemplatesSave(templates, request);
  const messages = Object.values(plan.errors);
  if (messages.length > 0) throw new ApiError(422, "invalid_edit", messages.join(" "));
  if (!plan.next) throw new ApiError(422, "no_changes", "There is nothing to save.");
  await writeMessageTemplates(db, plan.next);
  return { saved: true };
}

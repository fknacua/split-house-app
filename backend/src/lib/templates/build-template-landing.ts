import type { MessageTemplates, TemplateKind, TemplateLandingResponse } from "@splithouse/shared";
import { buildTemplatePreview } from "./build-template-preview";
import { defaultPreviewPerson, type TemplatePerson } from "./template-people";
import { customText, defaultText, TEMPLATE_NAMES } from "./template-text";

/** What `buildTemplateLanding` reads. */
export interface TemplateLandingInput {
  kind: TemplateKind;
  /** The active month, which the previews are dated with. */
  month: string;
  /** The current wording. */
  templates: MessageTemplates;
  /** Who can have a custom template, from `templatePeople`. */
  templatePeople: TemplatePerson[];
  /** Everyone's names, for the sections of the people a breakdown collects for. */
  people: { id: string; name: string }[];
}

/**
 * One template's landing page, display-ready: the Default rendered on the primary tenant, the custom templates each
 * rendered on their person, and the For who rows for everyone still on the Default. A custom template for someone in
 * neither this month's nor next month's household is not shown.
 *
 * @param input - The template, the month, the wording and the people.
 * @returns The response for `GET /api/templates/:kind`.
 */
export function buildTemplateLanding(input: TemplateLandingInput): TemplateLandingResponse {
  const { kind, month, templates, people } = input;
  const render = (person: TemplatePerson, text: string) =>
    buildTemplatePreview({
      kind,
      text,
      month,
      config: person.config,
      templates,
      person: { id: person.personId, name: person.name },
      people,
    });

  const shownOn = defaultPreviewPerson(input.templatePeople);
  const withCustom = input.templatePeople.flatMap((person) => {
    const text = customText(templates, kind, person.personId);
    return text === undefined ? [] : [{ person, text }];
  });
  const withoutCustom = input.templatePeople.filter((p) => customText(templates, kind, p.personId) === undefined);

  return {
    kind,
    title: TEMPLATE_NAMES[kind],
    sub: "Message template",
    default: {
      title: "Default",
      sub: "What everyone else gets",
      preview: shownOn ? render(shownOn, defaultText(templates, kind)) : null,
    },
    custom: {
      title: "Custom templates",
      canAdd: withoutCustom.length > 0,
      cards: withCustom.flatMap(({ person, text }) => {
        const preview = render(person, text);
        // A saved custom template is never blank, since the save refuses one.
        return preview
          ? [
              {
                personId: person.personId,
                name: person.name,
                initial: person.initial,
                color: person.color,
                sub: [person.role, person.room].filter(Boolean).join(" · "),
                preview,
              },
            ]
          : [];
      }),
    },
    forWho: {
      title: "For who",
      rows: withoutCustom.map((p) => ({ personId: p.personId, label: `${p.name} · ${p.role}` })),
    },
  };
}

import type { MessageTemplates } from "@splithouse/shared";

/** The Brief's default wording, used until the first template save. */
export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplates = {
  monthly: "Hi {name}! Eto na yung breakdown for {month} 😊\n\n{lines}\n\n*Total:* {total}\nPaki-send by {dueDate}. Salamat!",
  nudge: "Hi {name}! Paalala lang, overdue pa yung mga ito:\n\n{lines}\n\n*Total:* {total}\nSalamat! 🙏",
  overrides: [],
  lineLabels: {},
  sectionTitles: {},
};

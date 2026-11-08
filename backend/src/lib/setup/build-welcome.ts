import { SETUP_STEP_IDS, type SetupResponse, type SetupRow, type SetupStepId, type SetupTarget } from "@splithouse/shared";
import { requiredStepsDone } from "./steps";

/** Each row's wording, as drawn in `Welcome.dc.html`, and where it leads. */
const STEPS: Record<SetupStepId, { title: string; detail: string; optional: boolean; target: SetupTarget }> = {
  startMonth: {
    title: "Start month",
    detail: "Choose the first month you want to track",
    optional: false,
    target: { kind: "start-month" },
  },
  rentAndRooms: {
    title: "Rent & rooms",
    detail: "Rent, due dates and rooms",
    optional: false,
    target: { kind: "edit-home" },
  },
  people: {
    title: "People",
    detail: "Add your fellow tenants and their information",
    optional: false,
    target: { kind: "setup-people" },
  },
  householdSplits: {
    title: "Household splits",
    detail: "How you split household charges",
    optional: false,
    target: { kind: "edit-splits" },
  },
  messages: {
    title: "Custom messages",
    detail: "Personalize your messages for each tenant if you wish",
    optional: true,
    target: { kind: "setup-messages" },
  },
};

const INTRO_SETUP =
  "Tell the app who lives here and what everyone pays. You only do this once.";
// Reminders joins this text with its step in Phase 13 (13.7).
const INTRO_OPTIONAL = "Custom messages are optional. You can change them any time in Settings.";
const INTRO_ALL_DONE = "Everything is set up. Next, upload your utilities bill if you have one already.";

/**
 * Builds Welcome from the steps done. Rows go in order: done rows reopen, the first not done is current and later
 * rows are disabled. The heading, intro and footer follow the board's states: `empty` (nothing done), `started` and
 * `progress` (some required steps done), `optional` (every required step done) and `allDone` (Custom messages done
 * too), whose buttons finish First run.
 *
 * @param done - The done steps.
 * @returns Welcome, ready to render.
 */
export function buildWelcome(done: readonly SetupStepId[]): SetupResponse {
  const current = SETUP_STEP_IDS.find((id) => !done.includes(id)) ?? null;
  const rows: SetupRow[] = SETUP_STEP_IDS.map((id, i) => ({
    id,
    number: String(i + 1),
    title: STEPS[id].title,
    detail: STEPS[id].detail,
    state: done.includes(id) ? "done" : id === current ? "current" : "disabled",
    optional: STEPS[id].optional,
    target: STEPS[id].target,
  }));

  const allDone = current === null;
  const required = requiredStepsDone(done);
  const doneCount = SETUP_STEP_IDS.filter((id) => done.includes(id)).length;

  const primary = current === null
    ? { label: "Finish setup", target: { kind: "finish" } as const }
    : doneCount === 0
      ? { label: "Start with the start month", target: STEPS.startMonth.target }
      : { label: `Continue: ${STEPS[current].title}`, target: STEPS[current].target };
  const secondary = required && !allDone ? { label: "Not now", target: { kind: "finish" } as const } : null;

  return {
    heading: allDone ? "You’re all set" : required ? "Your household is set up" : "Set up your household",
    intro: allDone ? INTRO_ALL_DONE : required ? INTRO_OPTIONAL : INTRO_SETUP,
    progress:
      doneCount === 0
        ? null
        : {
            text: allDone ? "All steps done" : `${doneCount} of ${SETUP_STEP_IDS.length} steps done`,
            note: allDone ? "Optional steps included" : null,
            done: doneCount,
            segments: SETUP_STEP_IDS.map((id) => ({ optional: STEPS[id].optional, done: done.includes(id) })),
          },
    rows,
    primary,
    secondary,
  };
}

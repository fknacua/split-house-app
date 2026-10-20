---
name: plan-executor
description: Executes a plan file the user provides, one step at a time. Marks status emojis (in progress, done, blocked) in the plan itself, keeps a dated progress log next to it, and stops for the user's review after each run. Requires a plan to be named or attached; if none is given, stop and ask for it. Use this whenever the user says "execute the plan", "next step", "continue the plan", "what's next", "do step 1.3", "start phase 2", "resume", "pick up where we left off", or otherwise asks to carry out or check progress on a multi-step plan document, even if they don't mention this skill by name.
---

# Plan executor

Drives a plan document forward in small, reviewable pieces. The aim is to make every run easy to review and easy to resume: a short summary up front, one clear status per step, one short log entry per run, and a hard stop at the end.

## Step 0: get the plan

A plan must be provided: a file path, a pasted plan, or a clear reference to a file in the message. If the user hasn't given one, **stop and ask which plan to execute**. Don't search the repo for one and assume, and don't use a plan from earlier in the conversation unless the user points at it. Executing the wrong plan edits the wrong files, so asking is cheaper.

If the plan is only pasted text with no file, ask where to save it (the markers and log need a file). Then continue.

## Files

- **Plan**: the file the user gave. It is the source of truth for scope. Edit it only to change status markers. If a step looks wrong or incomplete, say so and ask; don't rewrite it.
- **Progress log**: same folder, named `<plan-file-name>_progress.md` (for `docs/plans/foo.md`, that is `docs/plans/foo_progress.md`). Create it on first use with a one-line title, then append.

## Status markers (in the plan)

Put the marker at the start of the step line, after any list dash or checkbox and before the step id or title:

`- ✅ **0.1** Set up the database`
`- [ ] 🔄 Add login route`

| Marker | Meaning |
|---|---|
| none | Todo |
| 🔄 | In progress: started, or built and waiting for the user's review or a check only they can do |
| ✅ | Done: built, verified, and approved wherever the plan requires the user's review |
| 🚫 | Blocked: needs a decision or action from the user, or a conflict is unresolved |

Phase and section headings get a derived marker: 🔄 once any step under them has started, ✅ only when every step under them is ✅. Don't put 🚫 on headings. Update them whenever a step changes.

Never mark ✅ on your own for anything the plan says the user must review, test on a device, or do by hand. The plan makes their review the exit condition; those steps stay 🔄 or 🚫 until they say it is fine.

## Each run

1. **Orient.** Read only the plan and the progress log. A 🔄 phase/section heading is just derived from its steps — for that, only check that the markers underneath actually back it up (i.e. at least one step really is 🔄 or ✅), nothing more. Then find the first individual step that's 🔄 or has no marker. If a step is 🔄, check what's actually there to see what's still needed to finish it. If it has no marker, that's it — no checking, no reading other files yet. If the user's message approves a 🔄 step, mark it ✅ first.
2. **Choose the work, strictly in plan order.** Use the step the user named. Otherwise suggest the first step that isn't ✅: a 🔄 step, then a 🚫 step the user has now answered, then the first step with no marker. Never skip or reorder, even if the step looks hard, manual or user-only. Skip only when the user explicitly says to, and log it as "skipped at the user's request".
   - If that step is one the user must do by hand (a device test, an account setup), still suggest it. Say what they need to do and ask them to do it or confirm it's done. Mark it 🔄 while it waits.
3. **Give the quick summary, before touching anything.** Two short parts, so the user can confirm you read the plan the same way they do:
   - **So far:** a quick note on what happened in the most recent step/run — not a recap of the whole plan.
   - **About to do:** the single step you are starting, in a line or two of plain language.
Ask the user to confirm you should proceed. Do not proceed until they confirm.
4. **Do the work.** Now read whatever's needed to do it: project instructions the plan points to (CLAUDE.md, referenced docs), the relevant source files. Follow the plan's own rules and the project's instructions. Verify the way the plan and project say (tests, type check, lint, running the thing). If a check fails or anything unexpected comes up, stop and tell the user immediately with the real output — don't attempt a fix on your own first. Provide a clear explanation of the issue and the suggested resolution. Only fix it once the user confirms how they want it handled.
5. **Confirm, then update, and stop.** Summarize what was done and how it was verified. Ask the user if the step can be marked done. Update the marker and log entry to match their answer. If they say no, leave it as 🔄 and stop. If they say yes, mark it ✅ then log the run and stop. 
6. **Stop.** Don't continue to the next step until the user explicitly says to. If they confirm to proceed, go back to step 1.

## Rules while working

- Project instructions (CLAUDE.md and the docs it names) apply on top of the plan. If two documents disagree, or the plan disagrees with a document, stop and ask; don't pick one.
- If the plan doesn't say how to do something that matters (copy, a design, an interface, a choice between approaches), stop and ask. Don't invent it.
- Check current library docs before using APIs you aren't sure of; don't rely on memory for setup steps.
- Don't commit or push unless the user asks. Keep secrets, credentials and personal data out of code and the log.

## When blocked

Stop at the first point where continuing would need a guess: a document conflict, a failing check, a missing design or input, a manual step only the user can do, or a change you think the plan itself should make. Don't work around it, attempt a fix on your own, or bend the plan to fit — report and ask first.

1. Say so in the reply, question first, with a recommended answer if you have one.
2. Mark the step 🚫 and log it: what was done so far, what is blocking, and the exact question asked.

When they answer, the next run resumes that step and the 🚫 becomes 🔄.

## Log format

Append-only, newest entry at the bottom, one entry per run:

```markdown
## 2026-10-18: 1.3 ✅

Added the split function with unit tests. Tests, type check and lint pass.
```

- Heading: ISO date, step ids, and the resulting marker (✅, 🔄 or 🚫).
- Body: two or three plain sentences on what was done. For a 🚫 entry, include what is blocking and the question asked.
- No code dumps, secrets or personal data.

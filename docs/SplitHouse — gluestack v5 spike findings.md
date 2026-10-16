# SplitHouse — gluestack v5 spike findings

Oct 16, 2026 · Claude Code (spike run for Francis) · Status: for Francis to decide

## Status and purpose

This is the report the first-tasks list in `CLAUDE.md` asks for: "Report what worked and what didn't before building more," from the spike on Home and the Add charge sheet. It also answers the open question the Tech Stack doc flagged and never resolved: *is gluestack-ui v5 + NativeWind v5 actually safe to build the rest of the app on, or not?*

Short answer up front: **it works, but not cleanly.** Every piece listed in the build-order task eventually ran, but getting there meant finding and fixing a long chain of real bugs and gaps in gluestack-ui v5 and its dependency chain — not friction from our own code. One confirmed UI bug (Accordion rows) is still open. Read on for the detail, then the viability call at the end — that call is Francis's to make, not something to decide silently.

## What was tested

Expo SDK 57, gluestack-ui v5 (the `@gluestack-ui/core@5.0.0-alpha.0` line, via the gluestack CLI's NativeWind v5 setup), NativeWind v5 (`5.0.0-preview.2`, i.e. Tailwind v4), the real design tokens from `docs/config.ts` and `docs/global.css`, Manrope (5 weights) via `expo-font`, Lucide icons through gluestack's `Icon` wrapper, two required custom pieces (bottom nav, segmented control, chips — gluestack v5 has neither), gluestack's Card/Badge/Progress/Accordion/Alert/Skeleton/Button/BottomSheet/FormControl/Input/Switch/Select/DateTimePicker, Better Auth's Expo client, and an EAS development build installed on a real Android phone.

## What worked

- The token pipeline is solid. `docs/config.ts` and `docs/global.css`'s color, radius and spacing values compile correctly into real CSS and render with the right values (verified in the bundled output and later in a live screenshot).
- Every gluestack component on the mapping doc's list compiles, bundles, and (where tested) renders on screen, once its dependency gaps were filled in (below).
- The app icon, Android adaptive launcher icon, splash screen and notification icon from the icon pack all apply cleanly through Expo's config.
- `expo-doctor` and `tsc`/lint are clean across every file we wrote ourselves. All remaining errors are inside gluestack's own copied-in component code (next section).
- The EAS development build compiled and installed on a real device without issue — the native pipeline (Reanimated, gesture handler, SVG, dev client) is fine.

## Real bugs found, and fixed

These aren't nitpicks — each one would have silently broken something or blocked the build if left alone.

1. **The delivered `docs/global.css` had a real bug.** `--font-family-manrope` and `--font-size-*` aren't Tailwind v4 variable namespaces — they needed to be `--font-*` and `--text-*` (with a `--text-*--line-height` companion). As written, Manrope and the whole type scale silently never generated as utility classes. Fixed in both the doc and the app.
2. **React Native has no variable fonts.** One `Manrope` family can't flex to different weights the way `font-bold` does on web. Re-architected into five separate registered families (`font-manrope`, `-medium`, `-semibold`, `-bold`, `-extrabold`), each loaded individually via `expo-font`. This is a correction to the design handover's assumption, not just an Expo quirk.
3. **`nativewind@5.0.0-preview.2` is missing its own `types.d.ts`** (the file its own `package.json` points `nativewind/types` at doesn't exist). Worked around with a local ambient `declare module '*.css'`.
4. **gluestack-ui v5 alpha has a real dependency-declaration problem.** Across setting up BottomSheet, Select, DateTimePicker, Calendar, Menu, Switch and Accordion, we hit missing-module build failures one at a time: `@gorhom/bottom-sheet`, `@react-native-community/datetimepicker`, a missing `calendar` component, a missing `menu` component that `calendar` depends on, then **twenty separate** `@react-stately/*` and `@react-aria/*` packages that `@gluestack-ui/core`'s compiled code imports directly but does not declare as a dependency anywhere in its own `package.json` (only `date-fns` is declared). Each one only surfaced after fixing the previous one and re-running the build — there was no way to get the full list except by grepping gluestack's own compiled output directly, which is what eventually ended the loop.
5. **A stray, broken example file shipped inside the accordion component folder** (`USAGE_EXAMPLE.tsx`) that didn't even type-check and wasn't imported by anything. Deleted.
6. **21 TypeScript errors remain, every one inside gluestack's own `src/components/ui/*` code** (bad ref types in DateTimePicker and BottomSheet, `tva()` style-typing bugs in Badge and Spinner, a "too complex to represent" union in Select, missing `display-name` across Calendar's internals). Confirmed these don't block Metro bundling — they're real type-correctness bugs, just not ones Metro's transpile-only pipeline cares about.
7. **The gluestack CLI's own scaffolding put components at the project root** instead of inside `src/`, and left the babel import alias (`@/*`) pointing at the project root instead of `src/` — inconsistent with the rest of the Expo template and would have silently broken every `@/...` import at runtime even though `tsc` didn't complain (it had a fallback path; Metro's babel alias didn't). Moved and fixed by hand.

## Open, unresolved issue

**Accordion rows don't expand when tapped**, confirmed on a live web preview (screenshot-checked). The code matches gluestack's own documented usage pattern; this isn't an authoring mistake on our side as far as we can tell. The row amounts also render visibly dimmed/faded compared to the row labels for no reason in our styling — same screen, same component, so likely the same root cause. Not yet root-caused. Given everything above, a gluestack-ui v5 alpha bug is the leading suspect, but it hasn't been confirmed via the browser console or isolated in a minimal repro.

## Still unverified (not bugs — just not reachable yet)

- **The Add charge bottom sheet** never opened in the web preview. This is expected, not a bug: `@gorhom/bottom-sheet` is native-only (gluestack's own docs say "React Native and Expo only, not Next.js," and in practice it doesn't work through react-native-web either). It needs a real device to test at all.
- **On-device testing generally.** The company laptop's Windows Firewall has explicit inbound-block rules for `node.exe`, and the network runs Cloudflare WARP (which also blocked `ngrok` tunnel mode). Neither LAN mode nor tunnel mode could reach the phone from this machine. Moving the dev environment to a personal computer to get around this — once that's done, the Accordion bug and the Add charge sheet are the next things to actually verify on-device.
- **Better Auth's native Google sign-in.** Code is wired (client, Expo plugin, secure storage, the `databaseHooks` email-allowlist check), but it needs a real Android OAuth client, which needs a SHA-1 off the signing keystore EAS generated for the dev build — not done yet.

## Is gluestack v5 viable?

The Tech Stack doc flagged this as a real risk and deferred the answer to this spike: *"NativeWind 4.x is stable and v5 is in preview. Upgrades can break build tooling... First build step: a short spike... checking how easily gluestack restyles to the design tokens."* That risk wasn't theoretical — it's what we hit, repeatedly, for several hours of this spike.

Worth naming directly: gluestack's June 2026 blog post calls v5 "production-ready," but the package actually installed (`@gluestack-ui/core@5.0.0-alpha.0`, NativeWind `5.0.0-preview.2`) is tagged alpha/preview by its own publisher, and behaves like it — missing dependency declarations, a missing types file, misplaced CLI scaffolding, and at least one unexplained interactivity bug. "Stable" is a marketing claim here, not what npm says.

That said: everything did eventually work once patched, the token system (the part that actually encodes the design) is solid and not gluestack-specific, and the component surface area we need (Bottom Sheet, Select, DateTimePicker, Accordion) genuinely isn't available pre-built anywhere else for free. Two realistic paths from here:

1. **Stay on gluestack v5 + NativeWind v5, eyes open.** Budget real time for more of this kind of thing as we build out the remaining screens — Household, Settings, History, Share bill, Mark paid all pull in components we haven't touched yet (Menu, Textarea, AlertDialog, Popover), and each one is a plausible source of its own missing-peer-dependency chain. The fixes so far have all been one-time (install the package, move a file) — nothing suggests a dead end, just recurring friction.
2. **Fall back to NativeWind v4 (actually stable) and hand-style components ourselves**, using gluestack's components only as a visual/structural reference rather than installing them. More upfront work (no free Bottom Sheet/Select/DateTimePicker), but removes this entire category of risk. The design tokens carry over unchanged either way — this is a styling-engine and component-sourcing decision, not a redesign.

Recommendation: given how much of the token/theme work (the actual design) is already done and proven to work, and that every bug hit so far had a real, one-time fix, I'd lean toward **option 1** — but this is explicitly the kind of call this project's own working agreements say should go to Francis, not get decided silently. The Accordion bug should get root-caused before committing either way, since an unexplained interactivity bug is a different category of risk than a missing dependency.

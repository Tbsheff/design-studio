# Cycle 29, pick 3: kit-check

Branch `feat/kit-check`. The studio prototype check now flags hand-styled controls in an HTML prototype of an app. `list_kit_drift` scans prototype pages.

## What changed

- **Added the HTML scan.** `components/kit-drift/engine/to-markup-drift.ts` is a pure scanner. It finds `button`, text `input`, `select`, `textarea` and links styled as buttons (`btn`, `button` or `cta` classes). It skips comments, `<script>` and `<style>`. A control counts as a kit control when it has the recipe `data-slot` or all the recipe base classes.
- **Added the recipe parser.** `engine/to-pack-recipes.ts` reads the pack `components.md` format and returns the base classes, variant groups, slot and source of each component.
- **Added prototype mode to `list_kit_drift`.** `kit-drift-prototype.ts` handles a project that has `appProjectId` and is not an app.
  - Recipes come from `design-system/components.md` in the prototype. When that file is missing, they come from the app source through `getComponentsMd`, the same function the pack extraction uses. A new prototype has no `components.md`.
  - The output fields are the same. `file` is the prototype page. `kitComponent.importPath` is the kit source file.
  - The action description has one more sentence. `page` must be an `.html` file inside the prototype.
- **Joined the kit finds to the prototype fix loop.** The code is in `agent/prototype-kit-review.ts`, `prototype-review.ts` and `final-check.ts`.
  - The kit lines join the existing `studioAppReview` lines. When the agent ran its own `review_frame`, `toReviewGaps` returns a kit-only gap. A kit-only pass runs at most one fix loop, and only when it finds something.
  - The note adds: "Studio check: N controls did not use the app kit; a fix loop ran; after it M."
- **Shrank `final-check.ts` by 28 lines.** It was at the 20-import cap. The review opening text moved to `prototype-kit-review.ts`. The layout-probe lines moved, unchanged, to the new `agent/review-layout.ts`.
- **Did not edit** `sdk-driver.ts`, `run-notes.ts`, `contracts.ts`, `mock.ts` or any generated file. `gen-routes` gives no diff.

## Checks

- **`call-action.ts kit-drift.list`** on the seeded prototype page (3 hand-styled buttons, 1 input, 1 `data-slot` button, 1 commented button) passes. All 3 surfaces return the same 4 finds, with 0 diffs.
- **App page** (`app/patients/page.tsx`): passes on 3 surfaces with 2 finds (input, button). The app-source path changed only through a shared page-slice helper. Main was not run on this page.
- **Over MCP:** `list_kit_drift` on the branch run's prototype returns `{"items":[]}`.
- **Script check** (`ds-wt/kc-loop-check.mts`):
  - The kit-only gap opens.
  - The pass-1 prompt lists "1 input" and "3 buttons" with the base classes and `data-slot`.
  - Pass 2 for kit-only returns a null prompt.
  - The note is "4 controls did not use the app kit; a fix loop ran; after it 0".
  - A plain prototype (no app) gives no gap, no lines and no note.
- **Mock runs** do not reach `continueAppReview`, because the mock driver is separate. The loop was proven with real runs.
- **Real runs** used the prompt "patients list with a search field, filters and an add button", beside `ds-wt/kc-next` (Next 16, Tailwind 4, shadcn-style button, input and card):

| | main | branch |
|---|---|---|
| Hand-styled controls at end (branch `list_kit_drift`) | 6 (5 buttons, 1 input) | 0 (6 before the check) |
| `get_port_plan` "No kit match" | 3 (table, tabs, avatar) | 1 (table) |
| Fix loops | 1 (review finds) | 1 (review finds and kit finds together, no extra loop) |
| Fix loop time | n/a | about 12 s |
| Run time, cost | 78 s, $0.22 | 76 s, $0.23 |

The "No kit match" count depends on the app kit (it has no Table, Tabs or Avatar), not on the prototype classes. The branch page still looks the same after the agent added the recipe classes, because the page CSS sets the look.

- **Screenshots:** `cycle-29/kit-check/chat-note-dark.png` and `cycle-29/kit-check/chat-note-light.png` show the chat note.
- **Gates pass:** `pnpm run typecheck`, `pnpm run lint:gate` (59600 against baseline 89733), `pnpm run build:ui`, and `gen-routes --check`.

## Left out

- **Cards:** the `tag` union has no `card`, and the spec forbids new union members.
- **Labels and tables** in prototype mode.
- **`apply_kit_drift`** does not work on prototype finds, as the spec says.
- **Bonaparte `list_kit_drift` with `page`:** not run. The app-source path is unchanged apart from the page-slice refactor.
- **The note** joins two "Studio check:" sentences when both checks ran.
- **Roadmap:** `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added (L6e).
- **Files outside the spec list:** `components/kit-drift/kit-drift-prototype.ts`, `kit-drift/deps.ts` (2 re-exports) and `agent/review-layout.ts`.

# Cycle 29 pick 1: route-fidelity

Branch `feat/route-fidelity`, cut from main `7e8cda099`.

## What changed

- **Like-for-like shots on a route update.** `port.inspect` reads `RouteSourceStore.inspectChanges`. When the prototype page is a route copy of the same app route, the check is a route update:
  - `app-change`: the text on the added lines of the copy-to-now diff, minus the text on the removed and context lines, minus the prototype page text. The app elements with that exact text get `display: none` before the app shot.
  - `data-row`: rows of `tbody`, `[role=row]` groups and lists of 3 or more `li` (not in `nav`, `header`, `aside`, `footer`). The cell text boxes of both pages are masked on both pictures with `maskRect`, inset by its 24 px margin, so the borders, fills and row heights still score. When the row counts differ, the longer page is shot again with the extra rows hidden.
  - A new route gets no hide and no mask. Its score does not change (75 on main and on the branch).
- **Probe step.** New `preview/probed-preview.ts` and `preview/probed-shot-read.ts`, and a `probedScreenshot` method on `McpReadStore`. It wraps the page so that one string expression runs just before the shot, in the same page session. The probe source is in new `review/port-check/port-mask-probe.ts`; the masks and the text rules are in new `review/port-check/port-masks.ts`.
- **Output.** `PortMatchSchema` adds `masked` (`{ reason, text }`, max 20). Each `PortArea` adds `elements`: up to 3 app elements in that area, with a selector and text. The `port.inspect` description has 2 new sentences. `gen-routes` wrote no change, and `--check` passes.
- **Fix loop** (`agent/port-review.ts`): it says "the updated route". It lists the kept app text ("The studio hides it in the app shot, so give the elements around it the prototype spacing") and the data row text, and names the elements in each low area.
- **Prompt** (`agent/port-route-update.ts`, new `agent/port-route-folder.ts`):
  - The `<route-update>` tag holds up to 3 `<route-folder-file>` blocks, one for each file that the route imports from its own folder (code files first).
  - It has one style-stack line: Tailwind and its major version from `package.json`, CSS modules, a global CSS file, or "This app has no Tailwind. Style with what the route uses now."
- **Note.** "Updated app/patients/page.jsx and patient-list.jsx (kept 2 data reads)." The note counts the folder files and data hooks (`use*` calls that are not React hooks).
- **Files outside the owned list:**
  - `review/index.ts`: one export line, for the area index rule.
  - `preview/mcp-read-store.ts`: the new method.
  - The new preview files.

## Checked

Setup:
- Fake Next 16.4.1 app `ds-wt/rf-next`: `.jsx` files, no Tailwind, `app/globals.css`. `node_modules` is a dereferenced copy of the Next closure from the Bonaparte pnpm store. Nothing was written in Bonaparte.
- `lib/server.js` throws unless `.db-ok` exists.
- Steps: copy `/patients` (500, fixture offer), fixture, then copy into the same project.
- I hand-wrote a designed prototype page (card, header row, ward pills).
- After the copy, the app got "Ward list for today." and 6 rows of new data (the prototype has 5 sample rows).
- Studio on port 5720, data in `ds-wt/route-fidelity-data`.

The cycle-28 `real-run-2-*.jsx` files are tracked and present. They were scored against another prototype, so I did not use them as the before score. I made the before score with my own real run on main.

Real model (Sonnet 5.5, local sign-in, 2 runs, Move to app of the fixture copy onto `/patients`):

| Run | Code | First score | After fix loop | Fix loop | patient-list changed | Data reads kept | Sample rows in app | Time | Cost |
|---|---|---|---|---|---|---|---|---|---|
| 1 | main | 17 | 17 | yes | yes | yes (`prefetchPatients`, `dynamic`, `usePatients`) | 0 | 41.9 s | $0.195 |
| 2 | branch | 71 | 71 | yes | yes | yes (same) | 0 | 29.1 s | $0.296 |

- Run 1 note: "Updated app/patients/page.jsx (kept 1 data read)". The agent blamed the kept line.
- Run 2 note: "Updated app/patients/page.jsx and patient-list.jsx (kept 2 data reads)".
- Run 2 left `.title` at `margin-bottom: 4px` (the prototype has 24 px). With the kept line hidden, the table sits 20 px high. The fix loop changed the margin of the hidden line, so the score did not move. The fix prompt sentence "The studio hides it in the app shot..." was added after run 2. No real run measures it (the budget was 2).

No-model replay, same app files, main against branch (`replay-scores.txt`):

| App files | Main | Branch |
|---|---|---|
| Run 1 output (content-box width, 8 px title gap) | 17 | 52 |
| Correct port (run 1 output, `box-sizing: border-box`, 24 px title gap) | 48 | **99**, no area under 80 |
| Correct port, with no card border and `h1` at 20 px | n/a | 50; areas name the `h1` and the table |
| New route `/new-list` | 75, `masked: []` | 75, `masked: []` |

- Gate: a correct route update scores 99 with no area under 80. The masks do not hide real faults (50).
- `masked` lists "Ward list for today.", "Hid 1 extra data row on the app page." and the cell text.

Other checks:
- **Mock run** (`prompts.txt`): the tag holds the `patient-list.jsx` text and "Style stack: no Tailwind, plain CSS in app/globals.css...". The fix prompt says "updated route" and names `main > h1 "Patients"`.
- **Style stack** (`style-stack-check.txt`): a folder with only a Tailwind 4 `package.json` gives "Style stack: Tailwind 4, from package.json...".
- **call-action `port.inspect`** (`call-action-inspect.txt`): http, mcp and agent pass with 0 diffs.
- **UI**: `run-note-{dark,light}.png` show the note and the port check row (71%). The diff sheets with the masks are `port-diff-real-run-2-branch.png` and, for main, `port-diff-correct-port-main.png`. The sheet is a PNG and has no theme.
- **Final checks**: `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59617 diagnostics, baseline 89733). `pnpm run build:ui` passes. `gen-routes --check` passes.

## Left out

- **`rf-next-tw` real run**: not done. The 2 real runs went to the main before score and the branch. Instead, a `package.json`-only check covers the style-stack line.
- **Kept text spacing**: run 2 shows that a hidden kept line still leaves the gaps around it wrong. The new fix-prompt sentence aims at this, but no run measures it.
- **UI fix prompt**: "Fix differences" (`ui/features/chat/port-check-model.ts`) does not list `masked` or `elements`. The file is not on the owned list.
- **Union masks**: the masks are the union of both pages' cell boxes. When the app layout is shifted, the union boxes show past the prototype card on the sheet (the run 1 replay).
- **Bonaparte**: `get_port_plan` for a route copy was not run (it needs its database).
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.

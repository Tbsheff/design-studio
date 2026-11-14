# Cycle 37 pick 3: dark-check

Branch `feat/dark-check`, cut from main `e682c14b6`.

## What it does

- **Added: dark lines in the prototype review.** New `agent/prototype-dark-review.ts`. On an HTML flow run with an edit, `listKitLines` reads the flow once, then runs the phone step and the dark step in parallel on the flow pages (up to 6).
  - **Skips pages with no dark values.** A file read checks the inline `<style>` blocks and the local linked style sheets for `.dark`, `[data-theme="dark"]` or `prefers-color-scheme: dark`. 0 such pages: no render. The server logs `[agent] dark check: no page has dark values, so no dark render`.
  - **Renders in dark.** Each page renders at 1440 x 900 through `toSchemedPreview(preview, "dark")` (on `withPage`, not `peekPage`, so the scheme holds). axe runs with `color-contrast` only. Each page has a 12 s timeout. The server logs `[agent] dark check: rendered <pages> in <ms> ms`.
  - **Lines.** One line per page with misses, max 6, then a count line: "- Dark: 6 text items on plans.html are under AA contrast in dark (first: "b[...]" 1.5:1). Use token colors such as var(--fg), not raw colors, then take get_screenshot with colorScheme dark."
- **Changed: the opening.** `LineCounts` has a `dark` count. Pass 1 names "each page in dark" and adds the dark rule. Pass 2 and later give an opening when a dark line is left. Order: kit, flow, phone, dark.
- No new action, no union member, and no change in `gen-routes` output. MCP agents use `get_screenshot` (with `colorScheme`) and `inspect_flow_page`.

## Checks

- **Seed `ds-wt/dk-seed`** (`tokens.css` with `.dark`, `index.html` with token colors, `plan.html` with `.price { color: #1a1a1a }`). The script calls `listKitLines` and `toReviewOpening` with a Chrome render:
  - Pass 1: 1 dark line on `plan.html` (2 items, 1:1) and the dark opening. After the token fix, pass 2: 0 lines and a `null` opening (`dark-check/seed-two-pass.txt`).
  - With no fix, pass 2 gives "checked each page in dark once more. These gaps are left." (`seed-pass2-left.txt`).
- **No dark block (`ds-wt/dk-nodark`):** 0 dark renders, the log says no dark render, `null` opening (`seed-no-dark.txt`).
- **Added seconds per pass:** 0.43 to 0.56 s on the 2-page seed and 0.9 to 1.1 s on the 3-page run trees (script stub). In the live branch run the server logged 1.9 s (pass 1) and 1.1 s (pass 2). The dark step runs in parallel with the phone step.
- **Commands:** `pnpm run typecheck` 0 errors; `pnpm run lint:gate` pass (59624, baseline 89733); `pnpm run build:ui` pass.
- `call-action.ts`: not run. This pick adds no action.

## Real-model runs (2 of 2)

Prompt: the cycle-36 yoga prompt plus "Use a dark navy price badge on each plan." Sonnet 5.5, fresh data folders under `ds-wt/dark-check-data/{main,branch}`.

| | main `e682c14b6` | branch |
|---|---|---|
| Dark lines at run end (branch step) | 2 (plans.html 6 items, confirm.html 2 items, 1.2:1) | 0 |
| Dark lines in the review | n/a | 1 (plans.html, 6 items, 1.5:1) |
| Review fix loops | 1 (2 hover findings) | 1 (2 hover findings + 1 dark line) |
| Run time | 120 s | 85 s |
| Cost | $0.41 | $0.33 |

The gate passes: 0 dark lines at run end on the branch. Main shipped unreadable price text in dark on 2 of 3 pages. One run per side, so model variance is not measured. Raw data: `dark-check/runs.txt`, `score-{main,branch}-run.txt`.

## Screenshots

- `dark-check/run-page-{dark,light}-{0,1,2}.png`: the 3 branch run pages through `get_screenshot` with `colorScheme` dark and light. They read well in both.
- The local share link of this build gives PNG snapshots of the frames, with no Play and no theme choice. So the Play dark view was not shot. The `get_screenshot` dark render uses the same `.dark` and `data-theme` switch as Play.

## Left out

- The line text says `colorScheme dark`, not "theme dark" as in the spec. The `get_screenshot` input field is `colorScheme`.
- The first-item text shows the axe selector (it can hold `data-studio-loc`), not the class name.
- `@import` inside a style sheet is not followed for the dark-values check.
- No dark tally in the run note.
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A is not updated.

## Files outside the pick list

- `apps/desktop/src/server/preview/page-capture/index.ts`: re-exports `loadAxeSource` and `toSchemedPreview`, so the new agent file imports a preview leaf index (W19a) and not `preview/axe.ts` or `preview/color-scheme.ts` directly. No other pick owns this file.

# Cycle 38 pick 2: photo-text

Branch `feat/photo-text`, cut from main `e51466e7f`.

## What it does

- **Added: a text-on-photo pass in `render_check`.** New `preview/text-on-photo.ts`. `runAxe` in `preview/axe.ts` calls it after the shared axe run, on desktop renders only. `runSharedAxe`, `axeRunExpression` and the `axeRuns` cache do not change.
  - **Skips cheap.** One evaluate looks for `img`, `picture`, `video`, `canvas` or any `background-image` (also on `::before` and `::after`). None: no axe run, 0 to 1 ms.
  - **Finds nodes.** It loads axe when the page does not have it (a cached shared run does not load it), then runs `color-contrast` with `resultTypes: ['incomplete']`. It keeps nodes with reason `bgImage`, `bgGradient`, `bgOverlap`, `imgNode` or `pseudoContent`, skips nodes with a `text-shadow`, and takes the 3 largest text nodes.
  - **Measures pixels.** For each node: mark it with `data-studio-pt`, add one style rule (`color` and `-webkit-text-fill-color` transparent, no text shadow, no transition), wait 2 frames, take a clip shot of the text range box in document coordinates, then remove the mark and rule in a `finally`. `pngjs` decodes the shot. The text color is normalized through a canvas (so `oklch` and `color()` work). The ratio is the lower one of text against the 10th and the 90th percentile background luminance. AA: 4.5:1, or 3:1 for 24 px, or 18.66 px at weight 700.
  - **Finding.** `check: "a11y"`, the axe selector, the `data-studio-loc` source, severity from the axe impact: "Text on a photo or gradient is 1.2:1 at its lightest part (AA needs 3:1). Add a scrim behind the text, a text shadow, or move the text off the light part."
  - **Logs** one line per pass: `photo-text: leased page, <n> nodes, <k> under AA, reasons [...], <ms> ms`.
- **Leased pages only.** `runAxe` has one caller, `inspectQuality`, which runs inside `pages.lease` in `renderViewport`. Peek pages and the studio review (`review/run.ts`, which uses `page.axe`) never reach it. A failed pass logs and returns no findings, so `render_check` does not fail.
- No new action, no union change, no `render_check` input change (N4), no change in `gen-routes` output.

## Checks

- **Seed `ds-wt/pt-seed`** (local JPG, light top, dark bottom). A script calls `BrowserPool.renderCheck` with `quality: true` on both backends (`seed-chrome.txt`, `seed-electron.txt`):
  - `index.html` (white `h1` on the light sky, white `h2` on a light gradient card): 2 findings, `h1` 1.2:1 (Chrome) or 1.1:1 (Electron), `h2` 1.3:1.
  - `plan.html` (dark-to-clear scrim, dark card): 0. `fixed.html` (the index with the scrim fix and dark card text): 0. `plain.html` (no photo): 0, pass skipped.
  - The `render_check` screenshot after the pass shows the `h1` (the style restore works).
- **Added ms per render:** 0 to 1 ms on a page with no photo; 190 to 260 ms (Chrome) and 110 to 125 ms (Electron) with 3 nodes; 190 to 410 ms on the real run pages.
- **Peek pages:** the branch server logged no `photo-text` line while the UI loaded the project canvas (live frame and probes). Only leased `render_check` renders log it.
- **Commands:** `pnpm run typecheck` 0 errors; `pnpm run lint:gate` pass; `pnpm run build:ui` pass. No `src/ui` change, so no `check-bundle` run.
- `call-action.ts`: not run. This pick adds no action. `render_check` is the in-app agent tool `mcp__studio__render_check`; its output now has the new findings.

## Real-model runs (2 of 2)

Prompt: "A landing page for a mountain yoga retreat with a full-bleed photo hero and the headline on the photo." Sonnet 5.5, fresh data folders `ds-wt/photo-text-data/{main,branch}`, no image-search key (photo art SVGs). Scored after the runs with the branch pass (`score-runs.txt`).

| | main `e51466e7f` | branch |
|---|---|---|
| Photo-text findings at run end (branch scorer) | 1: nav link "The week" 4.3:1 (AA 4.5:1). In document order a second link, 4.2:1 | 0 |
| `render_check` calls | 4 | 5 |
| Fix loops (studio check) | 2 (9 findings, then 3, then 0) | 2 (9 findings, then 1, then 0) |
| Run time | 89 s | 95 s |
| Cost | $0.22 | $0.30 |

The gate passes: 0 photo-text findings at run end on the branch. Limits:
- The branch run used the first commit, which did not measure `pseudoContent` nodes. Both heroes put a `::after` scrim on the hero, so axe gives `pseudoContent` for all hero text, and the in-run pass measured 0 to 1 nodes. The second commit adds `pseudoContent` and the largest-text order; the score above uses it.
- Both models added a scrim without help, so this prompt does not show the hero miss on main. The seed shows it.
- One run per side, so model variance is not measured.

## Screenshots

- `photo-text/branch-hero-{dark,light}.png`: the branch run in the studio UI. Light: the hero reads well.
- Dark: the canvas frame follows the studio theme, the page's dark tokens turn the hero text (`color: var(--bg)`) dark on the dark photo. With `.dark` set, the pass finds 3 misses: `h1` 2.0:1, `.logo` 1.8:1, `.lead` 1.3:1 (`score-branch-dark.txt`). This is runner-up 9 (photo-text in the dark step); the dark step does not run this pass yet.
- `photo-text/branch-page-render.png`: the `render_check` render of the branch hero.

## Left out

- The dark step (cycle-37 `prototype-dark-review.ts`) does not get the pass. The dark shot above shows that it would find real misses.
- Mobile and tablet renders do not get the pass (desktop only, as the spec says).
- A node with any `text-shadow` is skipped, because the author already tried a fix; the shot does not measure the shadow.
- Text alpha is not blended; a half-transparent text color is measured as opaque.
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A is not updated.

## Files outside the pick list

None. `preview/page-capture/index.ts` did not need a change.

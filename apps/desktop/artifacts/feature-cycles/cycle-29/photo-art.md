# Cycle 29 pick 2: photo-art

Branch `feat/photo-art`. Photo slots get a designed art panel from the page tokens, in place of a flat box.

## What changed

- **Engine.** New pure `share/image-search/engine/to-photo-art.ts`: slot words, slot aspect and 4 token colors give an SVG (gradient, glow, 3 to 6 marks, `feTurbulence` grain). The same words and colors give the same art. No I/O, no Effect, no hashing library.
- **Fill.** New `share/image-search/photo-art.ts` and `photo-art-colors.ts`. The studio finds the plain `data-photo` slots on an HTML page (no `src`, no background image, no `data-photo-art`), reads the colors (`design-system/tokens.css`, `tokens.css`, linked CSS files, then the page `<style>` blocks; `var()` resolves to its token or its fallback), and writes `assets/photo-art-<hash>.svg`. A div slot gets the art as a background, `role="img"`, its label text as `aria-label` and `data-photo-art`; the label text goes. An img slot gets `src` and `alt`. `data-photo` stays.
- **After a run.** A completed edit run with image search off gets one "Photo art" version and one undo step after the run version. The hook is in the run follow-up: new `http/run-follow-up.ts`, which also holds the existing run history record and the queued-run step. `http/app-context.ts` calls it (net -17 lines). The art step ends before the next queued run starts.
- **`apply_image_search`.** With search off it no longer fails: it paints the page and returns `note: "Image search is off. The studio painted N art slots."`. With search on, a missed HTML slot gets art and keeps `data-photo-missed`, an art slot counts as open, and a photo replaces the art (the art background lines and `data-photo-art` go). New `slots` input (default null): it searches the named missed slots again. Missed words compare decoded (`&quot;`), and slot words are decoded before search.
- **Text.** For an HTML entry with search off, the off rule asks for a `data-photo` slot with a label that the studio paints, and the photo note says "Photo slots show art from your colors. Turn on image search for real photos (image sheet, or STUDIO_IMAGE_SEARCH=on)." JSX and TSX entries keep the gray-box rule and note, since art paints HTML only. `PHOTO_ON_RULE` does not change. `PHOTO_STEP` says missed HTML slots get art and keeps gray-box for JSX. The action description changed 3 sentences; gen-routes ran (no generated diff).
- **Mock.** The mock landing page writes one `data-photo` slot (net 0 lines in `mock.ts`).

## Files outside the pick list

- `http/app-context.ts` (net -17 lines) and new `http/run-follow-up.ts`: the run follow-up hook. `beforeCommit` and the SDK driver cannot carry the art step: the art would fold into the run version, and the mock driver does not go through `sdk-driver.ts` or `run-notes.ts`.
- `share/image-search/photo-tag.ts` (decode fix, label text), `share/image-search/index.ts`, `share/index.ts` (export), `handlers/image-search/apply.ts` (passes `slots`).
- No change to `sdk-driver.ts`, `run-notes.ts`, `lifecycle.ts` or a hand aggregator.
- `.claude/goal/roadmap.md` is not in this worktree, so Appendix A did not change.

## Checks

| Check | Result |
|---|---|
| Mock run, search off, "bakery landing page" | Passes: the slot has `data-photo-art`, `role="img"`, `aria-label="Hero photo"`, brand colors from `design-system/tokens.css` (`art-light.png`, `art-dark.png`) |
| One Cmd+Z in the app | Passes: the plain slot and its label come back, the SVG file goes (`undo-light.png`, `undo-after-light.png`) |
| `call-action.ts image-search.apply`, search off | HTTP paints 1 slot; MCP and agent return success with the note (nothing left to paint). The diff is only first write vs repeat (`call-action-off.txt`) |
| Search on (project setting), same page | HTTP replaces the art with an Openverse photo; MCP and agent return the idle note (`call-action-on.txt`) |
| Quoted missed slot (`&quot;zzqxv vvqkj&quot; plorbixqu`) | 1st call: 7.0 s, miss, art painted. 2nd call: 0.4 s, skip note, no search. 3rd call with `slots`: searched again |
| `pnpm run typecheck` | Passes, 0 errors |
| `pnpm run lint:gate` | Passes (59605 diagnostics, baseline 89733) |
| `pnpm run build:ui` | Passes |
| `gen-routes --check` | Passes |

The agent tool `apply_image_search` stays in the in-app agent tool set only with search on (unchanged). The call-action agent leg served it in off mode through the dispatcher, with the same note.

## Real model (1 run)

Branch, blank HTML "bakery landing page", search off, local Claude Code sign-in.

| Measure | Value |
|---|---|
| Flat-box share, first 1280 x 900, before the art step (run version) | 23.6% (1 box 470 x 590) |
| Flat-box share after the art step | 0% |
| Main baseline (cycle-28 `real-main-bakery-page-light.png`, same scan) | 23.7% |
| Slots painted | 5 (hero, 3 products, story) |
| Run time, cost | 89 s, $0.24 |
| First draft (first `Write`) | 21.6 s after start. The art step runs after the run version, so it cannot change first-draft time |
| Studio review | pass 1: 5 findings, fix loop; pass 2: 0 findings |

Scan: `ds-wt/pa-scan.mjs`. It counts 10 px cells that are one flat color (±3), groups them by color (±4), drops the page background color, and counts regions of 150 x 150 px or more. Screenshots: `real-branch-bakery-before-art-light.png`, `real-branch-bakery-art-light.png`, `real-branch-bakery-art-dark.png`.

## Merge notes

- Every mock HTML run with search off now ends with one more version ("Photo art") and one more undo step. A mock check in another pick that counts versions or undo steps after a run sees one more.
- Shared files for the merge step: `http/app-context.ts` and new `http/run-follow-up.ts` (the run follow-up), `share/index.ts` (one export).

## Left out

- **Main real run.** I did not run main: this worktree is the branch. The main baseline is the cycle-28 main screenshot and the branch run version before the art step, both scanned with the same script. That is 1 real run, not 2.
- **Dark mode.** The art reads the light `:root` token values at fill time. A dark preview shows the light art (`real-branch-bakery-art-dark.png`). A theme change does not repaint it. Repaint on `theme.apply` belongs to `theme-run.ts` (pick 5), so it is not here.
- **JSX and TSX slots.** HTML pages only (cycle-27 runner-up 6).
- **Orphan SVG after a photo.** When a photo replaces art, the old `photo-art-*.svg` file stays in `assets/`.
- **Empty miss version.** A `slots` call that misses again writes a "Photo misses" version with no file change (behaviour from before this pick).

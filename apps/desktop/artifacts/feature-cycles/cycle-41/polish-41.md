# Cycle 41, pick 1: polish-41

Branch `feat/polish-41`. Mock server on port 6410 (preview 6411), data at `ds-wt/polish-41-data`. Fixtures: `ds-wt/p41-tall` (7,000 px landing page, low-contrast footer link at about 6,400 px), `p41-align` (3x4 grid, row gaps 24/24/21, card `#g22` 2 px right; 4 `inline-block` cards with `vertical-align: top`, card 3 `margin-top: 2px`), `p41-align40` (the 4 cycle-40 align cases, rebuilt), `p41-perf` (20 flex rows of 19 boxes), `p41-z` (4 overlapping cards).

## Done

- **Export to 8,000 px.** Added `EXPORT_FRAME_MAX_HEIGHT` (= `CANVAS_MAX_HEIGHT`), `EXPORT_PNG_MAX_PIXELS` (16,000) and `isPngScaleAllowed` in `contracts/src/export.ts`. `actions/src/export/schema.ts` drops its local 4000 and uses both caps. `project-source/source.ts` has width and height schemas, and the error names the right cap. New `toPngFrames` refuses a PNG frame whose height x scale is over 16,000 px: "This frame is 7,000 px tall. Export it at 1x or 2x." Selection-only PNGs skip this check.
- **Export dialog.** 3x is `aria-disabled` and has a `data-tip` when a chosen frame is too tall. A saved 3x pref drops to the highest allowed scale. Arrow keys skip the off button.
- **Review to 8,000 px.** `review-request.ts` clamps width to `CANVAS_MAX_SIDE` and height to `CANVAS_MAX_HEIGHT`. `payload/schema.ts` has `HeightSchema` for `ReviewFrameFields.height` only.
- **Critique.** Tile height is `min(height, CANVAS_MAX_SIDE)`.
- **Align.** `align-probe.ts` sends `display` and `verticalAlign` per child.
  - `align-lines.ts`: an `AlignLine.role` (`line`, `column`, `rows`). A flex or grid parent with 2 or more equal bands gets 1 column line per index (start edge only) and 1 `rows` line over the band boxes (gap only, `fix: null`).
  - A block parent whose children are all `inline-block` or `inline-flex` gets row lines. They check the top edge, or the bottom edge when every child has `vertical-align: bottom`.
  - New roles have their own hit keys, so they do not collide with row-line keys.
- **Front and back on many layers.** `toEndPlans` in `z-order-model.ts` folds the layers in paint order on one stack read. It writes each plan's z and position into the in-memory stacks. `toLastWrites` keeps the last write per source. Then 1 `set_stacking` call. With more than 21 writes it makes no write and shows "Select 20 layers or fewer to bring them to front." (or "send them to back").

## Checked

| Check | Main | Branch |
|---|---|---|
| MCP `export` PNG 1x, 7,000 px frame | Fails: "Expected a value between 1 and 4000" | Passes: 1440x7000 PNG, 1.6 s |
| PNG 2x | Fails | Passes: 2880x14000, 1.0 s |
| PNG 3x | Fails | Refused: "This frame is 7,000 px tall. Export it at 1x or 2x." |
| PDF | Fails | Passes: 1 page, 1080x5250 pt (7,000 px), 1.1 s |
| Height 8,001 | n/a | Refused: "between 1 and 8000" |
| Export dialog on `p41-tall` | n/a | 3x off with tip, 2x on. `export-3x-off-{dark,light}.png` |
| HTTP review, height 7,000 | 400 | 200 in 0.65 s, frame 1440x7000, footer link contrast hit listed |
| `run_critique` on 7,000 px frame | n/a | 2 tiles: 1440x4000 and 1440x3000 (read from the tile cache) |
| Align on `p41-align` | 0 hits | 3 hits: column edge `#g22` (Fix), grid row gaps 24/24/21 (no Fix), inline card `#i3` (Fix) |
| Fix on `#i3` in the Review panel | n/a | 1 write, `margin-top: 0px`. Re-run gives 2 hits. `review-align-{dark,light}.png` |
| Cycle-40 cases (`p41-align40`), 400-box page | 3 and 11 hits | Same hits, same text |
| Probe + engine, 400 boxes (`p41-align-bench.txt`) | n/a | 22 to 24 ms warm, 32 ms cold. Engine 0.3 ms |
| `p41-z` cards 1 and 3, Front | 2 versions, 1 undo restores only card 3 | 1 version "z-index 3 on 2 layers", both over 2 and 4, 3 over 1. 1 Cmd+Z restores both. `z-front-dark.png` |
| Back | 2 versions | 1 version, card 1 stays under card 3. 1 Cmd+Z restores both. `z-back-light.png` |
| `call-action.ts stacking.set` with 3 `others` | n/a | Passes: 3 surfaces, 0 diffs, 1 undo reset each, file sha unchanged |
| `pnpm run typecheck` | n/a | Passes, 0 errors |
| `pnpm run lint:gate` | n/a | Passes: 59,590 (baseline 89,733) |
| `pnpm run build:ui`, `check-bundle` | n/a | Passes: B1 274,703 B, delta 0 |
| `gen-routes.ts --check` | n/a | Passes |
| `check-actions.ts --probes` | 557 hits | 557 hits. No new hit |

## Differences from the spec

- **Z fixture.** With z auto, 1, 2, auto, card 3 is already on top. Front then writes only card 1, so main shows 1 version. I used z auto, 1, auto, 2 with full overlap, so both selected cards need a write.
- **One-line HTML.** On main, the second sequential write fails: "No element starts at line 1, column 622". The first write moves the column (`p41-main-z-front-oneline.txt`). The single call fixes this too.
- **Inline-block card.** `vertical-align: top` makes `margin-top` move the box, so that hit gets a margin Fix. The grid row-gap hit has no Fix, because the gap comes from all cards in a row. So 2 of 3 hits have Fix, as the spec says.
- **Review over 4,000 px on main.** MCP `review_frame` already used the canvas height (7,000). A 4,000 px HTTP review also listed the footer hit, because the DOM probe reads the full page. The real gap on main was HTTP and UI: they refused or clamped the height to 4,000.
- **`STACKING_OTHERS_MAX`.** The UI cannot value-import action schemas (U3), and `actions/src/stacking/**` is off limits. So `contracts/src/stacking.ts` now exports `STACKING_OTHERS_MAX = 20`, and the actions schema keeps its own literal 20. A later slice can make the schema import it.

## Open (for Tyler)

- **Snapshots, not edited.** Live `tools/list` against main differs in 3 tools:
  - `export`: frames height maximum 4000 to 8000. This is `export.json` line 67.
  - `export_handoff_export`: same field. It is in no snapshot file.
  - `review_frame`: height maximum 4000 to 8000. The `direct-edit-component.json` snapshot has no `width` or `height` field (props: projectId, directionId, frame, path, viewport, selector), so the snapshot was already behind and this adds no new line to it.
- **`set_forced_state` cause, confirmed.** The snapshot enum has 5 values (hover, focus-visible, active, disabled, dark). The live tool has the 19 `STYLE_STATES`. The 8 commits `74959ecd9`, `0679a706c`, `8e7c8b127`, `661642047`, `cd718a551`, `9a4f03c9d`, `7ffed28d0` and `6b80656a9` changed the enum or text with no snapshot change. `4b55cbe59` patched the file for `edit_element` only. Nothing runs `mcp-snapshot.ts --check` (not in `check:scripts`, `check` or the commit hook). See `polish-41/set-forced-state-cause.txt`. Wiring the check in is one more `check:scripts` decision, next to S11, E1, O12 and E16.
- `check:scripts` still fails at `check-actions` (557 against 407), the same as on main.
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A is not updated. New files: `share-publish-ship-export/export-scale-model.ts`.

## Files outside the pick list

No other pick owns these:
- `server/export/{export-file.ts,source.ts}` and `server/project-source/index.ts`
- `share-publish-ship-export/{export-option-fields.tsx,segment-button.tsx,segmented.tsx,radio-keys.ts,use-export-options.ts}` and new `export-scale-model.ts`
- `ui/styles/forms.css`: the `aria-disabled` segment style. CSS does not count in B1
- `review/engine/align.ts` (edge key per role)
- `stacking/deps.ts`
- `contracts/src/stacking.ts`

## Left out

Nothing from the pick. No real-model run.

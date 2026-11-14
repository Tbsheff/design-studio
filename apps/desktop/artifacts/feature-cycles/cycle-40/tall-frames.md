# Cycle 40 pick 5: tall-frames

Branch `feat/tall-frames`. A canvas frame can now be up to 8,000 px tall. The width cap stays 4,000 px. Frame-fit, drag resize, `canvas_place`, `add_frame` and the saved `canvas.json` all take the new height.

## What changed

- **Added** `CANVAS_MAX_HEIGHT = 8000` beside `CANVAS_MAX_SIDE` in `contracts/src/canvas-file.ts`. `side()` takes the cap as a parameter, so `parseCanvasFrame` keeps a saved height up to 8,000.
- **Added** `toFrameSize(width, height)` in `canvas-file.ts`. It clamps the width to 4,000 and the height to 8,000. `server/canvas/tools.ts` (`sizeOf`) calls it. `tools.ts` goes from 636 to 632 lines.
- **Split** `FrameSideSchema` in `actions/src/canvas/frame/schema.ts`. The height uses the new `FrameHeightSchema`, max 8,000, for `add_frame` and `canvas_place`. Both caps come from `@design-studio/contracts/canvas-file`.
- **Changed** `PresenceSideSchema` in `actions/src/canvas/schema.ts` to use `CANVAS_MAX_HEIGHT`. `liveSize` comes from the viewport, so a tall viewport would otherwise fail `setPresence`. The schema covers both sides, so the presence width also accepts up to 8,000 (presence only). The file stays at 500 lines.
- **Changed** `to-fit-height.ts` to use `CANVAS_MAX_HEIGHT`. The warning now says "The page is taller than 8000 px. The frame stops at 8000 px."
- **Changed** the UI clamps in `use-viewport-custom.ts`, `canvas-frame-ops.ts` (`resizeFrame`) and `frame-resize-model.ts` (`clampSide`). Each one uses a separate width and height cap from contracts.
- **Changed** `canvas-legacy-layout.ts` (outside the pick list, no other pick owns it). It now imports `CANVAS_MAX_SIDE`, because `canvas-frame-ops.ts` no longer exports `MAX_SIDE`. The behaviour is the same.
- **Fixed** `server/preview/frame-shot-read.ts` (outside the pick list, no other pick owns it). A frame shot stopped at 6,000 px. So `get_screenshot` cut a tall frame, and the canvas still image (`object-fit: cover`) stretched the 6,000 px shot by 1.25x over a 7,500 px frame. The cap is now the larger of 6,000 px and the frame height.

## Checked in the running app

Server on port 7480 with `STUDIO_AGENT=mock` and data at `ds-wt/tall-frames-data`. The fixture is `ds-wt/th-projects/th-seed`, an HTML project with `index.html` (6,800 px, 1440 wide, with a footer) and `long.html` (9,000 px). Driven with playwright-core (`ds-wt/th-drive.mjs`).

| Check | Result |
|---|---|
| Frame menu, Arrange, Resize to fit on the 6,800 px page | Passes: 6,800 px, no warning, the footer shows (`fit-f2-light.png`) |
| Resize to fit on the 9,000 px page | Passes: 8,000 px with the new warning (`fit-f3-{dark,light}.png`) |
| Drag the bottom edge of a frame from 6,800 to 7,000 | Passes: 7,000 is saved |
| Drag past the cap (to 8,500) | Passes: the frame stops at 8,000 |
| Restart the server and open the project again | Passes: the heights 6,800, 8,000 and 7,500 stay |
| `canvas_place` height 8,001, width 4,001 | Passes: refused with "between 200 and 8000" and "between 200 and 4000" |
| MCP `get_screenshot` on the 6,800 and 8,000 px frames | Passes after the shot fix: 1440 x 6800 and 1440 x 8000 PNGs (`mcp-get-screenshot.txt`). Before the fix: 1440 x 6000 and "the shot stops at 6000 px" |
| Canvas stills of the 7,500 px frames | Passes after the shot fix: same scale as the live frames |
| Dark and light screenshots | `tall-frames-{dark,light}.png` |

## Headless

No new action. `pnpm exec tsx scripts/call-action.ts canvas.createFrame '{"projectId":...,"path":"index.html","width":1440,"height":7000,"label":"Tall"}' --port 7480`: http, mcp and agent each placed a 1440 x 7000 frame (`call-create-frame.txt`). The only diffs are `frames`, `id` and `x`, because the script has no reset between surfaces (pick 1 fixes this). The chat agent uses the same actions (agent surface above). `set_frame_heights_canvas` over HTTP gives the same fit result (`fit-api.txt`).

## Cost

3 frames of 1440 x 7,500 against 3 frames of 1440 x 4,000. The page was on the canvas at 10% zoom, in headless Chrome, with 3 alternating runs each (`perf.txt`).

| Measure | 4,000 px | 7,500 px |
|---|---|---|
| Browser RSS (all processes) | 910 to 916 MB | 912 to 914 MB |
| Main page JS heap | 10.2 to 10.3 MB | 10.2 to 10.3 MB |
| Frame time while panning (avg, p95) | 16.7 to 16.9 ms, 16.7 to 16.8 ms | 16.7 ms, 16.7 to 16.8 ms |
| Frame page load (loadEventEnd) | 9 to 14 ms | 10 to 14 ms |

The difference is in the noise, well under the 2x stop line. Limits: this is a simple page in headless Chrome at 10% zoom. A heavy page at 100% zoom was not measured.

## Gates

- `pnpm run typecheck`: 0 errors.
- `pnpm run lint:gate`: passes, 59,623 diagnostics. That is the same count as on main (baseline 89,733).
- `pnpm run build:ui`: passes. `check-bundle`: B1 274,703 B, delta 0.
- `gen-routes.ts --check`: passes.
- `check-actions.ts --probes`: 560 hits (baseline 410), the same as on main. The ops check has 383 ops and 10 warnings, also the same as on main. This branch adds no hit.

## Snapshot

I did not edit `artifacts/mcp-snapshots/canvas.json`. `mcp-snapshot.ts canvas --check` fails, but most of its differences were there before this branch (for example `canvas_list`, `keep_links`, and the id `pattern` text). This branch adds 2 diffs, both from the live `tools/list`:
- `add_frame` `properties.height.maximum`: 4000 -> 8000.
- `canvas_place` `properties.frames.items.properties.height.maximum`: 4000 -> 8000.

The width lines stay 4000. Tyler decides the refresh.

## Left out

- **Export.** `EXPORT_FRAME_MAX_SIDE` stays 4,000, as the spec says (runner-up 3).
- **Review.** `review_frame` still clamps the frame to 4,000 px tall (`ui/features/review/review-request.ts` `SIDE_MAX`, `actions/src/direct-edit/payload/schema.ts` `SIDE_MAX`). So the review checks only the top 4,000 px of a tall frame. Pick 3 owns the review files.
- **Other 4,000 caps (not changed).** `actions/src/viewport/schema.ts` (viewport matrix widths), `ui/features/review/rules-editor.tsx`, `server/agent/reference-check.ts`.
- **`get_screenshot` `fullPage` text.** The tool still says "up to 6000 px". A frame shot now goes to the frame height, up to 8,000. I did not change the description, because it is in `mcp-read.json`.
- **Appendix A.** `.claude/goal/` is missing in the worktree, so I added no `roadmap.md` entry.

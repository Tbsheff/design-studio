# Cycle 18 pick 5: cycle-polish

Branch `feat/cycle-polish`. Closes 5 of the 6 cycle-17 open items. No new action.

## What changed

1. **Route chip Compare** selects the route copy frame and the latest `<page>-app*` frame through the frame selection (`setSelectedIds`) and zooms to both. It no longer makes the copy frame active. New `canvas/frame-zoom-store.ts` (request) and `canvas/use-frame-zoom.ts` (stage subscriber). `pan-zoom-actions.ts` now exports `zoomToBox`, and `pan-zoom-api.ts` and `use-pan-zoom.ts` expose it. `use-canvas-stage.ts` calls `useFrameZoom`. `frame-label-extras.tsx` passes `frameId` to the chip.
2. **Undo label**: `server/canvas/layout-history.ts` does not count a frame whose only change is `order`. Removing 3 frames reads "Remove 3 frames".
3. **Toast closes on Cmd+Z**: new `canvas/use-undo-dismiss.ts`, used by `frame-undo-bar.tsx`. It handles keydown, the preview history event and the desktop menu command. It ignores text fields and redo.
4. **Copy style carries text wrap**: `engine/groups.ts` maps the `text-wrap` class group and the `text-wrap` CSS property to the `text` group.
5. **Auto layout on a hug side**: `layer-layout-probe.ts` sets `width: auto` and then `height: auto` on the parent, measures it, and restores it. When the size does not change, that side is a hug side. `layer-layout-padding.ts` `toFitPadding` then uses the parent's CSS padding for that side, not the old space. `layer-layout-run.ts` passes the probe result through.
6. **Agent set**: `inspect_source_page` and `import_source_page` moved from `app` to `tweak`. No app-run prompt, test or legacy list names them.

## Checked

- UI (playwright, mock agent, fake Next app route prototype). At 40% zoom, Compare selects 2 frames ("2 frames"), and the zoom goes to 15% to fit both. Screenshots: `cycle-polish/chip-menu-{dark,light}.png`, `compare-{dark,light}.png`.
- UI: removing 3 selected frames shows "3 frames removed. Undo". Cmd+Z closes the toast and shows "Undid remove 3 frames". Screenshots: `undo-row-{dark,light}.png`, `after-undo-{dark,light}.png`.
- `call-action.ts layer-style.apply` on a Tailwind page (`@tailwindcss/browser`): the target gets `text-pretty`. It passes on all 3 surfaces. The diffs are expected: the first surface changes the target, and the next two report "Already has this style." (`call-action-layer-style-apply.txt`, `call-action-layer-style-get.txt`).
- `call-action.ts layer-style.set` (auto layout, padding auto) on a full-width `relative p-6 h-64` parent with 2 absolute children gives `px-6 pt-6 pb-48`. Before this change, the right padding came from about 970px of empty space. The fixed `h-64` still gives the bottom padding from the space. Surfaces 2 and 3 run again on the flex parent, so their outputs differ (`call-action-layer-style-set.txt`).
- `studioToolsFor`: an html project (route prototype) has `inspect_source_page` and `import_source_page`. An app project does not.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59661 against 89733) and `pnpm run build:ui` pass.

## Left out

- **"App now" label**: the import writes the frame label from the page title in `src/server/share/page-import/import-page.ts` (line 324). The spec says to skip it in that case. A UI-only label would need a second canvas write, which makes a second undo step.
- **Run log**: the mock agent does not write the tool list to the run log, so fix 6 was checked with `studioToolsFor`, not with a run log. No real-model run.
- **Files outside the ownership table**: `frame-label-extras.tsx`, `use-canvas-stage.ts`, `pan-zoom-actions.ts`, `pan-zoom-api.ts`, `use-pan-zoom.ts`, `layer-layout-probe.ts`, `layer-layout-run.ts`. New files: `frame-zoom-store.ts`, `use-frame-zoom.ts`, `use-undo-dismiss.ts`.
- No Bonaparte check. The Tailwind browser build runs the same class engine.

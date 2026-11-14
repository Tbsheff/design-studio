# Cycle 33, pick 5: polish-33

Branch `feat/polish-33`.

## What works

- **Layers multi-select.** Every selected layer row has the selected style and `aria-selected`. The scroll target, `aria-activedescendant` and arrow keys still use the last selected row. A right-click on any selected row keeps the selection.
  - The bridge sends a node id for each element in `select-many` (`nodes`, which replaces `node`). The canvas keeps a selector to node id map, and Layers shows the ids of the current selection only. So Esc, delete or a frame switch clears the rows.
- **`serverReady` in `app.start`.** The preload reads the boot marks from the main process with a sync IPC call (`studio:boot`) on each page load. The argv marks are the fallback. `app.start` ms does not change.
- **Resize keys on the scale.** No code change. On a class-less Tailwind card, `Mod+Right` already writes `w-60` at 240 px, because the server maps 240 px to the spacing scale. See `cycle-33/polish-33/size-keys-evidence.txt`.

## Checks in the running app

Server on port 6330 (mock agent, `STUDIO_DATA_DIR=ds-wt/polish-33-data`), fake app `ds-wt/p33-next` attached:
- Passes: in Layers, click One, then Shift+click Two and Three: 3 rows highlighted, "3 elements".
- Passes: canvas Shift+click adds a row: 3 rows highlighted.
- Passes: `Mod+A` (select-many) on Two: 4 rows highlighted, "4 elements".
- Passes: 236 px card, `Mod+Right` 4 times: `w-60`, not `w-[240px]`.
- Passes: desktop dev run (`electron-dev.ts`, own user data and data folder, ports 6340/6341). The early window was made at 619 ms, and `telemetry.jsonl` `app.start` detail has `serverReady: 4450`. A packed app was not built.
- Screenshots: `cycle-33/polish-33/layers-multi-{dark,light}.png`.

No new action or tool, so there is no `call-action.ts` or MCP check.

Gates, once at the end: `pnpm run typecheck` passes, `pnpm run lint:gate` passes (59608 diagnostics, baseline 89733), `pnpm run build:ui` passes.

## Files outside the pick's list

- `packages/common/contracts/src/contracts.ts`: `select-many` `node?: number` became `nodes?: number[]` (same line count; the file cannot grow).
- `src/bridge/outgoing.ts`: sends `nodes`.
- `src/ui/features/canvas/{canvas-layers.tsx,preview-frames-select.ts,preview-frames-types.ts,preview-selection-model.ts,use-preview-frames.ts}`: the node map.
- `src/ui/features/versions-layers-tokens/{layers-panel.tsx,layers-rows.tsx,use-pending-select.ts,use-row-menu.ts}`: the selected set.
- `desktop/preload.cts`: reads the live marks.

## Left out

- `size-keys-model.ts` is not changed: the bug did not reproduce. A layer with an arbitrary class on the scale (`w-[240px]`) still counts as a scale class, so `Mod+Right` goes to `w-64`.
- No packed-app first launch; the dev Electron run uses the same early-window path.

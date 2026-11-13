# Cycle 19 pick 5: layout-versions

Branch `feat/layout-versions`. A canvas-only change now makes a "Layout" version.

## What changed

- Added the `layout` version kind: `VersionKind` in `contracts.ts`, `VersionMetaSchema` in `actions/version/schema.ts`. `isOutsideEdit` counts a layout version as an outside edit, so an open edit session can still end (save or discard) after one.
- Added `src/server/store/layout-version-queue.ts` (`createLayoutVersionQueue`). Each layout note re-arms a 10 s timer per project and keeps the layout-history labels. When the timer ends, it commits only `.studio/canvas.json` and `.studio/links.json` with `kind: "layout"` and the title "Layout: <labels>", for example "Layout: Move 2 frames, move frame Pricing".
  - If a run is in progress, it saves nothing: the run version takes the layout.
  - If a run or a manual edit already saved the layout, the commit tree equals HEAD and no version is made.
- Added `src/server/http/app-layout-versions.ts`, which connects the queue to `canvas.onLayoutChange`. The sources are `user`, `agent` and `restore` (Cmd+Z of a layout step). So every canvas write counts: UI, HTTP, MCP and agent tools, not only `CanvasWriter`. Labels come from `layoutLabel` (now exported from `canvas/index.ts`). `layout-history.ts` itself did not change.
- Restore and undo now put back the layout that the target version stores. `resetForRestore` reads the target blob of each layout file through `toStoredLayout`. When the target has no stored file, it keeps the live one. The layout read and write helpers moved to `src/server/store/version-layout.ts`, so `versions.ts` got shorter (L2a).
- Versions panel: `layout` kind with the `frame` icon, the label "Layout" and a hint (`version-labels.ts`).

## Proof (mock agent, port 4871, data in `ds-wt/layout-versions-data`)

- `canvas.createFrame`, then `canvas.moveFrames` (grid), then align top: after 10 s, `version.list` showed one new entry, `kind: "layout"`, "Layout: Move 2 frames, move frame Pricing". There was no version before the timer ended.
- `version.restore` to the version before it: the frames in `canvas.json` were equal to the copy saved before the move.
- Moved frames, then `run.start` within 10 s: one version (the run's, with `.studio/canvas.json` in its changed files) and no extra Layout entry.
- MCP `list_versions` lists the layout versions with `kind: "layout"`. The tool schema did not change, so there is no snapshot diff.
- The test project is an imported-folder HTML project (`imported.created: true`, external work tree). That is the import-versions path.
- Edit path (P3): `canvas.moveFrames` answered in 4 to 7 ms over HTTP. The note is a synchronous map write and a timer, and the commit runs later off the request.
- UI: the Versions panel showed the new entry live with the frame icon. Screenshots: `cycle-19/layout-versions/versions-panel-dark.jpg` and `versions-panel-light.jpg`.
- `pnpm run typecheck` passed, `pnpm run lint:gate` passed (59646, baseline 89733), and `pnpm run build:ui` passed.

## Left out

- There is no save on project close. The queue has `flushAll`, but the server has no project-close hook, and `app-context.ts` cannot grow (L2a). A pending layout change is lost if the server quits in the 10 s window. The next version of any kind still includes it.
- Did not use an Effect `LayoutVersionQueue` service in the canvas live layer. `CanvasWriter` misses layout writes from MCP, agent and Cmd+Z paths. `canvas.onLayoutChange` catches all of them, but it is Promise code. Because of this, `handlers/canvas/live.ts` did not change.
- App (attached app) projects are skipped, because `layoutFilesOf` does not version their layout.
- A layout version takes the call origin of the last note (for example "agent" or "mcp"), so its author can show as the agent.
- The timing check has no number without the queue to compare against.
- `contracts.ts` grew by 1 line (the union member).

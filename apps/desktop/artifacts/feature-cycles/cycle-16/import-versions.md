# Cycle 16 pick 1: imported folders save versions

Branch `feat/import-versions`. Fix commit `6c4f465f1`.

## Cause

The exclude file of an imported folder had `.studio/`. Git cannot re-include a file under an excluded folder, so `!.studio/canvas.json` had no effect. The next version after a canvas change failed with "paths are ignored by one of your .gitignore files". A `.studio/` line in the folder's own `.gitignore` or `.git/info/exclude` broke it the same way.

## Changes

- `store/version-external.ts`: `EXTERNAL_EXCLUDES` and `APP_STUDIO_EXCLUDES`. `toStudioExcludes` adds `.studio/` only for an attached app. `toRepoExcludeLines` drops `.studio`, `.studio/`, `/.studio/`, `.studio/*` and `.studio/**` from the copied repo excludes of a non-app folder.
- `store/version-store-upkeep.ts`: `toExternalExcludes` uses `toRepoExcludeLines`.
- `store/version-index-paths.ts`: `updateLayoutPaths` stages layout files with `add -f`; `updateSplitPaths` sends layout files there and every other path through `add -A`.
- `store/versions.ts`: `writeBaseExclude` uses `toStudioExcludes`; `commitPaths` uses `updateSplitPaths`; `commit` force-stages layout files after `fullStage`.

No new action and no UI change.

## Checks (dev server, port 4793, mock agent)

- Before the fix: imported plain folder, frames placed, text edit: "could not save ... as a version", no new version.
- After the fix, plain folder: version lists `.studio/canvas.json` and the 3 pages.
- Git repo folder with `.studio/` in `.gitignore` and `.git/info/exclude`: 2 versions, both list `.studio/canvas.json`.
- Old broken project (made on pre-fix code): after restart, the next edit saves and lists `.studio/canvas.json`. Self-heal works.
- Attached Next app: exclude still has `.studio/`; the first version has no `.studio` file.
- MCP: `canvas_place`, then `update_text`, then `list_versions` shows the new version with `.studio/canvas.json`.
- `call-action canvas.updateFrame`: pass, 3 surfaces, 0 diffs. `call-action text.update`: the http call saved a version; mcp and agent found no hits after it (expected diff). `call-action version.list` (http only, mcp and agent off): lists `.studio/canvas.json`.
- UI: frame dragged on the canvas, text edit, Versions panel shows the new head version: `cycle-16/import-versions/versions-{dark,light}.png`.
- Gates: `pnpm run typecheck` pass, `pnpm run lint:gate` pass (59683, baseline 89733), `pnpm run build:ui` pass.

## Left out

- A canvas move alone does not make a version, for any project. The layout goes in with the next file version. The spec line "a new version for each" frame move is not today's behaviour; this pick did not change it.
- Undo (restore) keeps the live layout by design (`resetForRestore`), so it does not move a frame back. Canvas Cmd+Z is the UI undo. Not checked.
- Canvas changes lost before the fix stay lost.
- `typecheck:tsrs` and `check:scripts` not run.

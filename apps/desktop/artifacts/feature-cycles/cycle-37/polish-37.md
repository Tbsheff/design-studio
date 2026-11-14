# Cycle 37 pick 5: polish-37

Branch `feat/polish-37`. The flow update note names every route, Home preloads 19,919 B less, and Edit > Undo keeps typed text in a text edit.

## What changed

- **Route note.** New `agent/port-route-notes.ts` splits the prompt at each `<route-update file="` block and reads each block with the existing `toRouteFileNow`. It sums the data reads of all blocks and writes one note: "Updated app/visits/page.tsx, app/visits/[id]/page.tsx and app/visits/[id]/edit/page.tsx (kept 5 data reads)." A single page note does not change. A short block (route 4 and later, no file text) is named with no read count.
  - The note code (`toReadsText`, `toFolderFilesBefore`, `toFileReads`, `toFileList`, `toRouteUpdateNotes`) moved from `port-route-update.ts` to the new file. The data-read scan stays in place. `port-route-update.ts` now exports `FOLDER_TAG`, `getText` and `toDataReads`, and has 402 lines.
  - `run-notes.ts` and `mock-port.ts`: import lines only.
  - `port-flow-update.ts` has no block parse to export (it only builds blocks), so it is not changed.
- **Home cut.** Measured with the `.vite/modules.json` that the build already writes (bytes per module per chunk), not a source map.
  - `platform/query.ts` imports `./stream` with `import()` when the first action.done listener subscribes. Home no longer preloads `_stream` (10,122 B).
  - `tipWithKey` moved to new `platform/key-tip.ts`, and the platform check moved to new `platform/mac.ts`. `commands/keys.ts` keeps `IS_MAC`. `shared/keymap.ts` builds its id map on the first `binding()` call (the top-level `new Map(KEYMAP.map(...))` was a side effect that pulled the chunk). Home no longer preloads `_keymap` (9,992 B).
- **Mod+Z and the Edit menu.**
  - `history-key` has a new `isNotice` field. `bridge/history-key.ts` `noteHistoryKeys` posts a notice for every Mod+Z keydown in a frame, before the text edit handler runs. `preview-key-forward.ts` calls `noteHandledShortcut`, so `dispatchDesktopCommand` drops a menu echo of that key (case A guard).
  - New UI-to-frame message `text-undo`. A menu Undo or Redo with focus in a preview frame posts it (`use-frame-text-undo.ts`). The frame runs the text edit Mod+Z logic (text undo, or a history key for range mode or unchanged text), or `execCommand` in a field, or answers with a history key. The answer is marked so the menu echo check does not drop it (case B).
  - `app/shell/use-desktop-app.ts`: the app-level handler returned `true` for every undo and redo. After a cold start into a project (Studio effects run before the shell effect), it took the command first, so Edit > Undo did nothing. It now returns `false` when it does not edit text.

## Checked

- **Packed app** (`desktop:pack`, own `--user-data-dir` and data folder, port 4170; the installed app was not touched). The Mac screen was locked, so OS key events (`osascript` keystroke) did not reach any app. I clicked Edit > Undo and Edit > Redo with Accessibility (`click menu item`), which is the mouse path.
  - Before the fix: a plain edit with typed "x", Edit > Undo ran a history step ("Undo: Sample edit: new headline") and lost the "x".
  - After the fix: Edit > Undo removed the "x", the edit stayed open, no new version. Edit > Undo again: one history step ("Undo: Edit text of p"). Range mode: Mod+B on a range, then Edit > Undo: "Undo: Apply bold to text", the edit stays open.
  - Edit > Redo after the text undo runs the history redo, as Mod+Shift+Z does (cycle 36 "Left out").
  - Keyboard Mod+Z (CDP key events) in an edit with typed text: text undo, no version change.
  - Not proven: the OS keyboard path through the macOS menu (screen locked). With the notice, a menu echo after a frame keydown is dropped in both cases A and B.
- **Mock flow port** on `ds-wt/p37-next` (a clone of the flow-fast fixture, own data folder `p37-flow-data`): 3 route-update blocks, 3 port checks, and the note names 3 files.
- **Cold Home** in a fresh data folder: Home paints (about 50 ms), `stream` loads after paint, a project created over HTTP shows on Home with no reload (action.done refresh), the sample opens, and a share link opens in the viewer. Tooltips show keys ("Prototype link  L"). No page errors.
- **Bundle:** B1 274,703 B (was 294,622 B, margin 25,297 B under 300,000 B). Chunks (31): main, preload-helper, react, desktop, use-latest, focus, find-element, live-store, telemetry, api-telemetry, api-core, http, json-guard, query, pick, storage, ui-select-model, pick, router, index, global-commands, command-disabled, copy, app-events, project-nav, screen-preload, registry, keys, api-error, prototype-dialog, typing-target. `scripts/perf/baseline.json` is not changed (P10).
- `pnpm run typecheck`, `pnpm run lint:gate` (59,619, baseline 89,733), `pnpm run build:ui`, `check-bundle` and `gen-routes --check` pass. `git merge-tree` with `feat/range-nest`, `feat/port-kit`, `feat/dark-check` and `feat/flow-fast`: clean.
- No action, tool or route changed, so there is no `call-action.ts` run. The note text is the same on every surface.
- Screenshots: `cycle-37/polish-37/{home,run-note}-{dark,light}.png`.

## Files outside the spec list

No other pick owns these:
- `bridge/bridge.ts` (one line), `bridge/message-handlers.ts` (the `text-undo` handler), `bridge/text-edit.ts` (the `isNotice: false` field on line 369 only).
- `ui/features/canvas/{use-undo-shortcut.ts,use-preview-frames.ts}` and new `use-frame-text-undo.ts`.
- `ui/features/text-range/use-text-range-resume.ts` (a notice does not arm the resume).
- `ui/app/shell/use-desktop-app.ts`.
- Home cut callers of `tipWithKey`: `ui/app/studio/studio-column.tsx`, `ui/app/shell/{project-list-toggle,panel-rail-button}.tsx`, `ui/features/versions-layers-tokens/layers-panel.tsx`, `ui/features/home/project-rail.tsx`, `ui/canvas-toolbar-slots.ts` (import source only).
- `agent/port-route-update.ts` is a pick 4 file: the note code moved out and 3 exports were added. The top half, which pick 4 changes, is not touched.

## Left out

- OS keyboard Mod+Z through the packed menu: not run (screen locked).
- `.claude/goal/roadmap.md` is still missing in the worktree, so no Appendix A entry.

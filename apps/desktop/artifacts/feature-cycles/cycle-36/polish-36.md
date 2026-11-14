# Cycle 36 pick 5: polish-36

Branch `feat/polish-36`, cut from main `79d75cc9f`.

## What changed

- **One undo for a port run.**
  - `applyRunFollowUp` (`http/run-follow-up.ts`) takes `editHistory.mark()` when the run starts. At the end of a `task: "port"` run, `applyPortRunHistory` (`direct-edit/commit/run-record.ts`) diffs the head at run start (`direction.headVersionId`) against the run version.
  - The changed files are the union of `changedFiles` along the parent chain from the run version back to the start head (max 500 steps). If the chain breaks or a version has a cut file list, the history is cleared, as before.
  - Before it records the run entry, it calls the new `history.dropSince(projectId, directionId, mark)`: the entries recorded on that direction during the run (the `apply_port` edits) go. The stack holds one entry for the run. Redo applies the whole run again.
  - `runChanges` now runs through a shared `toSpanChanges` that takes a base version id. Other run tasks, restore and session-end keep the old record (base = parent).
  - `MAX_RUN_FILES` (50) and `MAX_RUN_BYTES` (4 MB) stay.
- **"View canvas" on a phone.** In full bleed (phone share Play), the same button now sits at the right end of the play bar (the 44 px bar the phone sees), not as a pill at the page bottom. The play bar Exit button (same action, and it was cut off at 390 px) is hidden there, and the bar keeps room on the right. Desktop share keeps the bottom pill.

## Spec change

The spec said "in the share head next to Play and comments". In phone Play the play layer (`.present-layer`, fixed, z 200) covers the share head, so a button there is not visible or tappable (checked: Playwright tap was blocked by `.play-title`). The bar the user sees is the play bar, so the button goes there. This needs no edit in `features/canvas/**`.

## Checked (mock driver, no real model)

Fake app `ds-wt/p36-next` (git repo; `node_modules/.bin/next` is a small fake dev server that renders `app/<route>/page.tsx` and adds `data-studio-loc`, so `apply_port` can write). Prototype `ds-wt/p36-proto/index.html` with `[port-apply] [port-low]`, so the mock writes the route, runs `apply_port` (version "Edit h1: margin-top, ..."), then the fix loop writes the route again.

- Port run `/crew3`: versions `Port to app` <- `Edit h1 ...` (apply_port) <- previous head. `edit_history` lists one entry for the run. One HTTP undo: `app/crew3/page.tsx` is gone, `git status` equals the start. Redo: the file is back.
- `scripts/call-action.ts version.restoreHistory` with 3 port runs on the stack: http, mcp and agent each ran ok and each undid one whole run (crew3, crew2, crew); after it `git status` is clean. `version.applyHistory`: all 3 runs back. The tool reports "fail, 2 diffs" only because each surface steps the same stack once, so each output names a different run (`call-undo.txt`, `call-redo.txt`).
- Studio UI, run `/crew5` with apply_port in the middle: one Cmd+Z removes `app/crew5/page.tsx` (`studio-light-undo.png`, head "Undo: Port to app" above "Edit h1"), Cmd+Shift+Z brings it back (`studio-dark-redo.png`).
- A non-port edit run on the prototype records one entry, as before.
- Share link of a 3-page flow at 390 x 844 (touch): "View canvas" at the bar's right end (x 261, y 6, 121 x 32), the page fills 390 x 800 below the bar and its bottom is free; a tap opens the canvas (`phone-{light,dark}-0.png`, `-1.png`). At 1440 x 900 Play the pill is at the bottom center as before (`desktop-play-{light,dark}-0.png`).
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass (59623, baseline 89733). `pnpm run build:ui`: pass.
- No action changed, so `gen-routes` output does not change.

## Files outside the owned list

- `apps/desktop/src/server/events/direct-edit-ports.ts`: one line, `dropSince` on the `EditHistory` interface. No pick owns it.
- `apps/desktop/src/server/direct-edit/commit/index.ts`: export line for `applyPortRunHistory`.

## Left out

- `history.ts` is 484 lines (under 500). `dropSince` lives in it because it needs the closure's sequence map.
- Undo of a created route file leaves an empty folder (`app/crew3/`). This is the old history behaviour for created files.
- The in-memory history is lost on a server restart, as before.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.

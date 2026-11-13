# Journeys C 16-19 rerun (branch fix/journeys-c-16-19)

Setup: built UI, `STUDIO_AGENT=mock`, `STUDIO_MCP=on`, raw JSON-RPC MCP client with the token from `<data>/mcp.json`. HTML projects. Base numbers come from a `main` worktree at `1dd723485`, run with the same harness and ports.

| Fix | Result | Numbers |
|---|---|---|
| 1. File lock in every write path | Passes | 11 of 11 MCP writes to a locked `index.html` refused with `structuredContent._tag: "Forbidden"` and the text "This file is locked. Unlock it in Code to let Claude change it."; file hash unchanged after each. A person direct-edit on the same file still saves (200, hash changed). |
| 2. Person text edit during MCP edits | Passes | Journey 17 (12 `edit_element` calls on another element while the person types): hand text kept 4 of 4 (base: 1 of 4). Same-element conflict (MCP edit lands while the person types): person text kept 3 of 3, notice "Claude changed this text while you typed. Your text is kept." shown 3 of 3. |
| 3. `git cat-file` per project | Passes | 20 projects opened in turn: cat-file children 20 (base) -> 4 (cap), 0 after 60 s idle. |
| 4. `edit_element` with the UI open | Better, not 6 ms | Lat harness (write, 3 edits, list_versions per cycle): p50 533 ms closed / 534 ms open (base) -> 301 / 296 ms. Journey 17 with UI open: p50 about 500 ms (base) -> 150-180 ms. |
| 5. Version author | Passes | Versions panel shows "You" and "Claude Code" (the MCP client name); `list_versions` returns `author: {kind, name}`. The "Studio agent" label for in-app agent runs was not checked in this rerun. |
| 6. Presence chip for `insert_jsx` | Passes | Chip "Claude Code is editing" shows for `insert_jsx` in dark and light. |

## Fix notes

- Lock: one guard in `src/server/platform/path-lock/write-guard.ts`, called before every MCP and agent write (direct-edit writers, text edits, history undo and redo, hunk revert, tweaks, tokens, animation, image place, `write_file`, `batch_edit` files). A call with no MCP or agent origin is a person and passes. MCP results carry the tag in `structuredContent`.
- Text edit: three causes. (a) The frame swapped between the select click and the double click. The swap now waits 900 ms after a select and 2 s after a text commit. (b) The commit did not resend text that equaled the stale selection text. The text commit is now forced. (c) Outside optimistic DOM patches (`edit.planned`) wrote into the element under edit and mixed the texts. The bridge now skips a patch on the element under edit, marks the commit `isHeld`, and the canvas shows the notice.
- cat-file: `BatchReader` closes its child after 20 s with no reads, only when no read is in flight, and closes the least recent idle reader when more than 4 are live. Other per-project children: warm Chrome peek pages are already capped at 6 with a 3 min idle close.
- Latency: the cause was the warm peek page reload. `queued` was cleared when the reload started, so a second caller queued a second reload. Callers now join the running reload. The remaining time is one page reload for `describeElement`.

## Memory check (fix build)

10 min loop: 838 `edit_element` + `list_versions` calls across 20 projects (edit p50 463 ms, p95 1104 ms), then 3 min idle.

| Time | Processes | cat-file | Chrome | Server node RSS |
|---|---|---|---|---|
| 0 s | 22 | 0 | 19 | 512 MB |
| 300 s | 24 | 0 | 21 | 337 MB |
| 600 s | 22 | 0 | 19 | 311 MB |
| 661 s idle | 20 | 0 | 17 | 58 MB |
| 781 s idle | 20 | 0 | 17 | 243 MB |

No process or memory growth. Base after 20 projects: 45 processes (20 cat-file, 18 Chrome); fix: 28 (4 cat-file, 20 Chrome), 22 after 60 s.

## Checks

- `pnpm run typecheck`: 0 errors.
- `pnpm run lint:gate`: pass (59756, baseline 89733).
- `pnpm run build:ui`: pass. `pnpm run check:clip --quick --skip-build`: 0 clipped, 0 overlap.
- `call-action version.list` and `call-action direct-edit.apply`: pass (HTTP surface; MCP and agent bindings are off for these ids).

## Not done

- `edit_element` is not back to 6 ms with a warm page; one reload per edit stays.
- The in-app agent's write path was not exercised under a lock in this rerun.
- React (HMR) frames: the swap hold covers HTML frames; the HMR path was not tested.

Screenshots: `c-17-rerun.png`, `c-17-conflict-notice.png`, `c-19-versions-author-{dark,light}.png`, `c-19-insert-jsx-chip-dark.png`.

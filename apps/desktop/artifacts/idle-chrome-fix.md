# Idle Chrome and polish fixes (branch fix/idle-chrome)

Setup: server from `apps/desktop` (`tsx src/server/index.ts`, built UI), `STUDIO_AGENT=mock`, `STUDIO_MCP=on`, ports 4810/4811, data in `ds-wt/idle-chrome-data`. MCP: raw JSON-RPC client. Load: 6 HTML projects, each with an infinite CSS animation, a 50 ms `setInterval` and a rAF loop, then `get_screenshot` and `edit_element` on each. CPU: per-PID `ps -o time` deltas over 60 s on the server Chrome processes alive at both ends.

| Item | Result | Evidence |
|---|---|---|
| 1. Idle Chrome CPU | Fixed | Before: 13.08 CPU-s/min for 3 min after the last call (6 warm peek pages), 0.03 after the 3 min close. After: pages close after 30 s; 45 s after the load, 0.03 CPU-s/min; at 3 min, 0.02. |
| 2. Orphan Chrome | Fixed | `render-chrome.json` in the data dir holds the pid and an owner switch. Test: SIGSTOP the Chrome, `kill -9` the server, Chrome left with ppid 1. Restart logged "stopped a headless Chrome left by an earlier run", and the pid was gone. On exit, the owned process group gets SIGKILL. |
| 3. Memory in the edit loop | Skipped, no leak found | Heap snapshots before and after 400 `edit_element` + `list_versions` cycles over 33 projects: JS heap 192.2 to 198.4 MB (+6 MB). The growth is JIT code and strings, with no cache or listener class that grows. RSS after the loop was 495 MB. The 428 to 601 MB in the rerun is V8 heap headroom, not retained objects. |
| 4. Connect AI text | Fixed | The note now says Claude Code can start, read and stop runs with `start_run`, `get_run` and `stop_run`. Seen in the dialog. |
| 5. MCP client name | Fixed | The `initialize` clientInfo name now wins over the key name. The chat shows "Codex" and "Cursor Composer Agent". `list_versions` author: `{kind: "mcp", name: "Cursor Composer Agent"}`. |
| 6. Versions time cut off | Fixed | The time no longer shrinks. The kind, level badge, author and file count shrink first. All 6 rows show the whole time in a 240 px panel. `idle-chrome-fix/versions-{dark,light}.png`. |
| 7. `get_run` status | Fixed | Top level `status: "completed"` and `summary.status: "completed"`. |
| 8. Restore last project | Fixed | A fresh load of `/` goes to `/p/<last id>`. Going Home in the app still clears it. A deleted project id falls through to the Studio not-found path; this was not tested. |
| 9. Presence chip hold | Fixed | Chip shown at 2, 10, 20 and 28 s after one `edit_element`, gone at 35 s. `idle-chrome-fix/presence-chip-10s-dark.png`. |
| 10. Tooltip after Escape | Fixed | Connect AI, Enter, Escape: focus goes back to the button, and no tip shows. Tab moves focus and shows the next tip as before. `idle-chrome-fix/connect-ai-after-escape-dark.png`. |

## Notes

- Freezing did not work. `Page.setWebLifecycleState frozen` does nothing on a visible headless page (timers kept running). Disabling scripts and pausing animations cut CPU only to 3.7 CPU-s/min. The idle close is the fix that worked: 30 s, with a sweep every 10 s. The cost: an edit after more than 30 s with no calls reloads the page (about 1.2 s).
- Item 2 is the playwright backend only. The Electron backend and the other launchers (`flow-browser`, `page-import`, `design-system/extract`) are not changed. With SIGTERM or `kill -9` alone, Chrome already exited (pipe close). The record is a backstop for a Chrome that misses that.

## Checks

- `pnpm run typecheck`: 0 errors.
- `pnpm run lint:gate`: pass, 59671 diagnostics (baseline 89733).
- `pnpm run build:ui`: pass.

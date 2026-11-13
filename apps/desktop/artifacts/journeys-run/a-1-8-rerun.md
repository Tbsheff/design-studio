# Journeys 1, 2, 3, 7 and 8, rerun B (UI and MCP)

Date: 2026-11-13. Branch `fix/journeys-a-1-8`, `dist/ui` built from it.
Server: `STUDIO_AGENT=mock`, `STUDIO_MCP=on`, `STUDIO_MCP_EDITS=on`, port 4960, MCP on 4590, data in `/tmp/rerun-a18` (deleted after the run).
App: a fake Next app in `/tmp/rerun-a18-app`, listed in `STUDIO_MCP_TRUSTED_FOLDERS`. Bonaparte was not used.
UI: playwright-core, Chrome channel, headless, 1440x900, flows in dark. MCP: raw JSON-RPC with the token from `<data>/mcp.json`. 293 tools (290 before, plus `start_run`, `get_run`, `stop_run`).
The machine was under heavy load (load average near 440), so times are high.

## Summary

| Journey | UI | MCP |
|---|---|---|
| 1. First prompt to a design | Pass | Pass |
| 2. Three drafts at once | Pass | Pass |
| 3. Iterate with chat | Pass | Pass |
| 7. Edit the app (copy) | Pass | Pass |
| 8. Move a prototype into the app | Pass (target select) | Partial: plan only, no tool writes the route |

## Fixes checked

| Fix | Result |
|---|---|
| MCP `start_run`, `get_run`, `stop_run` | Pass. `start_variation` count 1 passes. The server text names the 3 tools that start the agent. |
| Home reopens the last workspace, default Prototypes, Edit app confirm | Pass. The confirm names `/private/tmp/rerun-a18-app` once, then not again. |
| Draft X and Keep undo | Pass in UI (toast Undo and Cmd+Z) and MCP (`undo` after keep reopens the drafts, the kept page keeps its head version). |
| Move to app target select | Pass. Target app shows the app 537 ms after the dialog opens. |
| Undo after the first app run | Pass. The first run is its own version on an "Imported" baseline; Undo is enabled and restores the file. |
| Trusted folders with no UI | Pass. `attach_app` on the trusted folder worked with no card and no window. `getSetup` lists `envTrustedFolders`. |
| Dark preview (J6) | Partial. Toggle on sets the `dark` class and `color-scheme: dark`; off keeps the page scheme. The toggle is in Cmd+K ("Preview dark mode") but the canvas view row that holds its switch opens only for an old version. |

## Journey 1

UI: Home opened on Prototypes. Editor in 134 ms, no questions step, run end about 0.7 s, chat "233ms · Details", Home card has a thumbnail. After a pick of the app workspace and a reload, Home reopened on it.

| MCP step | Result | Time |
|---|---|---|
| `create_project` | Pass, returns `projectId` and `directionId` | 95 ms |
| `start_run` | Pass | 337 ms |
| `get_run` | Pass, `completed` | 12 ms |
| `get_screenshot` | Pass | 680 ms |
| `start_variation` count 1 | Pass, 1 variation | 85 ms |

## Journey 2

UI: 3 drafts 620 ms after send. X on selected B removed B (not its neighbour); "Frame removed. Undo" brought it back in 353 ms; Meta+Z also works. "Keep this one" on A removed B and C with a toast with Undo; Meta+Z brought them back in 739 ms.

| MCP step | Result | Time |
|---|---|---|
| `start_variation` count 3 | Pass | 128 ms |
| `keep_page_variation` A | Pass, B and C discarded | 19 ms |
| `undo` on A | Pass: label "Keep page variation A", all 3 drafts `open` again, A's head version not changed; the next undo label is the run | 18 ms |

## Journey 3

UI: 2 runs (0.9 s, 1.2 s), Versions lists each, 2 Meta+Z gave 2 "Undo: …" versions and the file matched its hash before the runs.

| MCP step | Result | Time |
|---|---|---|
| `start_run` x2, `get_run` | Pass, both `completed` | 7 ms, 3 ms |
| `list_versions` | Pass | 3 ms |
| `run_suggestion` | Needs `directionId` and `runId` (the journey line now says so) | 1 ms |
| `undo` | Pass, undid the second run | 6 ms |

## Journey 7

UI: the first Edit app files toggle opened a confirm with the folder path; the second did not. The run edited `src/App.tsx` in 243 ms; Undo was enabled and put the file back.

| MCP step | Result | Time |
|---|---|---|
| `attach_app` on the trusted copy, no UI open | Pass, no approval card | 274 ms |
| `start_run` + `get_run` | Pass, own version on top of the baseline | 126 ms |
| `write_file` "No visit data" to "No visits yet" | Pass | 60 ms |
| `undo` | Pass, the file reads "No visit data" again; `canUndo` true with the run next | 14 ms |

## Journey 8

UI: Share, "Move to app…": Target app showed `rerun-a18-app` 537 ms after open. The port run was not started.

| MCP step | Result | Time |
|---|---|---|
| `get_port_plan` with `targetProjectId` | Pass, plan for `/team-caseload` in the Next app | 9 ms |
| Write the route | Gap: no MCP tool. Apply is the hand-written `POST /api/port/start` in `src/server/http/port-routes.ts`, which starts an agent run (mode `edit`, task `port`) with a prompt built from the plan. `start_run` with task `port` runs without those checks. A `port.start` action (`start_port`, `confirm: "user"`, with a preview) would close it. | - |

## New problems seen

- The dark preview switch has no visible control in the normal canvas (`toggleView` in `use-chrome-handlers.ts` is never called). Cmd+K has it.
- The Keep banner left edge is under the tool rail; "Keep this one" covers the next draft label.
- "Studio agent is editing Desktop 1440…" stays on after the run ends (also in run A).
- Enter does not send in the editor composer; only Cmd+Enter (also in run A).
- The install dialog and a Home line say "npm install".
- Undo versions read "Back to …" in the app project and "Undo: …" in prototypes.
- The J8 route file name is cut mid-word.

Shots: `b-j*-ui-*.png`.

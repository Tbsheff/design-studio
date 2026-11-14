# Real agent runs: cycles 13, 14, 20, 21

Date: 2026-11-13. Code: `main` at 04d73abcb. Agent: real Claude Agent SDK (`agent: sdk`), model `claude-sonnet-5-5`. No mock.

Setup: server from `apps/desktop` (`pnpm --config.verify-deps-before-run=false exec tsx src/server/index.ts`, built UI), `STUDIO_MCP=on`, `STUDIO_MCP_EDITS=on`, ports 5380/5381/5385, MCP 5392, data in `ds-wt/real-run-data`. MCP: raw JSON-RPC client (`ds-wt/rr/mcp.mjs`). UI: playwright-core, headless Chrome. Scripts and raw logs: `ds-wt/rr/`.

Auth: passed. The SDK used the local Claude Code sign-in. No key was asked for or typed.

## Result

| Check | Result | Key numbers |
|---|---|---|
| 0. Auth | Pass | run started in 12 ms, first model usage 3.5 s |
| 1. Live build | Pass, but misses the 5 s target | first draft html 9.3 s; html grew 316 B to 7090 B in 0.5 s steps; `isComplete: true` at 28.6 s |
| 2. Live edit | Pass | draft `kind: "edit"`, `html` is the full page (6722 to 7894 B), first content 14.2 s |
| 3. Decision chips | Pass | run 2 made `d1` "Card layout" (3 options); `set_decision_run` started run 3 in 12 ms; `picked` set; chip row shows in UI |
| 4. State queue | Pass | each run targets its own state frame; skip rule skipped Flag B after run 1 changed it |
| 5. Port check | Skipped | not cheap |

## Runs (6 of 6 budget)

| # | Run id | Project | What | Time | Cost |
|---|---|---|---|---|---|
| 1 | `Utr8aGFNymey0Edkhkw57` | `39UlxwGaSu` (HTML) | build bakery page | 67.6 s | $0.48 |
| 2 | `ijuMbgajnLpJRDEHg6u18` | `39UlxwGaSu` | restyle cards, record a decision | 58.7 s | $0.26 |
| 3 | `8_5kIGkNH_eX3pGo2JeO_` | `39UlxwGaSu` | follow-up from `set_decision_run` ("Use Stacked image cards for Card layout...") | 42.9 s | $0.25 |
| 4 | `hSnxunhDnQhPqNKk4ozjA` | `TbLZsOwJps` (fake app by url) | state "Empty data", frame f2 | 25.0 s | $0.43 |
| 5 | `QVgK20SuODUbovPBfOkFo` | `TbLZsOwJps` | state "Error", frame f3 | 33.0 s | $0.18 |
| 6 | `91BNtRTANZ60RejhQARYN` | `TbLZsOwJps` | state "Flag A", frame f2; Flag B skipped | 38.1 s | $0.18 |

Total: $1.78.

## Details

### 1. Live build

- `get_draft_run` at 0.7 s: `kind: "write"`, `bytes: 0`, `path: null`. At 9.3 s: 316 B of html. Then it grew every poll to 7090 B, `isComplete: true` at 28.6 s.
- Time to first content is 9.3 s, not under 5 s. Timeline from `run.started`: first model usage 3.5 s (context 95,978 tokens), TodoWrite 4.5 s, 2 Skill loads (`personal:make-interfaces-feel-better`, `personal:taste-use`) 5.0 s, thinking to 8.7 s, then the Write stream starts. The delay is the model preamble, not the draft feed.
- The first build runs with `mode: "edit"` in the request.

### 2. Live edit

- Run 2 drafts: `kind: "edit"`, `path: "index.html"`, `html` is the whole page with the edit applied (6722 B growing to 7894 B). `isComplete` flips per Edit call.
- UI: the draft layer showed "Editing index.html · 1 KB" with `data-landed="false"` for about 24 s.

### 3. Decision chips

- Run 2 called `create_decision_run` with `runId: "current"` at 9.1 s. `get_run` lists `{ id: "d1", topic: "Card layout", chosen: "Side image rows", options: [3], picked: null }`.
- `set_decision_run` (`option: "Stacked image cards"`) on the finished run returned `{ isSteer: false, runId: "8_5k..." }`. The follow-up ran and completed. `get_run` on run 2 then shows `picked: "Stacked image cards"`.
- UI: "Chose: Card layout Side image rows" chip row under run 2 (`run2-end-dark.png`).

### 4. State queue

- HTML projects cannot use frame states (`list_frame_states`: "frame states work only for attached app projects"). Used a fake app: a folder with a Next `package.json`, a node server on 7710 that serves `index.html` and 404s every `/api/*`, attached with `create_dev_server { folder, url }`.
- Board: `create_state_frames_canvas` with `["empty", "error"]` gave f2, f3 in section `s1`. Both `isSameAsDefault: true`.
- Sequence 1: `start_states_run` gave `states-s1` with 2 waiting items. Run 4 prompt "Design the Empty data state of /..." with `canvas.frameId: "f2"`. Run 5 "Design the Error state..." with `frameId: "f3"`. Gap between runs about 2 s.
- Sequence 2 (skip rule): pinned f2 and f3 to custom mock states "Flag A" and "Flag B" (`/api/flag` returns text). The page did not read `/api/flag`, so both looked like the default. Started the sequence. While run 6 (Flag A) ran, wrote `flag.js` that shows the flag text. After run 6: Flag B `skipped` at 42.5 s, with no run. Later `inspect_state_frames_canvas`: f3 similarity 0.943, `isSameAsDefault: false`.

## Bugs

1. **Change pill says "0 changes" after a CSS-only run.** Run 2 changed only `<style>` rules in `index.html` (git: +19 -9). The pill showed "0 changes", and `inspect_changes_version` (from `09d52f2`, to `fefde6c`) returned `items: []`. Steps: HTML project; run "Restyle the three product cards..." that edits only CSS; look at the stage pill, or call `inspect_changes_version` with the default `from`/`to`. Expected: rings on the elements that the changed rules match, or no pill. Screenshot: `run2-end-dark.png`.
2. **State run draft covers the default frame, not the state frame.** Run 4 targets `canvas.frameId: "f2"` ("Empty data /"). The draft layer ("Editing index.html · 1 KB", "Studio agent is editing Desktop 1440...") showed on f1, the default frame, and blanked it. Steps: attached app with a state board; `start_states_run`; look at the canvas during the run. Screenshot: `states-live-dark.png`.
3. **Edit draft shows a blank white page.** At the first poll with `data-landed="false"` in run 3, the frame was white under the "Editing index.html · 1 KB" bar, while `get_draft_run` had 7.8 KB of full html. Seen in run 3 and run 4. Not checked if it fills in later in the same edit. Screenshot: `run3-live-light.png`.
4. **Draft bar size is stuck at "1 KB".** The bar showed "1 KB" for every edit draft, while the page was 6.7 to 7.9 KB and edit drafts were 8 B to 846 B.
5. **Sequence line names a skipped state.** At the end of sequence 2 the board line showed "Designing Flag B (2 of 2)…" with Stop, while `get_states_run` gave Flag B `skipped` and no run id. It may be the 2 s gap between `done` and `skipped`. Screenshot: `states-end-dark.png`.
6. **Board labels go stale after a re-pin.** After `set_frame_state` pinned f2 and f3 to "Flag A" and "Flag B", `canvas_list` and the board still label them "Empty data /" and "Error /".
7. **Top-center banners overlap.** On the attached app, "This frame shows the home route. Pick the page..." overlaps the "1 change" pill and the "Studio agent is editing..." pill. Screenshots: `states-live-dark.png`, `states-end-dark.png`.
8. **Context fills fast.** Run 1 starts at 95,978 context tokens. After 3 short runs the chat shows "This chat uses 88% of the context window" (bakery project) and 83% (fake app). Each real run also loads 2 personal skills from the user's global setup.
9. **Minor: 404 on page load.** The UI calls `GET /api/projects/:id/runs/states/states-s1` before any sequence exists and gets 404.

## Screenshots

- `run2-end-dark.png`: decision chip row, "0 changes" pill, context warning.
- `run3-live-light.png`: blank edit draft during the follow-up run.
- `states-live-dark.png`: state run 1 of 2, draft over the default frame.
- `states-end-dark.png`: sequence line, designed error UI in both board frames, overlapping banners.

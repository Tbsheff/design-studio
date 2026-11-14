# Real agent runs 2: cycle 25 (draft-first, prototype-check, interaction-check)

Date: 2026-11-13. Code: `main` at 4840c7267. Agent: real Claude Agent SDK (`agent: sdk`), model `claude-sonnet-5-5`. No mock.

Setup: server from `apps/desktop` (`pnpm --config.verify-deps-before-run=false exec tsx src/server/index.ts`, UI rebuilt with `build:ui` at 4840c7267), `STUDIO_MCP=on`, `STUDIO_MCP_EDITS=on`, ports 5480/5481/5485, MCP 4590, data in `ds-wt/real-run-2-data`. MCP: raw JSON-RPC client with 0.5 s polls of `get_draft_run` and `get_run` (`ds-wt/rr2/watch.mjs`). UI: playwright-core, headless Chrome (`ds-wt/rr2/shots.mjs`). Raw run JSON and poll logs: `ds-wt/rr2/r1-*`, `ds-wt/rr2/r2-*`. Server stopped after the runs.

## Result

| Check | Result | Key numbers |
|---|---|---|
| 1. Time to first draft | Pass | first draft html at 3.5 s (target under 5 s; was 7.7 s); run total 86.9 s |
| 2. Studio final check | Pass, with 2 bugs | studio ran the mobile shot and review_frame; 4 medium findings on changed lines; 1 fix loop; but the "Studio check:" line is missing from the run log (bug 1) |
| 2b. Interaction findings | Pass | `[medium] interaction on a "Juniper & Steam" (index.html:58:27): no hover style`; fixed in the loop |
| 3. Context after 2 runs | Pass | 69,264 tokens; window 1,000,000 (6.9%); meter hidden (shows from 50%) |
| 4. UI | 4 bugs, 3 minor, below | |

## Runs (2 of 3 budget)

| # | Run id | Project | What | Time | Cost |
|---|---|---|---|---|---|
| 1 | `5ybSGsxWRqwtu-1aGfCIe` | `H-4K0DkWM1` (HTML, "Tea shop") | build tea shop page: hero CTA, 3 cards with hover, footer | 86.9 s (run 80.2 s) | $0.25 |
| 2 | `3WGxIfFqniJ67hBrVh1hK` | `H-4K0DkWM1` | button text "Visit the shop", focus ring on cards | 29.9 s (run 25.8 s) | $0.11 |

Total: $0.36.

## Details

### 1. Draft first

- Brief text at 3.0 s. First draft html at 3.5 s (171 B), then it grew every 0.5 s poll to 5568 B, `isComplete: true` at 19.7 s. The Write tool call finished at 19.6 s, so the draft streams from the tool input.
- The model now writes before TodoWrite, ToolSearch and Skill. First TodoWrite at 21.5 s.
- Phases: draft 0-20 s, agent checks (render_check 4.9 s, design_review 11.7 s) 21-40 s, agent fixes and tweaks 40-60 s, studio check loop 60-74 s, studio screen check loop 75-86 s.
- Run 2 (edit): first edit draft at 7.2 s. The model loaded `personal:make-interfaces-feel-better` with the Skill tool on its own (the studio recommended none).

### 2. Studio final check

- Run 1: the agent did not take a mobile screenshot or call review_frame after its last edit. The studio ran both and sent continuation 1 with 4 medium findings on changed lines: 3 `type` findings (9 font sizes, max 7) and 1 `interaction` (logo link has no hover). The agent fixed all 4 (logo 24 px with hover color, 17 px and 15 px text). `finalCheck.appReview`: `passes: [{findings: 4, fixLoop: true}, {findings: 0, fixLoop: false}]`.
- Then the studio screen check sent a second continuation (6 tap-target findings), and the agent widened the nav links to 44 x 44 px.
- Run 2: `appReview: { mobileShot: "agent", review: "studio", findings: 0, fixLoop: false }`. No app-check loop. The screen check still ran (bug 2).
- No focus findings came up. Run 2 added a card focus ring; render_check gave no medium or high finding.

### 3. Context

| Point | Tokens |
|---|---|
| Start of run 1 | 19,892 |
| End of run 1 | 51,621 |
| Start of run 2 | 53,024 |
| End of run 2 | 69,264 |

- `run.usage` gives `contextWindow: 1000000` on each result event, and `null` on the others. The live UI keeps the last non-null value, so the meter uses 1M. Growth per run: about 16-32k tokens.

## Bugs

1. **"Studio check:" line is lost from the run log.** Run 1 had a studio app check with a fix loop (`appReview.fixLoop: true`), but `finalText` and the chat have only the "Studio screen check:" line. Cause: `continueAppReview` adds the `toReviewNote` line to `finalText`, then `continueScreenReview` merges with `mergeOutcomes`, which takes `next.finalText` (`src/server/agent/sdk-driver.ts` about line 683) and drops the earlier line. Steps: new HTML project; prompt that builds a page; the agent skips the mobile shot, so both studio checks run; read the last chat message or `get_run` `summary.finalText`. Expected: both "Studio check: ..." and "Studio screen check: ..." lines. Screenshot: `r1-end-dark.png`.
2. **Screen check lists one screen twice and runs when the agent took a screenshot.** One canvas frame (`canvas_list`: `frames: []`, f1 only), but both runs say "the agent took no screenshot of 2 screen(s) (Small-batch tea, steeped slowly., Small-batch tea, steeped slowly.), so the studio took 4 image(s)". The tap-target findings repeat 3 times each. In run 2 the agent called `mcp__studio__screenshot {viewport: "mobile"}` at 16.9 s after its last edit at 11.4 s, and the check still said "no screenshot". It also says "one fix loop ran" when the agent made no edit in that loop. Cost: a full extra turn (run 2: 21.6 s to 28.9 s, about 7k tokens). Steps: run 2 above, then read the final chat line. Screenshot: `r2-end-light.png`.
3. **Meter window falls back to 200k after a reload.** `RunSummary` (and the `get_run` summary) has `contextTokens` but no `contextWindow`, and `runFromSummary` in `src/ui/features/chat/run-state-model.ts` sets `contextWindow: null`. After a page reload, `contextWindowFor` returns 200,000 for `claude-sonnet-5-5`, so the meter shows 5 times the real share (it appears at 100k tokens, not 500k). The first run in a fresh chat has the same gap until its first result event. Found from the summary JSON and the code; not seen on screen, because 69k tokens is below the 50% show line for both windows.
4. **Edit draft with `replace_all` has empty html.** Run 2 at 11.2 s: `get_draft_run` gave `kind: "edit"`, `bytes: 35`, `html` length 0, `isComplete: true` for the `Edit` call with `replace_all: true`. The other edit drafts had the full page (6.6 KB). Not checked on screen (no screenshot at 11 s); the draft layer may show nothing or a blank page for that edit.
5. **Minor: continuation number.** Both run 1 continuations are sent with `continuation: 1`.
6. **Minor: 404 on page load.** The UI calls `GET /api/projects/H-4K0DkWM1/d/main/changes?from=null&to=<sha>` after the first version and gets 404 (first version has no parent).
7. **Minor: file chip on a new file.** Run 1 created `index.html`, but the chip says "Created index.html +96 -10" (`r1-end-dark.png`).

## Screenshots

- `r1-live-8s.png`: run 1 at 8 s, draft bar "Writing index.html · 1 KB", head and styles only so far.
- `r1-end-dark.png`: run 1 end, only the "Studio screen check" line, duplicate screen label, "+96 -10" on a created file.
- `r2-end-light.png`: run 2 end, "4 changes" pill, screen check note after a run where the agent took a screenshot.

# Cycle 34 pick 1: flow-frames

Branch `feat/flow-frames`. Prompt for both real runs: "A 3-screen sign-up flow for a yoga studio app: welcome, plan picker, confirmation. Each step links to the next." Default model (Sonnet 5.5), fresh data folder, local sign-in. Runs started over the same HTTP route that Home uses (`POST /api/projects`).

## Stage A: baseline on main (`d274c9cff`)

- Done: 3 pages, 3 frames in one row (gap 80), and the share link tapped through 3 screens at 390 px.
- Manual fixes: none.
- Slowest step: the canvas calls. The model called `canvas_list` and `canvas_place` 3 times. Between the last page write and the checks, that took 6.7 s with `ToolSearch`, `studio_help` and `TodoWrite` in between.
- Other issues:
  - The model put step numbers in the frame labels, so the share viewer showed "3 3 Confirmation".
  - The share link opens only on this computer (LAN is off).
- Raw data: `cycle-34/flow-frames/baseline.json`.

## Stage B: fix

There was no manual fix, so the rule picked the slowest step: seam 1 (the lead).

- **Added: action `canvas.createPageFrames`** (`create_page_frames_canvas` on MCP and the agent).
  - Reads each HTML page in the work tree, with its anchors, form actions and script links.
  - Finds every page that a link reaches from a framed page and that has no frame. The search goes through pages it adds, so index -> plans -> done adds 2 frames.
  - Puts each new frame right of the frame that links to it, in link order, with a gap of 80 and the size of the source frame.
  - Takes each label from the first part of `<title>`. When pages share that part, it uses the first `h1`.
  - Gives a blank canvas an entry frame with the index label.
  - Sets the first start point when none is set.
  - Makes one version, so one undo step.
  - `pages` limits which pages can get a frame.
- **Added: run-end hook.** `agent/flow-frames.ts` runs after the port review and before the screen check. It acts only on HTML runs that completed. It passes only the `.html` pages that this run wrote (`changedSince` from the run start), so a frame that the user removed is never added back. It adds the note "Studio placed N frames: ...".
- **Changed: `FLOW_STEP` for HTML projects in the canvas-owner direction.** The `canvas_list` and `canvas_place` sentence is gone. The prompt now says the studio frames each linked page. React prototypes, apps and drafts in other directions keep the old sentence, because the action works only in the direction that owns the canvas.

## Stage C: gate on the branch

| Measure | Baseline (main) | Branch |
|---|---|---|
| Run wall time | 107 s | 79 s |
| Run duration (model / tool) | 97.1 s (76.1 / 32.4) | 67.2 s (58.1 / 12.1) |
| Cost | $0.35 | $0.22 |
| Usage events (model turns) | 18 | 14 |
| Tool calls | 28 | 23 |
| `canvas_list` + `canvas_place` calls | 1 + 3 | 0 + 0 |
| Frames | 3, labels "1 Welcome", "2 Plans", "3 Confirmation" | 3, labels "Welcome", "Choose a plan", "You're in" (2 from the studio) |
| Studio screen check | 6 images, 1 fix loop | 6 images, 1 fix loop |
| Share at 390 px, 3 taps | pass, 9.3 s | pass, 9.4 s |
| Manual fixes | 0 | 0 |

The gate passes:
- 3 labelled frames, left to right, with no overlap.
- Start point set to the Welcome frame.
- The share link taps through all 3 screens at 390 px.
- No manual fix.
- Enter to share link: 28 s faster.

Both runs had the same screen-check resume, so the comparison holds. One run per side, so model variance is not measured.

## Checks

- **call-action: canvas.createPageFrames** (seeded `index.html` -> `plans.html` -> `done.html`, mock agent).
  - First call: HTTP added `f2` "Plan picker" and `f3` "Confirmation", with start `f1`. MCP and agent then added 0. This is the expected repeat result, and it shows as a diff.
  - Second call: all 3 surfaces match and return 0 frames. Result: pass.
- **Other calls:**
  - `pages: ["index.html"]` adds 0 frames, so a page that this run did not write is not added.
  - `pages: ["plans.html"]` adds only plans.
  - `fromFrame: "@nope"` returns 404 NotFound.
- **UI:**
  - With a project open, a call adds a frame and it shows on the canvas.
  - `Mod+Z` removes that call's frame in one step.
  - The `action-*.png` shots show an "Unfinished changes" banner. The seed pages were copied in by hand. The feature does not cause it.
  - Screenshots: `action-light.png`, `action-dark.png`, `canvas-light.png`, `canvas-dark.png`, `share-390-step1.png`, `share-390-step3.png`, and the baseline shots.
- **Commands:** `pnpm run typecheck` 0 errors. `pnpm run lint:gate` passes. `pnpm run build:ui` passes. `gen-routes --check` is clean.
- **Real runs:** 2 of 3 used (baseline and gate).

## Files outside the pick list

- `apps/desktop/src/server/canvas/page-frames/run-page-frames.ts` (in the owned folder).
  - The hook calls the page-frames ops directly, inside the run scope, through `canvas/index.ts`.
  - It does not go through `mcp/runConfirmedAgentTool`: that import adds a `boundaries(dependencies)` warning (agent -> adapter).
- `apps/desktop/src/server/agent/run-level.ts`. Besides `FLOW_STEP`, it adds:
  - the `isHtmlPages` field on `RunLevelContext`;
  - `toFlowStep`;
  - a `context` parameter on `toDraftSteps`.
- `apps/desktop/src/server/agent/sdk-driver.ts`. Besides the import and call lines:
  - It adds 1 line, `isHtmlPages: isFlowFramed(input.ctx)`, to the run-level context.
  - It inlines the one-use `roomForFixLoop`, so the file is 1 line shorter than at HEAD (`studio/no-file-growth`).

## Left out

- **Mock-run check.** `STUDIO_AGENT=mock` uses `createMockDriver`, not `sdk-driver`, so a mock run cannot reach the hook. The real gate run proved it instead. A mock hook would grow `mock.ts` (1402 lines).
- **Seam 3, share dialog copy.** Not changed. Stage A made the link through the API, so it did not show the dialog problem.
- **Phone Play scales the desktop frame down.** At 390 px the share viewer shows the 1440 px frame scaled down, so the text is small. Both runs showed it. This is outside the owned files.
- **Written pages, not created pages.** The hook uses pages the run wrote (by mtime), not only pages it created. So a run that edits a page whose frame the user removed adds that frame back.
- **No re-add record.** The run passes only the pages it wrote. A direct call with `pages: null` still frames every linked page that has no frame, including one the user removed.

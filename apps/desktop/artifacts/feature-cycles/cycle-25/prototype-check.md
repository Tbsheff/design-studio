# Cycle 25 pick 1: prototype-check

Branch `feat/prototype-check`. No new action, no MCP change, no gen-routes, no snapshot diff.

## Changes

- Added `server/agent/prototype-review.ts`. `toPrototypeReviewGaps` covers HTML projects: no `project.app`, mode `edit`, a preview URL, an edit after the last `review_frame`, and a level that is not wireframe. `toReviewGaps` tries the app path first and then the prototype path. `toReviewNote` builds the note. Prototype runs get "Studio check:", and app runs keep "Studio app check:".
- Changed `final-check.ts`. `changedFiles` uses `app?.appDir ?? ""`, so HTML runs diff from the work-tree root. `AppReviewGaps` has a new `isPrototype` field, and the fix-loop prompt opens with "You finished a prototype run without ...". The note code moved to `prototype-review.ts`. The file went from 586 to 567 lines.
- Changed `sdk-driver.ts`. The one `appReviewPass` call site now calls `toReviewGaps`. The result message passes `modelUsage[*].contextWindow` (the largest one) to `sink.usage(tokens, window)`. The usage helpers moved to the new `run-usage.ts`. The file went from 1649 to 1635 lines.
- Changed `lifecycle.ts`. `run.usage` now has `contextWindow: number | null`. The file went from 1077 to 1073 lines.
- Changed `contracts.ts`. The `run.usage` member has the new field. oxfmt does not keep it on one line, so the file grew by 5 lines.
- Changed the chat UI. `run-state-model` and `use-chat-state` keep the last reported window. `contextWindowFor` and `contextShare` take it, and fall back to the model-name rule. The prop chain goes through `left-props.ts`, `prompt-box-props.ts`, `prompt-toolbar-row.tsx`, `prompt-toolbar.tsx` and `run-notice.tsx`, which are outside the pick's file list. The three mock drivers pass `null`.

## Checks

- Real model, `claude-sonnet-5-5`, 2 runs, using `/Volumes/DevProjects/code/ds-wt/pck-measure.mjs`. Run 1 was a blank pricing page: 78.6 s, $0.235, 53,279 context tokens. Run 2 was a FAQ follow-up: 34.8 s, $0.083, 66,132 tokens. Both `run.usage` events had `contextWindow: 1000000`.
- Failed in run 1: the studio check did not fire. The cause was that runs started over the API (and blank-project first runs) have `ctx.target === null`. The spec asked for a target. `review_frame` works without one, so I dropped that condition (commit 6333f27e1). I had used both real runs, so after the fix I did not see a fix loop end to end with the model.
- Gap harness: `pck-gaps.mts`, run on the real project. Prototype and polish give gaps. Wireframe, ask mode, a review after the last edit, and app projects with no target give `null`. A mobile shot after the edit sets `mobile:false`. The note text is right for HTML and app runs.
- HTML sources match: `review_frame` on the run 1 page gave 4 high type findings with sources such as `index.html:116:9`. `changedLinesSince(workTree, "")` lists `index.html`, so these findings would start the fix loop.
- Meter: at 66k of 1M the ring stays hidden (under 50%), so I could not capture the tip. The screenshots show the chat after both runs, with no meter.
- `pnpm run typecheck` passes, `lint:gate` passes, `build:ui` passes.
- `call-action.ts` does not apply because there is no new action.

## Per-run growth (from the session jsonl, `pck-session.py`)

| Run | Text | Tool text | Images | Assistant | Total |
|---|---|---|---|---|---|
| 1 | 5.9k | 5.6k | 7.3k (8) | 6.8k | 25.5k |
| 2 | 1.2k | 3.2k | 4.0k (4) | 2.1k | 10.4k |

The measured growth was 12.9k for run 2. Screenshots are the largest part, at about 900 tokens each, so they are already below 1280 px. Capping their size would save little.

## Left out

- The screenshot cut. Trimming at a new run changes the cached prefix, which forces a cache write of the whole tail on every run (about 1.25x input price on 50k+ tokens). That costs about as much as the roughly 7k tokens per turn it saves from run 3 on. I could not measure it within 2 real runs, so I left it for a decision.
- `RunSummary` does not store the window, so after a reload the meter uses the model-name rule until the next `run.usage` event.
- There are no screenshots of the prototype note or the meter tip, because neither appeared in the real runs (see above).

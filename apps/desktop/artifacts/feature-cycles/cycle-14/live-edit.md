# live-edit (cycle 14, pick 1)

Branch `feat/live-edit`. No new action.

## What works

- `run.getDraft` (`get_draft_run`) returns `kind: "write" | "edit"`. For an edit, `html` is the full page: the base file with the unique `old_string` replaced by the partial `new_string`. Open tags in the partial text are closed, so a cut `<h1>` does not swallow the page. A later edit in the same run builds on the last composed page. The base file is read once per run and path, when the edit block starts.
- `old_string` not found exactly once: `html` is null, the UI shows the bar only.
- `draft-stream.ts` decodes `old_string` and marks `Edit` and `Write`.
- Mock: an edit of an existing `.html` file streams one `Edit` in 4 chunks (old and new text from a line diff).
- UI: `canvas/draft-layer.tsx` mounts in `stage-artboard.tsx` when the first-build cover is off. On each `run.write.delta` it refetches `run.getDraft` (one call in flight, one queued refetch, no timer). It shows a sandboxed `srcdoc` layer (with a `<base>` of the frame URL) and the "Editing index.html · 1 KB" bar. It fades out when the real frame loads after the edit completes (front token change), or 1.5 s after `run.finished`. A reload during a run lists the last run of the direction and fetches the draft once.

## Checked

- `call-action.ts run.getDraft` during and after an edit: `kind: "edit"`, `isComplete` false then true, HTTP and MCP match (agent surface is off: run-control).
- HTTP poll during a mock edit: bytes 14, 28, 42, 56, then `isComplete: true`.
- Playwright: layer visible about 450 ms after run start; after a reload it is back in 100 ms; landed after the run.
- Screenshots: `cycle-14/live-edit/live-edit-dark.png`, `live-edit-light.png`, `live-edit-landed-light.png`.
- `pnpm run typecheck`, `pnpm run lint:gate`, `build:ui`: pass.

## Left out

- Real-model timing check (spec step 5): not run, mock only.
- `replace_all` edits compose only when `old_string` occurs once.
- Shared file touched outside the pick list: `src/ui/styles/canvas.css` (3 small `.draft-layer` rules for fade and bar-only mode). Also `src/server/run-log/index.ts` (export line) and `canvas/copy.ts` (`draftEditing`).

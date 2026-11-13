# Cycle 13, pick 1: live-build

Branch `feat/live-build`. The frame shows the page while the agent writes it.

## What works

- **Streams** `Write` and `Edit` tool input from the SDK (`input_json_delta`) in `agent/draft-stream.ts`. It decodes the partial `content` (or `new_string`) string as it grows.
- **Emits** `run.write.delta` (`{ runId, toolUseId, path, text }`) on the event bus, batched at 250 ms (`agent/run-draft-feed.ts`). Each event carries only new text.
- **Serves** `run.getDraft` (`GET /api/projects/:projectId/runs/:runId/draft`, MCP `get_draft_run`, agent off: run-control). Output: `{ path, bytes, html, isComplete }`, `html` cut at 256 KB and null for non-HTML files. `RunDraftStore` (read) keeps the last draft of the last 16 runs, so `isComplete: true` stays readable after the run.
- **Shows** the partial page in the first-build cover (`canvas/draft-frame.tsx`): sandboxed `srcdoc` (no scripts), two iframes that swap on `load` (no flicker), and a top bar "Writing index.html · 1 KB". The existing paint gate swaps to the real preview with no blank flash. Non-HTML writes show the bar over the skeleton.
- **Streams** the mock: a first `Write` of a new file arrives in 4 chunks, 1.2 s apart (`agent/mock-draft.ts`).

## Checked

- Mock run "A pricing page for a coffee subscription": first draft paint 0.8 s after Enter. `run.getDraft` during the run returned bytes 491, 982, 1473, then 1961 with `isComplete: true`.
- `call-action.ts run.getDraft`: pass. HTTP and MCP match, 0 diffs. Agent skipped (run-control).
- Screenshots: `cycle-13/live-build/draft-{dark,light}.png` (growing page) and `done-{dark,light}.png` (final frame).
- `pnpm run typecheck`, `pnpm run lint:gate`, `pnpm run build:ui`.

## Left out

- **Edit drafts** report path and bytes only. `new_string` is not the page, so no partial view.
- **Relative assets** (`<link href="styles.css">`) do not load in the partial view. No `<base href>`, because the preview URL is null during the first build.
- **Late joiners** see only the deltas after they connect. The view does not fetch `run.getDraft` on mount.
- **Partial view** shows only in the first-build cover, not for a rewrite of a page that already exists.
- **Real model timing** is not measured. Check one real run by hand.

## Files outside the pick list

- `server/events/index.ts`: exports `boundEventBus` (one line).
- `server/run-log/{run-draft-map,run-draft-store,index}.ts`: the store lives in `run-log`, because handlers may not import `agent` (boundaries rule).
- `canvas/stage-artboard.tsx`: passes `projectId` and `directionId` to `StepCover`.
- `ui/platform/event-hub.ts`: one event type row.
- `artifacts/mcp-snapshots`: approve the new `get_draft_run` tool at merge.

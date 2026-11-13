# Cycle 18 pick 2: frame-focus

Branch `feat/frame-focus`.

## What works

- Shows "Focus on N frames" in the chat composer when 2 or more canvas frames are selected. A click adds the page file of each selected frame as a focus chip, with no duplicates.
- Leaves out a frame whose page has no HTML file in the project (a route frame such as `/dashboard`). The button tip says how many: "Add the page file of each selected frame. 1 left out: no page file in the project".
- Maps a frame with no path to `index.html` in an HTML project. In an app project such a frame is left out.
- Hides the button when every page file is already a chip. Clears the chips when the run starts, as before.
- Adds a description to the `focusPaths` field of `start_run` (no schema change): "Pass the page file of each canvas frame to focus on several screens."

## Files

- New: `src/ui/features/canvas/frame-focus-model.ts` (`toFramePageFiles`), `src/ui/features/canvas/use-frame-focus-files.ts` (`useFrameFocusFiles`), `src/ui/features/chat/focus-frames-button.tsx`.
- Changed: `canvas/index.ts` (one export line and one type line), `chat/{run-focus-model.ts,use-run-focus.ts,focus-chips.tsx,copy.ts,prompt-box-props.ts,use-prompt-input.ts}`, `app/studio/{studio-left.tsx,left-props.ts}`, `packages/common/actions/src/run/start.ts`.
- The chat feature does not import the canvas feature. `app/studio/studio-left.tsx` calls the hook and passes `frameFocus` to the composer through `promptProps`. That makes 2 `app/studio` files, not 1.

## Checks

- Tested in the running app (mock agent, HTML project, 4 pages):
  - Selected 3 frames: the button read "Focus on 3 frames" and a click added 3 chips. Sent "make the headers match": the run record has `focusPaths: ["pricing.html","about.html","contact.html"]`.
  - Selected 2 frames of one page plus a route frame: 1 chip (`pricing.html`), and the tip said "1 left out".
- `start_run` over HTTP and MCP with 2 `focusPaths`: both runs started with both paths (`call-action.ts run.start`; the MCP leg answered `run_in_progress` because the HTTP run was still active, so it ran again alone and passed).
- Screenshots: `cycle-18/frame-focus/composer-chips-dark.jpg`, `composer-chips-light.jpg`.
- `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59661, baseline 89733). `pnpm run build:ui` passes.
- `check:scripts` fails on E16 legacy-list warnings. They fail on `main` too and do not come from this pick.

## Not done

- No new action, as the spec says.
- The `start_run` field description changed, so the `artifacts/mcp-snapshots` diff needs approval at merge.

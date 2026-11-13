# Cycle 13 pick 4: selection-prompt

Branch: `feat/selection-prompt`. No new action.

## What works

- **Ask button**: a small "Ask" pill sits on the top-left corner of the selection. Click opens the floating composer under the selection.
- **Composer**: one line that grows with Shift+Enter. Enter starts a run. Esc closes. "Open in chat" moves the text to the chat composer.
- **Run**: the box sends the same request as the chat composer: `prompt`, `mode: "edit"`, `selection`, `canvas` and the project default level. It goes through the studio `startRun` path, so the chat shows the run (optimistic row, "1 selected" chip).
- **Status line**: after Enter the box turns into "Working on “Hero” · 12 s". It closes when the run ends.
- **Placement**: the box counter-scales with zoom. It moves left of the inspector and right of the dock (checked at 1000 px). It also flips above the selection when no room is below; no shot covers the flip.
- **Cmd+I**: when the chat composer is shown, Cmd+I focuses it as before. When it is not shown, Cmd+I opens the floating box.
- **`run.start` text**: the `selection` and `editScope` fields now have descriptions with examples. `Schema.toJsonSchemaDocument(startRun.input)`, the source of the MCP tool schema, holds both texts.
- **Chat agent**: does not apply. `run.start` has agent `{ off: "run-control" }`.

## Checked

- **UI flow**: playwright-core drove select, Ask, type, Enter, status line and close. Shots in dark and light at 1440 and 1000 px are in `cycle-13/selection-prompt/`.
- **Open in chat**: the composer received the text and the box closed.
- **Cmd+I with chat shown**: focus went to the chat composer, and the box did not open.
- **Cmd+I with the composer hidden** (a style hid it): the box opened with focus in its input (`dark-1440-cmd-i-box.png`).
- **One mount**: `StageOverlay` mounts once, on the active artboard. Passive frames get no Ask pill, so one open listener exists.
- **`call-action run.start`** with a selection: HTTP started the run. MCP then failed with `run_in_progress`, the documented one-run-per-direction rule. That result shows the MCP route decoded the selection input and reached the handler (`call-run-start.txt`).
- **`call-action run.get`**: passes on HTTP and MCP with 0 diffs. The run request holds the selection, and the agent got `<selected-elements>` (`call-run-get.txt`).
- **Gates**:
  - Pass: `pnpm run typecheck`, `pnpm run lint:gate`, `pnpm run build:ui`, `gen-routes --check`, `check:clip` (0 findings).
  - Fails, as on `main`: `check:scripts`. The cause is the existing check-actions baseline (551 hits, ops E16 on `version.restoreHistory`). This branch gives the same counts as `main`.

## Left out

- **This use / All uses choice**: the box sends no `editScope`. The chat composer does not send it either. The old inline prompt had the choice (removed in `b3fbb9cbc`), and it can come back from there.
- **Change-spotlight rings**: they belong to pick 2. When the run merges, pick 2 rings the result.

## Notes for the merge

- **Chat column always open**: the chat column has no closed state on `main`. The left pane is always rendered, and `paneCollapsed` has no reader. So today Cmd+I always focuses the chat, and the Ask pill is the way to open the box. Cmd+I opens the box only when the composer is hidden.
- **Files outside the pick's globs**:
  - `ui/app/studio/use-selection-prompt-run.ts`: new, the send and open-in-chat listener beside `startRun`.
  - `ui/app/studio/use-studio-run.ts`: 1 call.
  - `ui/platform/focus.ts`: `isComposerShown`.
  - `ui/app/main.tsx`: 1 CSS import.
  - `ui/styles/selection-prompt.css`: new.
- **Why**: `LiveOverlay` has no project, direction or run state, and its parent `stage-overlay.tsx` belongs to pick 2.
- **Shared files**: `canvas/copy.ts` gets one `selectionPrompt` block.

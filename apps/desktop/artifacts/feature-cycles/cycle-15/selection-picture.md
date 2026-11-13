# Cycle 15, pick 4: selection picture

Branch `feat/selection-picture`. A run with 1 to 5 selected layers gets one PNG of their joint box as an image attachment. The model sees it next to `<selected-elements>`.

## What works

- **Captures** on the server at run start, so UI, chat and MCP `start_run` all get it. Box: union of the selected layers, 24 px margin, scale 2 (lower when the box is wider than 800 px, so the PNG is at most 1600 px wide). Measured: about 0.5 s warm, 1.1 s cold.
- **Skips** the picture when the capture fails or takes more than 1.5 s. The run never waits longer.
- **Adds** `isSelectionPictureOn` to `start_run` (decoding default `true`, described in the field annotation).
- **Adds** `selectionPicture` (attachment id or null) to `get_run`. The id is kept on the run request (`RunRequest.selectionPicture`), so the run summary holds it.
- **Notes** "Picture: the selected layers as the user sees them." in `<selected-elements>` when the picture is attached.
- **Mock** reply names the picture: "The picture of the selection showed me the layers as you see them."
- **Chip** "Picture of selection" with an X shows in the selection prompt foot and in the chat composer chip row. X leaves the picture out of the next run. The flag goes back to on after a run starts.

## Files (and where they differ from the spec)

- Actions: `run/start.ts` (one field), `run/schema.ts` (one output field). Contracts: `RunRequest` gets `selectionPicture` and `isSelectionPictureOn`.
- Server: new `agent/selection-picture.ts` (capture, Promise sibling), new `agent/selected-elements.ts` (picture name, note, mock reply; `formatStyles` moved here so `user-message.ts` stays under 500 lines), `agent/user-message.ts`, `agent/mock.ts` (line-neutral), one export in `agent/index.ts`, `handlers/run/get.ts`.
- **Changed:** the capture call sits in `http/app-run-start.ts`, not `http/app-context.ts`. The flag is in the action body there, and `app-context.ts` is over 500 lines (`studio/no-file-growth`). The picture becomes a normal attachment id, so the existing attachment load in `startRun` makes the image part.
- UI: store `platform/selection-picture.ts`; one shared chip `ui/ai/components/ai/selection-picture-chip.tsx`; mounts in `canvas/selection-prompt-foot.tsx` and `chat/selection-chips.tsx`; `count` passed through `selection-prompt.tsx` and `selection-prompt-box.tsx`; copy blocks in `canvas/copy.ts` and `chat/copy.ts`; `styles/selection-picture.css` (one import in `main.tsx`); flag in `start-body.ts`, `request-model.ts`, reset in `use-studio-run.ts`.
- **Changed:** the chip is in the UI kit, not `canvas/`, and the chat mount is in `chat/selection-chips.tsx`, not `chat/prompt-frame.tsx`. A chat import of a canvas file breaks the feature boundary, and `prompt-frame.tsx` does not have the selection.

## Checks

- `call-action run.start` with a selection: HTTP started the run; MCP returned `run_in_progress` (one run per direction, expected). Picture off: 15 ms; on: 506 ms.
- `call-action run.get` on that run: `selectionPicture` set, the same on HTTP and MCP (agent off: run-control). `sent.imageCount` is 1.
- The PNG (704 x 498) shows the Pro card with its margin.
- UI (mock, playwright): select a card, Ask, both chips show. Send: the run has `selectionPicture`, the reply names the picture. X: both chips hide, the next run has no picture.
- Screenshots: `cycle-15/selection-picture/selection-picture-dark.png`, `selection-picture-light.png`, `after-run-dark.png`, `after-x-dark.png`.
- `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59669, baseline 59679 before, 89733 ceiling). `pnpm run build:ui` passes.

## Left out

- The chip shows an image icon, not a real thumbnail. The client has no picture until the run starts.
- Verify step 4 (one real-model run) is not done; the runs used the mock agent.
- The `start_run` and `get_run` MCP snapshot diffs wait for approval at merge.

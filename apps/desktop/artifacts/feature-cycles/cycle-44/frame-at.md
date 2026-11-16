# Cycle 44 pick 4: frame-at

Branch `feat/frame-at`. Mock agent only, 0 real-model runs.

## What works

- **Picker.** `@` in the studio composer shows a "Frames" group: each frame of the direction canvas, by label or page path, with page and size (`Pricing /pricing.html · 1440 × 900`). Hidden frames are left out. Typing filters by label, path and size.
- **Chip.** A picked frame shows as a chip with the frame icon.
- **Run.** The agent gets a `<mentioned-frames>` block (label, page, state, size, frameId, "Call get_screenshot with frameId to see it."). The page file of each frame goes into `<mentioned-files>` once.
- **Errors.** An unknown, deleted or other-direction frame id fails run start with `BadRequest`: "No frame <id> in this design. Call canvas_list for frame ids." The UI banner now shows this text.
- **MCP.** `start_run` with `mentions: [{ "kind": "frame", "frameId": "f2" }]` gives the same block.

## Files

- New: `contracts/src/run-mention.ts` (`RunMention` with the frame kind, `CommentMention`), `server/http/mention-frames.ts` (`toMentionContext`), `server/agent/frame-mention-block.ts`, `ui/app/studio/use-mention-frames.ts` (the studio hook that passes the frames; it reads `canvasStore`).
- Changed in the pick list: `contracts.ts` (net 4 lines fewer), `contracts/package.json` (gen-routes), `http/mentions.ts`, `agent/user-message.ts` (net +10), `chat/{mention-options-model,use-mentions,copy}.ts`.
- Changed outside the list (no other pick owns them):
  - `chat/{mention-picker.ts,mention-list.tsx,prompt-box-props.ts,use-prompt-input.ts}`: the frame icon, label and key live in `mention-picker.ts`, not `mention-chip.tsx`.
  - `ui/app/studio/{left-props.ts,studio-left.tsx}`.
  - `server/http/app-context.ts`: 0 net lines.
  - `server/agent/{index,run-target}.ts`: export `routeFileOf`.
  - `shared/server-ports.ts`: `MentionFrame`.
  - `server/comments/run-payload.ts`.
  - `server/store/comments.ts`: comments keep the old 3 kinds through `CommentMention`.
  - `ui/api-run.ts`: run start uses `pickMessage`, so the banner shows the message, not the tag.

## Checks

- `call-action run.start` with frames f3 and f5: http gives `{ runId }`, and the run log has the block and both page files. The mcp leg gave `run_in_progress` because the http run still held the direction. A separate MCP-only `start_run` call with f2 and f4 gave `{ runId }` and the right block.
- `call-action run.start` with f99: http and mcp give the same BadRequest text. The only diff is the wire format of an error.
- The agent leg is off (`run-control`).
- UI on fixture `ds-wt/fat-seed` (Home, Pricing at 1440 and 390, Checkout). I deleted Checkout after I picked it, then sent: the banner showed the error text.
- `typecheck` passed with 0 errors. `lint:gate` passed. `build:ui` passed.
- `check-bundle`: B1 is 271,703 B (delta 0).
- `gen-routes --check` passed.
- `check-actions --probes`: 278 hits (E1 25, E16 6, O11 1, O12 52, S11 194), the same as main.
- MCP snapshots: no change.

## Screenshots

`frame-at/picker-dark.png`, `chip-dark.png`, `picker-chip-light.jpg`, `chip-light.png`, `deleted-frame-error-light.jpg`.

## Left out

- The Home composer was not clicked through. Home passes no frames, so the code path is the same as main.
- The frame mention carries an extra `label` field (`string | null`) so the chip can show a name. MCP clients can leave it out.

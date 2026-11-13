# Cycle 16 pick 4: screen-drop-finish

Branch `feat/screen-drop-finish`. This pick closes the 3 gaps that cycle 15 left in screen drop. No new action.

## What works

- **Frame size.** `canvas.importFrame` reads the width and height from the PNG or JPEG header on the server. The engine is `frame-import/engine/to-image-size.ts`, which is pure and uses no decode library. The fit is `toImageFrameSize` in `@design-studio/contracts/image-frame`. The server and the paste ghost share it.
  - The fit tries pixel ratios 1, 2 and 3 against the device widths 390, 768, 1280 and 1440, and takes the nearest. The height follows the image aspect, but is never less than the device height.
  - 1179x2556 gives a 390x845 frame. 2880x1800 gives a 1440x900 frame.
  - For WebP, or for a header it cannot read, the frame takes the size of the nearest frame, as before.
- **Active frame.** After a paste, the new frame becomes the active frame: the page picker, the frame outline and the agent presence all move to it, so the live-build cover shows on the new frame. `activateFrameId` in `use-canvas-frames.ts` sets `activeId` first and then the viewport, so the old frame does not resize. If the HTTP reply arrives before the `canvas.changed` event, it waits on `canvasStore.subscribe`, for at most 10 s.
- **Paste ghost.** The ghost now has the image shape. A paste puts it at one of these spots, the first that fits:
  1. Next to the active frame, if it is fully in the window and covers no frame.
  2. After the last frame.
  3. In the center of the window.

  A paste now sends that spot, so the frame lands where the ghost is.
- **Chat agent.** `buildUserMessageParts` adds a list of the image attachments: `image 1: id <id>, 1179x2556, home.png`. The list ends with a line that tells the agent to call `import_frame_canvas` with `shouldStartRun false` and then build the page in the same run. A second run would conflict with the run that is already going. A chat run that has an attachment is never lean, so the tool is in its set.
- **Mock run.** In mock mode, `main/mock-import-driver.ts` handles an HTML edit run that has an image and asks for a "new screen" or "new page". It calls `import_frame_canvas` through `runAgentTool` with the attachment id. The `mock.ts` run log now shows the same image id list.

## Checks

- `call-action.ts canvas.importFrame` passed on HTTP, MCP and agent with no error results, once for the PNG and once for the JPEG. The output is in `cycle-16/screen-drop-finish/call-action-import-frame.txt`.
  - The script prints "fail" only because each call makes a new page, so `frameId` and `path` differ between surfaces. Cycle 15 had the same result.
  - `canvas.json` holds 390x845 frames for the PNG and 1440x900 frames for the JPEG.
- The chat run "make this a new screen" with `home.png` and then with `desk.jpg` attached:
  - `run.sent` holds the id list, for example `image 1: id 5rfc26huChL0, 2880x1800, desk.jpg`.
  - `run.tool.started` is `mcp__studio__import_frame_canvas` with that `attachmentId`.
  - The tool returned `f9` and `imported-screen-8.html`.
- The UI was tested at 1440x900 with a synthetic paste event. The phone ghost showed next to the active desktop frame. Enter added a 390x845 frame at that spot, the frame became active, and the run worked on it. A 2880x1800 paste in light mode gave a 1440x900 frame next to the phone frame, and that frame became active too.
- The UI screenshots are in `cycle-16/screen-drop-finish/`: `paste-ghost-dark`, `building-active-dark`, `result-dark`, `paste-ghost-desktop-light` and `result-active-light`.
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass (59685 against the 89733 baseline). `pnpm run build:ui`: pass. `gen-routes.ts --check`: pass.

## Left out and deviations

- **Files outside the ownership table.** Each change is one line or one new file:
  - `handlers/canvas/import-frame.ts` passes `imagePath` from the attachment.
  - `main/agent-runner.ts` wraps the mock import driver.
  - `agent/index.ts` exports `buildUserMessageParts`.
  - `contracts/image-frame.ts` is new, so the UI and the server share one fit. `contracts/package.json` got its export from gen-routes.
- **Image list position.** The list goes at the end of the user text, after the focus lines. `user-message.ts` is at its 500-line cap, so the change there is 3 lines.
- **Center fallback.** When neither of the first two spots fits in the window, the ghost goes to the center of the window and can cover a frame. The spec asks for this.
- **No real-model run.** No API key was set. The real agent gets the same id list and tool hint as the mock run.
- **Paste test method.** The paste was a synthetic `ClipboardEvent` from the page, as in cycle 15. No real OS paste was done.
- **Fixed bug.** The prompt input lost focus when the ghost showed during the image-size read. A separate transition now shows the ghost, so the input keeps focus.
- **Snapshots.** No new MCP tool, so `artifacts/mcp-snapshots` did not change.

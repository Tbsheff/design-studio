# Cycle 14 pick 2: next-screen

Branch `feat/next-screen`. Drag the link handle of a selected button or link to empty canvas to add the screen it opens.

## What works

- **UI.** In prototype link mode, select an element, then drag its `+` handle to empty canvas. A dashed ghost frame shows where the new frame goes, and a floating prompt asks `What does "Get started" open?`. Enter adds the page, the frame and the link, and starts a run that designs the page. An empty Enter uses a default prompt made from the label. Esc cancels and writes nothing. A drop on a frame, a panel or the prototype bar still does what it did before.
- **Placement.** The new frame goes after the last frame in the row of the source frame, 160 px apart, so frames never overlap. The UI ghost and the server use one rule (`@design-studio/contracts/linked-frame`).
- **Page.** The new page copies the `<head>` of the source page (tokens, fonts, styles) and gets an empty body with an `h1` set to the label. The page, `canvas.json` and `links.json` are saved as one version, with one undo step.
- **Play.** Play follows the new link. Clicking "Get started" opened the new page (`play-follows-link.jpg`).
- **App projects.** The UI shows a note that points to New screen. The action returns `BadRequest` ("Use create_screen") and writes nothing.
- **Action.** `canvas.createLinkedFrame` is stamped with `new:action`. Its MCP and agent tool is `create_linked_frame_canvas` (agent: lean, `core` set). The in-app agent passes `shouldStartRun: false` and writes the page itself.
- **Mock.** When a run focuses one new linked page, `STUDIO_AGENT=mock` writes a booking form into that page, so the flow can be checked without a real model.

## Checks

- `call-action.ts canvas.createLinkedFrame` with `shouldStartRun: false`: http, mcp and agent all pass and give the same shape. Only the frame id and path differ, as the spec expects (each call makes a unique path). The new frames land at x 3200, 4800 and 6400.
- The same call on a react project gives `BadRequest` on all 3 surfaces, and writes no file.
- UI run with the mock agent at 1440 px, in dark and light themes, and at 1000 px in light (screenshots are in `cycle-14/next-screen/`).
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass. `pnpm run build:ui`: pass.
- `pnpm run check:scripts` fails because of E1 and S11 hits in files this branch does not change (`http/app-*-routes.ts`, `events/event-file.ts`). It reports nothing in the new files.

## Left out and deviations

- **Live-build cover.** The new frame does not show the live-build cover while the run writes. The cover lives in the draft and `stage-artboard` files, which pick 1 (live-edit) changes. The frame shows the page when the run ends.
- **No `RunInProgress` error.** That error class is in the `comment` domain. A busy direction returns `Conflict`, as `run.start` does.
- **Selector check.** The server always checks that the selector exists by rendering the source frame. This adds about 0.5 s to each call.
- **Ghost position.** The ghost can sit under a floating panel, such as the inspector, when the next free spot is off screen.
- **Not tested.** Pointer drags were sent as synthetic pointer events, because the browser pane cannot drag across the scaled stage. No real-model run was done.

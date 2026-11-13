# Cycle 15 pick 3: screen-drop

Branch `feat/screen-drop`. Paste or drop a screenshot on empty canvas to get a new frame that a run rebuilds in the project style.

## What works

- **UI.** Cmd+V of an image with no layer selected, or a drop of a PNG, JPEG or WebP file on empty canvas, shows a dashed ghost frame with the image dimmed inside it, and the prompt "Rebuild this screen. Add a note?". A drop puts the ghost at the drop point. A paste puts it after the last frame. Enter uploads the image as a reference picture and calls the action. Esc closes the ghost and writes nothing (no file, no attachment, no version).
- **Paste with a selection.** The handler skips the paste when a layer is selected, when focus is in a text field, or when another handler took the event. Checked: with the `h1` selected, a paste shows no ghost, so the inspector image paste keeps the event.
- **Page.** The new page copies the `<head>` of the nearest frame's page (`to-linked-page.ts`, import only), so the run uses the project tokens and fonts. The page and `canvas.json` are one `manual` version, `Import screen <page>`, and one history entry.
- **Run.** The run gets `focusPaths: [page]` and the image in `attachmentIds`. The run log holds the `<reference-picture>` block, and the mock agent ran the reference fix loop.
- **MCP.** An MCP caller passes any image attachment from `create_attachment_project`. When its name is not a reference name, the server saves a `reference--` copy, so the run still gets the reference picture.
- **App projects.** The UI shows a note that points to New screen. The action returns `BadRequest` ("Use create_screen") on all 3 surfaces. `git status` in the Bonaparte clone stays clean.
- **Action.** `canvas.importFrame` is stamped with `new:action`. MCP and agent tool: `import_frame_canvas` (agent: `core` set, not lean).

## Checks

- `call-action.ts canvas.importFrame` with `shouldStartRun: false`: http, mcp and agent all pass with the same shape. Only `frameId` and `path` differ (each call makes a new page).
- `git log --stat` of the project: each import is one version titled `Import screen <page>` with exactly `.studio/canvas.json` and the page. The run then commits its own version.
- HTTP call with `x: 0, y: 1200` and `shouldStartRun: true`: frame at the point, run started with a `reference--landing.jpg` copy.
- The same call on an app project (Bonaparte `apps/dashboard`, `git clone --local` under `ds-wt`): `BadRequest` on all 3 surfaces, no file change.
- UI run with the mock agent at 1440 px, dark and light: `cycle-15/screen-drop/prompt-*`, `building-*`, `result-*`. The result body is the mock's booking form: the mock writes it into any page with `data-linked-page`, which `toLinkedPage` adds. A real model rebuilds the screenshot.
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass. `pnpm run build:ui`: pass. `gen-routes.ts --check`: pass.

## Left out and deviations

- **Live-build cover.** The cover shows on the active frame, not on the new frame, because the cover lives in `stage-artboard.tsx` and only the active frame has it. Making the new frame active needs changes in the canvas wiring files, which this pick does not own. The new frame shows the result when the run ends.
- **Frame size.** The frame takes the size of the nearest frame, not the image aspect.
- **Paste ghost off screen.** A paste puts the ghost after the last frame, which can be off screen. The prompt stays in the window.
- **Drag and paste tests.** The paste and drop were sent as synthetic `ClipboardEvent` and `DragEvent` events from the page, as in next-screen. No real OS drag and no real-model run were done.
- **Chat agent attachment id.** The agent tool is wired (`call-action` agent surface passes), but a chat run does not see attachment ids in its text (`agent/user-message.ts` shows only the image index and name), so the in-app agent cannot pass one yet. The fix belongs in `user-message.ts`, which pick 4 owns.
- **MCP port.** The test server also bound the MCP listener on 4590 while it ran. It is stopped.

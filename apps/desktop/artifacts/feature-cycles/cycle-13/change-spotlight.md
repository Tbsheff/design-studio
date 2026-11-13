# Cycle 13 pick 2: change-spotlight

Branch `feat/change-spotlight`. Spec: `cycle-13.md` section 2.

## What works

- **Action** `version.inspectChanges` (`GET /api/projects/:projectId/d/:directionId/changes`, MCP and agent tool `inspect_changes_version`, read, `project.read`). `from` and `to` default to null: the parent of `to`, and the direction head. Output: `{ from, to, isTruncated, items: [{ layerId, tag, file, line, kind, hunk }] }`, at most 200 items.
- **Engine** `src/server/store/engine/to-changed-layers.ts` (pure). It splits each hunk into change blocks and finds the innermost element at the changed line and column. Kinds:
  - `added`: a whole element is new.
  - `style`: the change is in the start tag and the text did not change.
  - `text`: the change is in the content.
  - `removed`: an element is gone. The ring goes on the parent, or on the nearest neighbor at the top level.
- **Spans** `src/server/store/change-spans.ts` reads element ranges from HTML (parse5) and JSX (`@babel/parser`). It makes the same `data-studio-loc` as the preview (`file:line:col`).
- **Read** `change-read.ts` gets the file text at both versions through `fileAt`. `ChangeStore` (read service; lint bans the name `ChangeReader`) is wired in `handlers/version/live.ts`.
- **UI**
  - **Rings.** On `version.created` for the open direction, the UI shows rings. The version must be a run (`meta.kind` "run") or an MCP edit (`meta.origin` "mcp"). Events that the event hub replays from before the mount are skipped.
    - The UI finds each layer through the existing `describe-anchors` round trip, so the bridge and contracts did not change.
    - Each ring is 2 px. It holds, then fades over 4 s.
    - Colors: added green, text blue, style amber, removed red dashed.
  - **Pill.** "N changes" floats at the top center of the stage, through a portal into the stage element.
    - Click steps to the next change: it selects with `select-source`, then zooms to the selection.
    - Shift+click, Esc or × clears the pill.
    - "Undo this change" calls `revert_hunk` for the hunk of the current step. Cmd+Z takes it back.

## Checked

- Ran `call-action.ts version.inspectChanges` for head and for a delete. The result is pass on HTTP, MCP and agent, with 0 diffs (`change-spotlight/call-action-*.txt`).
- Checked kinds on real versions:
  - A mock run that adds a paragraph gives `added`.
  - MCP `edit_element` h1 text gives `text`, and one text ring shows in the open app.
  - h2 color gives `style`.
  - `batch_edit` with 6 edits gives 6 rings, with style and text split per line.
  - MCP delete gives `removed`.
  - A JSX sample gives section `style`, h1 `text` and new p `added`.
- In the UI: rings, the pill count, steps "1 of 6" to "3 of 6", Undo this change, Cmd+Z, Esc clear, and no replay on reload.
- Screenshots: `change-spotlight/rings-dark.jpg`, `rings-light.jpg`, `step-undo-dark.jpg`.
- These pass: `pnpm run typecheck`, `pnpm run lint:gate` (59671, baseline 89733), `pnpm run build:ui` and `gen-routes --check`.

## Left out or limited

- **Undo granularity.** Undo works on one git hunk. Changes 3 lines apart or closer merge into one hunk, so the undo can revert more than the ringed layer. In the 6-edit batch, one hunk held all 6 edits. The button says so: it reads "Undo N changes" when N rings share the hunk, and "Undo this change" only when one ring does. A finer undo needs a new write action.
- **Pill place.** The spec puts the pill at the frame label. It is at the top center of the stage instead. A pill on the frame went under the inspector, or off screen when a step zoomed in.
- **Scope of the test.** All checks ran on the main direction of an HTML project. The UI uses "main" when the canvas has no direction id.
- **Ghost box.** A removed element has no ghost box at its old rect, because the old DOM is gone. The dashed red ring goes on its parent or neighbor instead.
- **Right-click menu.** The ring has no right-click menu. Undo is on the pill for the current step, because the rings let clicks pass through to the frame.
- **Other pages and CSS.** The canvas rings only the front frame. Changes on other pages count in the pill but have no ring. A CSS-only change gives no items.
- **Timing.** The rings can show while the frame reloads, because they come about 0.6 s after the version, not after a repaint.
- **MCP snapshot.** `inspect_changes_version` is a new tool name. The snapshot diff in `artifacts/mcp-snapshots` needs approval at merge.
- **Shared files.** Outside the owned files, this pick added one block to `features/canvas/copy.ts` (`changeSpot*`), one import of `styles/change-rings.css` in `ui/app/main.tsx`, and one export line to `server/store/index.ts`.

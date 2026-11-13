# Cycle 19 pick 4: scale-handles

Branch `feat/scale-handles`.

## Shipped

- **K from the preview.** `contracts.ts` adds `"tool-scale"` to `AppKey` and `["KeyK", "tool-scale"]` to `TOOL_APP_KEYS`. `preview-app-keys.ts` sends it to `requestScaleMode()` (skipped during Play).
- **One store.** `ui/platform/scale-mode.ts` holds the mode flag, a focus-request counter and Keep tokens. The canvas and the inspector both read it; the canvas does not import the inspector.
- **Scale mode.** K (main window or preview) with one layer selected turns it on: the resize handles change to 4 round corner handles. The inspector Scale field gets focus, as before. V, Esc, any tool change or a new selection turns it off. K with no selection does nothing.
- **Drag.** `use-scale-drag.ts` and the pure `scale-drag-model.ts`. A corner drag shows a dashed ghost box with the opposite corner fixed and a percent label. Scale is always proportional (projection on the diagonal), rounded to a whole percent, clamped to 25 to 400 %. A drag under 2 screen px or a 100 % result writes nothing. Esc during a drag cancels it. Release makes one `layer-style.update` call with `factor = percent / 100` and the Keep tokens value.
- **No new action.** `update_layer_style` with `factor` is the MCP and agent form.

## Checked

- **Running app** (mock agent, port 4993, mock HTML pricing page, card with 24 px padding, 12 px radius, 16 px text): focus in the preview frame, K shows 4 scale handles and focuses the Scale field. Drag the se corner to half: label "50%". Release: one POST with `factor: 0.5`; card gets padding 12 px, radius 6 px, font size 8 px, title 9 px (border width kept: token). Cmd+Z restores the card in one step. V removes the handles. K with no selection shows no handles.
- **call-action** `layer-style.update` with `factor: 0.8`: passes on HTTP, MCP and agent. The diffs come only from the 3 writes that compound on one card (child column moves as the style attribute grows) and from `versionId` (`cycle-19/scale-handles/call-action.txt`).
- **Screenshots:** `cycle-19/scale-handles/scale-drag-{light,dark}.png` (mid-drag, label "50%").
- **Gates:** `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Files outside the pick's list

- `inspector/use-scale-field.ts`: Keep tokens moved to the platform store; the field focuses on the store counter, not on its own K listener (a K from the preview never reaches the main window). Esc in the field also leaves scale mode.
- `canvas/resize-handles-model.ts`: type fields for the scale ghost and down handler.
- `canvas/artboard-overlay.tsx`: one condition hides the spacing overlay while the ghost shows.
- `canvas/scale-handle.tsx`, `canvas/scale-ghost-box.tsx`: new (one component per file).
- `ui/styles/canvas.css`: nw, ne, sw handle and ghost styles.
- `resize-handles-session.ts`: not changed; the scale drag has its own session in `use-scale-drag.ts`.

## Left out

- **Tailwind page** snap was not rechecked in the app; the drag calls the same action as the field (checked in cycle 15).
- **Chat agent**: no change; the agent already has `update_layer_style`.
- **Ghost on compact layers**: the 4 handles overlap on layers under 40 px.

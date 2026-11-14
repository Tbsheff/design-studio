# Cycle 24 pick 3: rotate-handle

Branch `feat/rotate-handle`, cut from `main` at `51c2717e6`.

## What works

- **Rotate zones:** with one layer selected, a 20 px zone just outside each corner (at screen scale) shows a rotate cursor. There is no visible handle. The zones hide while the scale tool (K) is on and during a resize. Text edit hides them, because `.canvas.text-editing` hides the whole resize frame. Canvas frames never get the element resize frame, so they get no zones.
- **Drag:** a drag rotates around the layer center. The bridge live preview shows the turn (`preview-style` with `rotate`), and a label next to the pointer shows the angle. Shift snaps to 15 degree steps. Escape cancels and sends `preview-reset`, so the old look comes back with no write.
- **Write:** release sends one `direct-edit.apply` with `style: { rotate }`, which is one version and one undo step. An optimistic apply holds the new angle until the page reloads.
  - Tailwind: 45 writes `rotate-45`, 17 writes `rotate-[17deg]`, a Shift drag of 50 writes `rotate-45`.
  - HTML/CSS: 30 writes inline `rotate: 30deg`.
- **Transform fix (engine):** a `rotate` write now replaces a rotation that is in `transform`, so the two do not add up. This applies to the canvas drag, the Rotation field and MCP `edit_element`.
  - `[transform:rotate(10deg)]` is removed.
  - `[transform:rotate(10deg)_scale(1.1)]` becomes `[transform:scale(1.1)]`.
  - The v3 `transform` keyword is removed when no translate, scale or skew class needs it.
  - Inline `transform: rotate(10deg)` in an HTML project is removed.
  - During the drag, the preview subtracts the old `transform` angle, so the live view matches the result.
- **Focus:** Enter in the Rotation field commits, then moves focus to the canvas stage. Shift+H then flips the layer at once.

## Checks

- **Canvas drags (playwright-core, headless Chrome):** these ran on a Tailwind HTML page and a CSS HTML page. They covered the cursor at the zone, the live preview, the label, Shift snap, Escape and Cmd+Z (one step). The transform cases were Badge, Pair, Old and Mixed.
- **MCP:** `edit_element {"rotate":"30deg"}` on `[transform:rotate(10deg)]` wrote `rotate-[30deg]`, and the transform class was gone.
- **call-action, `direct-edit.apply`:** `{rotate: "45deg"}` on a `[transform:rotate(10deg)]` layer wrote `rotate-45`. The result was pass, with 0 diffs. MCP and the agent are skipped because their bindings are legacy and off, so only HTTP ran.
- **Gates:** `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59610 diagnostics, baseline 89733). `pnpm run build:ui` passes.
- **Screenshots:** `cycle-24/rotate-handle/drag-{dark,light}.png` show a drag with the angle label.

## Left out

- **Multi-select flip:** Shift+H and Shift+V with several layers selected are not done. The flip keys and `toFlippedScale` are in `inspector/use-rotation.ts` and `inspector/flip-model.ts`, which are not this pick's files.
- **Mixed transform with other classes:** when a layer has `[transform:rotate(..)_scale(..)]` plus a `translate-*`, `scale-*` or `skew-*` class, the transform class stays, so the rotations still add up. The planner puts every `[transform:..]` and `translate-*` class in one class group, so rewriting the class would delete `translate-x-2`. A fix needs `plan.ts` or `classes.ts`, which no pick may edit.
- **Other places:** the transform fix does not cover rotations in JSX `style={{ transform }}` objects, stylesheet rules, or breakpoint and state (`variant`) writes.
- **Locked layer:** the zones have no lock check, because `SelectionContext` has no lock flag. Canvas clicks do not select a locked layer.
- **Variant:** the drag always writes the base style. It does not use the inspector's breakpoint or state choice (`editVariantStore` is in the inspector feature).
- **Ask chip:** on small layers, the "Ask" chip can cover the top-right zone. The other 3 corners still work.
- **Shared files outside the spec list:**
  - `canvas/resize-handles-model.ts` and `canvas/use-resize-handles.ts`: these wire the hook.
  - `styles/canvas.css`: the zone, label and cursor styles, plus `element-rotating` in the frame pointer-events rule.
  - `direct-edit/engine/tailwind/index.ts` and `direct-edit/engine/html.ts`: one call each.

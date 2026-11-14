# Cycle 25 pick 5: multi-rotate

Branch `feat/multi-rotate`, cut from `main` at `1d65d2f1e`. UI only: no action, no server, no bridge change.

## What works

- **Flip:** with several layers selected, Shift+H and Shift+V flip each layer. The layer menu flip items and the Cmd+K flip commands do the same. Each layer flips its own `scale`, so mixed scales stay correct. All layers go in one `direct-edit.apply` batch: one version and one undo step.
- **Rotation field:** the multi editor shows a Rotation section when any layer is rotated, the values differ, or the user opens it with "Rotate…" (layer menu or Cmd+K). Differing values show "Mixed". Typing 15 and Enter writes 15 degrees on each layer in one batch, and Enter moves focus to the stage, so Shift+H works at once.
- **Rotate zones:** the 4 hover zones show just outside the corners of the multi-selection box. A drag turns each layer by the same delta around its own center. The label shows the delta. Shift snaps the delta to 15 degrees. Escape writes nothing. Release sends one batch write for all layers.
- **Single layer:** the old single path still sends one `direct-edit.apply` with `style: { rotate }`.
- **Fix:** "Rotate…" now selects the field text after the focus, so typed digits replace the value. Before, they were added after `0deg`.

## Checks

- **UI, Tailwind HTML page with 3 `size-6` svg icons (playwright-core):**
  - Shift+H gave `-scale-x-100` on all 3. A second Shift+H removed it from all 3. One Cmd+Z undid all 3. Shift+V gave `-scale-y-100` on all 3.
  - With one icon at `rotate-45`, the field showed "Mixed". 15 and Enter wrote `rotate-[15deg]` on all 3. Shift+H then flipped all 3. Two Cmd+Z restored the start.
  - A Shift drag of about 28 degrees: the label showed 30°, and the preview was 75, 30 and 30 degrees. Escape: 0 writes. Release: 1 write with 3 edits (`rotate-[75deg]`, `rotate-[30deg]`, `rotate-[30deg]`). One Cmd+Z undid it.
- **UI, CSS HTML page:** the drag wrote inline `rotate: 30deg` on each icon. The layer menu flip wrote `scale: -1 1` on each. "Rotate…", 15 and Enter wrote `rotate: 15deg` on each.
- **call-action, `direct-edit.apply` with 3 `rotate: 45deg` edits:** pass, 0 diffs. Each icon got `rotate-45`. MCP and the agent are skipped because their bindings are legacy and off.
- **MCP `batch_edit`** with 3 `scale: "-1 1"` edits wrote `-scale-x-100` on each icon.
- **Gates:** `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59604 diagnostics, baseline 89733). `pnpm run build:ui` passes.
- **Screenshots:** `cycle-25/multi-rotate/mixed-{dark,light}.png` show the multi editor with Mixed. `drag-{dark,light}.png` show a group drag with the 30° label.

## Left out

- **Group rotate around one center** (true Figma): each layer turns around its own center. A shared center also needs a move. This is runner-up 3.
- **Tailwind 15:** the engine writes `rotate-[15deg]`, not `rotate-15`. The engine maps only the v3 scale values (45 becomes `rotate-45`). This is engine behavior from cycle 24, outside this pick's files.
- **Field place:** the Rotation section sits after Border in the multi editor. To put it under Layout, as in the single editor, `simple-sections.tsx` and the layout rows must change for a null selection.
- **Flip errors:** a failed multi flip shows the optimistic failure on the canvas. It does not set the editor error line, because the flip does not go through the multi edit draft (the draft holds one value for all layers).
- **Cross-frame selections:** a selection lives in one frame, so there is no extra check. Locked layers cannot be selected, so they have no extra check either.
- **Chat agent and real-model runs:** none. The agent and MCP use the existing batch edit tools, and the spec asks for no real runs for this pick.
- **New files:** `inspector/use-multi-rotation.ts`, `inspector/multi-rotation-field.tsx` and `canvas/group-rotate-frame.tsx`. `inspector/{multi-fieldset,simple-multi-body}.tsx` and `canvas/{artboard-overlay.tsx,use-resize-handles.ts}` also changed to wire them. `bridge/keyboard.ts` did not change, because forwarded Shift+H already reaches the multi editor.

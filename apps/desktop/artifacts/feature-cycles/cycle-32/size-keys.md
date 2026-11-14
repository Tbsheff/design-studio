# Cycle 32, pick 4: size-keys

Branch `feat/size-keys`. Commits: `f81c7b221` (feature), `dae3ab53c` (lint fix), and this report.

## What works

- **Resize keys.** `Mod+Arrow` changes width (→ ←) or height (↓ ↑) by 1 px. `Mod+Shift+Arrow` changes it by 10 px. The base is the measured size of each layer. The write is the W/H field "fixed" patch (`toSizePatch`), so a fill or auto layer gets a fixed size.
- **Tailwind.** When the layer has a `w-*`, `h-*` or `size-*` class, each press steps the default spacing scale (`Mod+Shift`: 4 steps). The step reuses `toScaleStep` from the type keys. Off the scale, the key adds 1 px or 10 px, and the server writes an arbitrary class.
- **Key repeat.** A held key makes one version, the same as nudge (300 ms burst).
- **Multi-select.** Each selected layer resizes from its own size, in one batch request and one version.
- **Toast.** A frame root, or a layer with no single source site, gets no change and a toast with the reason.
- **Select siblings.** `Mod+A` with a layer selected selects all layers in its parent. With nothing selected, `Mod+A` selects all frames, as before. This works with the focus on the canvas and with the focus in the frame.
- **Shortcut sheet.** Both keys show in the sheet only. No palette command, no menu accelerator.

## Checks in the running app

HTML prototype (mock agent, `STUDIO_DATA_DIR=ds-wt/size-keys-data`, port 5990):

- Passes: select a card, `Mod+Right` 3 times → 203 px. `Mod+Shift+Down` → height 130 px. That is 4 versions, and 4 `Mod+Z` presses restore the card.
- Passes: holding `Mod+Right` for 10 repeats → +10 px, 1 request.
- Passes: 3 selected cards, `Mod+Right` → each +1 px from its own width (211, 201, 201). `Mod+Down` → each +1 px height.
- Passes: `Mod+A` on list item "Two" → "5 elements". `Esc`, then `Mod+A` → the frame is selected.
- Passes: with the focus in the iframe, `Mod+Right` resizes and `Mod+A` selects the 3 cards.
- Passes: frame root (`html`) → toast "This layer is the frame root…", no request.

Tailwind fake app `ds-wt/sk-next` (a copy of `pp-next-tw`, Next 16, Tailwind 4), attached app canvas:

- Passes: `w-60` card, `Mod+Right` → `w-64` in `app/page.jsx`.
- Passes: `Mod+Down` → `h-32` to `h-36`. `Mod+Shift+Left` → `w-64` to `w-48`.
- Passes: MCP `edit_element` with `width: 256px` on the other `w-60` card → `w-64`. This is the same source diff as the key (see `cycle-32/size-keys/mcp-edit-element.txt`).

The route copy (`create_prototype_project` with `routePath`) writes plain CSS classes (`s1`…`s5`), not Tailwind classes. So I checked the Tailwind path on the attached app canvas, not on a route copy.

`scripts/call-action.ts direct-edit.apply` with a width edit: http passes. The MCP and agent legs are skipped because they are `legacy-mcp` and `legacy-agent` (see `cycle-32/size-keys/call-action-direct-edit.txt`). There is no new action.

Screenshots in `cycle-32/size-keys/`, dark and light:

- `toast-*.png`
- `multi-resize-*.png`
- `shortcut-sheet-*.png`

Gates, run once at the end:

- Passes: `pnpm run typecheck`
- Passes: `pnpm run build:ui`
- Passes: `pnpm run lint:gate`, with 59619 diagnostics against a baseline of 89733.

## Files outside the pick's list

- `packages/common/contracts/src/contracts.ts`: added `"siblings"` to `SelectMove`. The parent needs a parent → bridge message, and that union lives here, not in `bridge-protocol.ts`.
- `src/shared/keymap-edit.ts`: has the 2 keymap rows. `keymap.ts` is over 500 lines, so `studio/no-file-growth` blocks rows there. `EDIT_KEYS` is spread into `KEYMAP`, so `KeyId` gets both ids.
- `src/ui/features/canvas/use-canvas-wiring.tsx`: wires `selectSiblings`.
- `src/ui/features/inspector/edit-keys-model.ts`: exports `toScaleStep`.
- `src/ui/features/inspector/use-element-nudge.ts`: mounts `useSizeKeys`. The hook needs the nudge options and the toast. A new import from `canvas/use-canvas-edits.ts` through `inspector/index.ts` made an import cycle (TDZ error at boot).

## Left out

- **Kept app text.** No selection field marks kept text, so there is no toast for that case.
- **Frame root.** The rule is `html` or `body`, or a direct child of `body` at frame origin 0,0. This is a heuristic.
- **Tailwind detection.** It reads the layer's own `w-*`, `h-*` or `size-*` class. A Tailwind layer with no size class steps by px and gets an arbitrary class.
- **Real-model run.** None was needed, and none was done.

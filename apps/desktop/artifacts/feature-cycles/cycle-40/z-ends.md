# Cycle 40 pick 4: z-ends

Branch `feat/z-ends`. `Mod+Shift+]` brings the selected layer to the front of the siblings that overlap it. `Mod+Shift+[` sends it to the back. Both keys write `zIndex` (and `position: relative` when needed) through `set_stacking`. Neither key moves the element in the DOM.

## What changed

- **Added** 2 bindings, `bring-to-front` (`Mod+Shift+]`) and `send-to-back` (`Mod+Shift+[`), in the Selection group of `shared/keymap-edit.ts`.
- **Added** 2 `AppKey` members, `layer-front` and `layer-back`, and `LAYER_SHIFT_APP_KEYS` beside `LAYER_APP_KEYS` in `contracts.ts`. `layerAppKeyOf` now reads the Shift map when Shift is down. `Mod+Alt+]` and `Mod+Alt+[` stay next and previous direction.
- **Added** `toFrontPlan` and `toBackPlan` in `ui/features/stacking/z-order-model.ts` (pure). A plan now holds a list of writes.
  - Front: the layer takes the z of the top overlapping sibling, or that z + 1 when equal z does not pass it.
  - Back: the layer takes z 0. Each overlapping sibling that would still paint under it at z 0 gets z 1. A layer already at z 0 writes only the raises.
- **Changed** `use-stacking-keys.ts`: 2 new step keys, a write loop (`runWrites`), and a paint-order sort for a multi-selection (front: lowest first; back: highest first), so the selection keeps its order among itself.
- **Added** the canvas menu items "Bring to front" and "Send to back" after the cycle-39 items (`preview-menu-create.ts`, `canvas/copy.ts`), the 2 keys in `stacking-key-events.ts` and `preview-app-keys.ts`, and the 2 no-overlap toasts in `stacking/copy.ts`.

Files outside the pick list: none.

## Differences from the spec

- **Versions for Send to back.** The spec asks for 1 version, using the pick 1 list input on `stacking.set`. That input is not on `main` yet, and pick 1 owns the `stacking.set` files. So Back with a raise sends 1 `set_stacking` call per raised sibling plus 1 for the layer, in order. Each call is 1 version and needs 1 Cmd+Z. Front is always 1 version. After the rebase on polish-40, `runWrites` becomes 1 list call.
- **Multi-selection.** Each selected layer is 1 or more calls, as in cycle 39. Pick 1 changes this to 1 call.

## Checked in the running app

Server on port 7440, `STUDIO_AGENT=mock`, data at `ds-wt/z-ends-data`. HTML project `ds-wt/ze-projects/z-ends` (seeded by `ds-wt/ze-seed.mjs`): 4 absolute cards (z auto, 1, 2, auto) and a paragraph. Driven with playwright-core (`ds-wt/ze-drive.mjs`). The paint check reads computed z and `elementFromPoint` at 4 overlap points.

| Check | Result |
|---|---|
| Card 1, `Mod+Shift+]` | Passes: 1 call, `zIndex 3`. Card 1 paints over cards 2 and 3. Boxes do not move. 1 Cmd+Z restores |
| Card 3, `Mod+Shift+[` | Passes: card 1 gets z 1, card 3 gets z 0, under all 3. 2 calls, 2 Cmd+Z restore (see Differences) |
| Card 4, `Mod+Shift+[` from the preview frame | Passes: cards 1 and 2 get z 1, card 4 gets z 0. 3 calls, 3 Cmd+Z restore |
| Card 2, `Mod+Shift+]` from the preview frame | Passes: `zIndex 3`. A second press: "Already in front", 0 writes |
| Card 4, canvas menu Send to back when it is already lowest | Passes: "Already at the back", 0 writes |
| Card 4, canvas menu Bring to front | Passes: `zIndex 3`, later in the DOM than card 2 at z 3, so it paints on top |
| Card 1, `Mod+Shift+]` with focus on its Layers panel row | Passes: 1 call, 1 Cmd+Z restores |
| Paragraph, `Mod+Shift+]` | Passes: "No layer overlaps this one. Use Alt+↑ to move it in the list.", 0 writes |
| Cards 1 and 2 selected, `Mod+Shift+]` | Passes: card 1 z 4, then card 2 z 4. Card 2 stays over card 1 |
| Cards 1 and 2 selected, `Mod+Shift+[` | Passes: card 2 z 0, then card 1 z 0. Card 2 stays over card 1, both under cards 3 and 4 |
| Key in the chat composer | Passes: 0 writes |
| Shortcuts sheet and canvas menu show both keys | Passes, dark and light |

Not run: the packed app. `desktop/` sets no `tabbingIdentifier` and no `allowsAutomaticWindowTabbing`, and `desktop/menu.ts` has no bracket accelerator. Native macOS window tabs use `Ctrl+Tab`. A packed-app press of `Cmd+Shift+]` is a manual check for Tyler.

## Headless

No new action. `pnpm exec tsx scripts/call-action.ts stacking.set '<json>' --port 7440` (paragraph, `zIndex 3`): HTTP wrote the value; MCP and the agent then gave "The layer already has these stacking values." This is the known missing reset between surfaces (pick 1). `stacking.get`: pass, 3 surfaces, 0 diffs. `get_stacking` and `set_stacking` serve MCP and the agent.

## Gates

- `pnpm run typecheck`: 0 errors.
- `pnpm run lint:gate`: pass, 59,623 (baseline 89,733).
- `pnpm run build:ui`: pass. `check-bundle`: B1 274,703 B, delta 0.
- `check-actions.ts --probes`: text scan 560 hits (baseline 410), the same count as main in the spec; probes pass; ops fail as on main. This branch changes no server file.
- N12 union grep: the 2 `Partial<Record<AppKey, ...>>` maps in `preview-app-keys.ts` (`TOOL_OF_KEY`, `COMMAND_OF_KEY`) need no entry. The new keys go through `STACKING_APP_KEYS`.
- MCP snapshots: no change.

## Notes

- **Left out**: 1 version for Send to back with a raise and for a multi-selection. Both wait on the polish-40 list input.
- **Screenshots**: `cycle-40/z-ends/{menu,shortcuts}-{dark,light}.png`.

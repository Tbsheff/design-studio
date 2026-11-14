# Cycle 38 pick 4: copy-props

Branch `feat/copy-props`. `Mod+Alt+C` copies the style of the selected layer. `Mod+Alt+V` pastes it on all selected layers.

## What changed

- **Added** 2 bindings, `copy-style` and `paste-style`, in the Edit group. They are in `shared/keymap-edit.ts`, which `KEYMAP` spreads. They are not in `keymap.ts` because that file has 492 lines and 2 more bindings would take it over 500.
- **Added** 2 `AppKey` members, `style-copy` and `style-paste`, in `contracts.ts`. `appKeyOf` matches them when Mod and Alt are down, Shift is up and the target is not a typing target. The bridge (`zoom-forward.ts`) needs no change.
- **Added** `ui/features/layer-style/use-layer-style-keys.ts`. It handles keydown in the shell and the `studio:layer-style-key` event that a key from the frame sends. It runs the existing menu items (`items(target)`), so the copy, the blocker text and `apply(null)` are the same code as the menu.
- **Added** `keyId` to the Copy style and Paste style menu items, so the canvas menu shows `⌥⌘C` and `⌥⌘V`.
- **Called** the hook from `use-preview-menu.tsx` (496 lines).

Files outside the pick list (no other pick owns them): `shared/keymap-edit.ts`, `ui/domain/layer-style-key-events.ts` (new), `ui/features/canvas/preview-app-keys.ts`, `ui/features/canvas/use-preview-frames.ts` (1 condition and the import), `ui/features/layer-style/{deps,index,use-layer-style-host}.ts`.

A frame key cannot use a command id: the boundaries rule blocks `layer-style` from importing `commands`. The frame key goes through a window event, as copy PNG does.

## Checked in the running app

Server on port 6930, `STUDIO_AGENT=mock`, HTML fixture `ds-wt/kp-seed` (2 cards). Driven with playwright-core (`ds-wt/kp-drive.mjs`).

| Check | Result |
|---|---|
| Copy h2 of card 1, then paste on h2 of card 2 and its button (focus in shell) | Passes: 1 `layer-style/apply` call, 1 version "Edit 2 elements" |
| Same with focus in the preview frame (parent saw no C or V keydown) | Passes: 1 apply, 1 version |
| Cmd+Z after the paste | Passes: source is back, an "Undo" version |
| Paste with focus on a Layers panel row | Passes: 1 apply |
| Toast after copy | Shows "Style copied" (the existing text; the spec's "Copied style of h2" is not the existing text) |
| Paste with no copied style | Shows "Copy a style first", no apply |
| Key in the chat composer, in an inspector input, in a text edit, in a range selection | Does nothing: 0 apply |
| Shortcuts sheet and canvas menu show both keys | Passes, dark and light |
| B1 Home bytes | 274,703 B, delta 0 |

Not run: the packed app. No `desktop/menu.ts` accelerator uses these keys, so the menu cannot take them.

## Gates

`pnpm run typecheck` 0 errors. `pnpm run lint:gate` passes. `pnpm run build:ui` and `check-bundle` pass. The N12 union grep finds only 2 `Partial<Record<AppKey, ...>>` maps, which need no new entry.

## Notes

- **Headless**: no new action. `get_layer_style` and `apply_layer_style` cover MCP and the agent, so no `call-action.ts` run.
- **Appendix A**: `.claude/goal/` is missing in the worktree, so no `roadmap.md` entry was added.
- **Screenshots**: `cycle-38/copy-props/{shortcuts,menu}-{dark,light}.png`.

# Cycle 39 pick 3: z-keys

Branch `feat/z-keys`. `Mod+]` brings the selected layer forward. `Mod+[` sends it backward. Both keys write `zIndex` (and `position: relative` when needed) through `set_stacking`. Neither key moves the element in the DOM, so the layout does not change.

## What changed

- **Added** 2 bindings, `bring-forward` (`Mod+]`) and `send-backward` (`Mod+[`), in the Selection group of `shared/keymap-edit.ts`.
- **Added** 2 `AppKey` members, `layer-forward` and `layer-backward`, in `contracts.ts`. `appKeyOf` matches `BracketRight` and `BracketLeft` with Mod down, Shift up and no typing target. `Mod+Alt+]` and `Mod+Alt+[` stay next and previous direction.
- **Added** `StackPeer` and `SelectionStack` types and an optional `stack` field on `SelectionContext` in `contracts.ts`, and an optional `hasStack` flag on the `describe-anchors` message.
- **Added** `bridge/stack-peers.ts`. It reads the layer and its overlapping element siblings (rect, computed z, position, flex or grid parent, opacity, transform or filter), max 8 peers. `bridge/message-handlers.ts` adds this read to the `describe-anchors` reply only when `hasStack` is true.
- **Added** `ui/features/stacking/z-order-model.ts` (pure). Paint order is (z, tier, DOM index). Tier 1 is positioned, a flex or grid item with a z, or a layer with opacity, transform or filter. Forward writes the smallest z that passes the nearest overlapping layer above. Backward writes the largest z (never below 0) that goes under the nearest overlapping layer below. When no such z exists, it raises that sibling to the layer's z + 1. A static layer in a parent that is not flex or grid also gets `position: relative`.
- **Added** `ui/features/stacking/{use-stacking-keys.ts,z-order-read.ts}`. The hook handles keydown in the shell and the `studio:stacking-key` window event (from the frame and the menu). At each press it reads the stack fresh through `describe-anchors`, so a second press sees the new z. It writes with `useTransition`. A multi-selection moves each layer one step, in source order.
- **Added** `ui/domain/stacking-key-events.ts`, `runPreviewStackingKey` in `ui/features/canvas/preview-app-keys.ts`, and one condition in `ui/features/canvas/use-preview-frames.ts`.
- **Added** Bring forward and Send backward to the canvas menu (`ui/features/canvas/preview-menu-create.ts`, before Flip), with `⌘]` and `⌘[`.
- **Called** `useStackingKeys` from `use-preview-menu.tsx` (492 lines).
- **Moved** the "Show in layers" item to `preview-menu-create.ts` (same code). The new stacking import made 21 imports in `use-preview-menu.tsx`, over the `import/max-dependencies` limit of 20 in a budget-0 folder.
- **Changed** `stacking/index.ts` to import then export. The plain `export ... from` form made the new import a `react-doctor/no-barrel-import` hit. A lazy `StackingSlot` in the index broke the inspector: React error 306, because `inspector-slots.ts` already loads the index lazily.

Files outside the pick list (no other pick owns them): `bridge/message-handlers.ts`, new `bridge/stack-peers.ts` (the bridge read file for the sibling rects), `ui/features/canvas/{use-preview-frames.ts,copy.ts,preview-menu-create.ts}`, `ui/features/stacking/{stacking-api.ts,z-order-read.ts}`.

## Differences from the spec

- **Fresh read at key time.** The spec puts the sibling rects in the selection message. Hover also sends that message. And after a write the snapshot is stale, so a second press would compute the same write. The read goes through the existing `describe-anchors` request with `hasStack: true`. It runs only on a key press.
- **Backward rule.** The spec says "that z − 1 when the layer is earlier in the DOM, else that z". That order is inverted: at equal z, the later element paints on top. The model tries each candidate z and keeps the one that makes the layer paint under the sibling.
- **Sibling raise.** The first avatar gets z 1 (layer z + 1), as the spec says.
- **One version.** One layer is always 1 `set_stacking` write, so Cmd+Z undoes it in one step. The spec's 2-write case does not happen: the sibling raise replaces the layer write. A multi-selection makes 1 history step per layer, so it needs 1 Cmd+Z per layer. One step for all layers needs `direct-edit` batch support for `z-index`. `DIRECT_STYLE_PROPERTIES` feeds the `direct-edit-element.json` MCP snapshot, so I did not add it.

## Checked in the running app

Server on port 7040, `STUDIO_AGENT=mock`, data at `ds-wt/z-keys-data`. HTML fixture `ds-wt/zk-seed`: a card with an absolute badge before a relative photo, a flex row of 2 avatars (the second has `margin-left: -16px`) and a paragraph. Driven with playwright-core (`ds-wt/zk-drive.mjs`).

| Check | Result |
|---|---|
| Badge (selected with Shift+Tab from the photo), `Mod+]` in the shell | Passes: 1 `set_stacking` call with `zIndex 1`. The badge paints over the photo. Badge and photo boxes do not change |
| Second avatar, `Mod+[`, then `Mod+[` again 1.2 s later in the same session | Passes: 1 write, then "Already at the back". The fresh read sees the new z |
| Second avatar, `Mod+[` twice 300 ms apart | Passes: 1 write. No second write and no "already has these stacking values" error |
| Photo, `Mod+]` | Passes: "Already in front", 0 writes |
| Photo, `Mod+[` | Passes: the badge gets z 1, the photo is under it |
| Photo with `position` removed, `Mod+]` | Passes: `zIndex 0` and `position: relative` in 1 write. The box does not change |
| Second avatar, `Mod+[` with focus in the preview frame (the parent saw no keydown) | Passes: the first avatar gets z 1 and paints on top |
| Second avatar, `Mod+[` with focus on its Layers panel row | Passes: 1 write |
| Canvas menu Send backward on the second avatar | Passes: 1 write |
| Paragraph, `Mod+]` | Passes: "No layer overlaps this one. Use Alt+↑ to move it in the list.", 0 writes |
| Photo and second avatar selected, `Mod+[` | Passes: 2 writes, each layer 1 step. Needs 2 Cmd+Z |
| Cmd+Z after each write | Passes: the old paint order comes back |
| Key in the chat composer, the inspector Width input, a text edit | Passes: 0 writes |
| Inspector "Scroll and stacking" section after the index change | Passes: it shows |
| Shortcuts sheet and canvas menu show both keys | Passes, dark and light |

Not run: the packed app. No `desktop/menu.ts` item uses a bracket key, and `desktop/` has no back navigation, so Electron has no action for `Mod+[`.

## Headless

No new action. MCP `set_stacking` on the paragraph (`zIndex 3`) gives the same output fields as HTTP (`mode css`, `style {"z-index":"3"}`, `title`, `versionId`). `pnpm exec tsx scripts/call-action.ts stacking.set '<json>' --port 7040` ran 3 surfaces. HTTP wrote the value. MCP and the agent then gave the same "The layer already has these stacking values." text. A second run gave this same message on all 3 surfaces. The script has no reset between surfaces, so a write gives a diff after the first surface. `get_stacking` and `set_stacking` already serve the chat agent.

## Gates

`pnpm run typecheck` 0 errors. `pnpm run lint:gate` passes (59,623, baseline 89,733). `pnpm run build:ui` passes. `check-bundle` B1 274,703 B, delta 0. `gen-routes.ts --check` passes. `pnpm run typecheck:tsrs` passes. `pnpm run check:scripts` fails on main too. Its hits (E1 hand-written routes in `server/http/app-*-routes.ts`, S11 in `server/events/event-file.ts`) are in server files that this branch does not change. The N12 grep finds only the 2 `Partial<Record<AppKey, ...>>` maps in `preview-app-keys.ts`. Neither needs an entry.

## Notes

- **Appendix A**: `.claude/goal/` is missing in the worktree, so I added no `roadmap.md` entry.
- **Left out**: Bring to front and Send to back (runner-up 4). One history step for a multi-selection.
- **Screenshots**: `cycle-39/z-keys/{shortcuts,menu}-{dark,light}.png`.

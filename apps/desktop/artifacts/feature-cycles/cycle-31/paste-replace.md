# Cycle 31 pick 4: paste-replace

Branch `feat/paste-replace`.

## Commits

- `4b55cbe59` feat(direct-edit): replace many slots with copies in one version
- `c48dd3c5f` feat(layers): Mod+Shift+R pastes to replace, second Mod+V pastes beside
- `66b20e4c8` fix(desktop): move force reload to CmdOrCtrl+Alt+Shift+R
- `08f1263df` fix(layers): paste on the copied layer duplicates it beside itself

## What changed

- **Server.** A structure edit takes an optional `replace` list with `op: "duplicate"`. Each slot gets a copy of the targets at its own place in its parent. All slots are one version and one undo step. The plan is in the new `direct-edit/engine/slot-replace.ts`; `structure-ops.ts` only exports 6 helpers and does not grow (741 lines).
- **UI.** `Mod+Shift+R` (`layer-paste-replace`, group Selection) sends one `direct-edit.apply` with `op: "duplicate"`, `targets` = the copied layers, `replace` = the selected layers. Toasts: "Copy a layer first", "The design changed after the copy", "only in the file of the copied layers". The server refuses a frame root, a fixed element and a slot that holds the copy, and the toast shows its reason.
- **Second paste.** `Mod+V` on the copied layer sends a plain duplicate (the copy goes after it). `Mod+V` on the layer that the last paste made, or on a leaf, inserts the clipboard markup after it (`insert_jsx` position after). `Mod+V` on a picked container still pastes inside.
- **Contracts.** `StructureEditRequest.replace` added. `StructureKey` is now `Exclude<StructureOp, "move" | "clear"> | "cut" | "copy" | "paste" | "paste-replace"`, so `contracts.ts` went from 2646 to 2644 lines.
- **Menu.** `forceReload` is on `CmdOrCtrl+Alt+Shift+R`. Plain reload keeps its default key.

## MCP

- `batch_edit` cannot hold structure ops (its description says so), so the MCP path is `edit_element`.
- **Schema change.** `edit_element` has a new optional field `replace: [{selector}]` (1 to 49 items, only with `op: "duplicate"`). Snapshot `artifacts/mcp-snapshots/direct-edit-element.json` got only that field. No other tool changed. The agent `edit_element` (`agent/direct-tools.ts`) is not changed.

## Checked in the running app

HTML project, built UI served by the dev server on a free port, data dir `ds-wt/paste-replace-data`.

| Check | Result |
|---|---|
| Copy card, select 3 slots, `Mod+Shift+R` | Passes: 3 cards in the 3 slots, one version "Replace 3 elements with div" |
| One `Mod+Z` | Passes: file equal to before, 3 slots back |
| 1 slot, `Mod+Shift+R`, `Mod+Z` | Passes: one version, undo restores |
| MCP `edit_element` `{selector:"#card", op:"duplicate", replace:[3 slots]}` | Passes: same file bytes as the UI run, one version |
| Copy button, paste, paste | Passes: 3 buttons side by side in one parent, not nested |
| Select a section, paste | Passes: the copy goes inside it |
| No copy, `Mod+Shift+R` | Passes: toast "Copy a layer first. Then select the layers to replace." |
| Shortcut sheet filter "paste" | Passes: row "Paste to replace selection ⇧⌘R" |

Screenshots in `cycle-31/paste-replace/`: `toast-copy-first-{dark,light}.jpg`, `shortcut-sheet-{dark,light}.jpg`, `second-paste-beside-dark.jpg`.

Gates at the end: `pnpm run typecheck` passes, `pnpm run lint:gate` passes (59619, baseline 89733), `pnpm run build:ui` passes. `pnpm run check:scripts` fails on old check-actions items (E1 hand routes, O12, E16) in files this pick does not touch.

## Test notes

- The Browser pane blocks the clipboard. For the second-paste check, a page-level in-memory `navigator.clipboard` stub stood in for the Electron clipboard.
- The Browser pane does not deliver `Cmd+C` and `Cmd+V` to the page, so copy and paste ran from the layer menu (same `structureKey` path). `Cmd+Shift+R` and `Cmd+Z` ran as keys.
- The canvas iframe is CSS-scaled, so selection ran from the Layers panel.

## Left out

- **Skipped: Tailwind JSX route check.** No attached app in this run. The engine path is the same as for HTML.
- **Not added: Cmd+K row.** Copy, cut and paste have no Cmd+K rows either. The key shows in the shortcut sheet, which opens from Cmd+K.
- **Selects first copy only.** After a replace, only the first new layer is selected (the existing `settleStructure` behaviour).
- **Refuses after a change.** `Mod+Shift+R` after any new version asks to copy again, because the copied source places can move.
- **Not checked: kept app text refusal.** No attached app in this run.

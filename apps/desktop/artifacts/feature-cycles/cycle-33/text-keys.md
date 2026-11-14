# Cycle 33, pick 4: text-keys

Branch `feat/text-keys`. Commits: `4895af265` (feature) and this report.

## What works

- **Keys.** `Mod+B` bold, `Mod+U` underline, `Mod+Shift+X` strikethrough, `Mod+Alt+L`, `T`, `R`, `J` align left, center, right, justify. They act on the text layers in the selection (a layer with text content).
- **Bold rule.** If every text layer is 600 or more, the key sets 400. Else it sets 700.
- **Line rule.** If every text layer has the line, the key removes it from each. Else it adds it to the layers that do not have it. The other line value stays (`underline line-through`).
- **Write.** The same style edit as the inspector (`font-weight`, `text-decoration-line`, `text-align`), sent in one `direct-edit` batch: one version and one undo step per press, for all selected layers. A held key does not repeat.
- **Focus.** The keys work with the focus on the canvas (parent keydown) and in the frame (the bridge forwards the key id as `arrange-key`).
- **Text edit.** With a collapsed caret, the bridge calls `preventDefault` and the key applies to the whole layer; the open edit and its typed text stay. With a range selected, `Mod+B` keeps the existing inline range bold (`<strong>`, from `text-range.ts`), not a browser `<b>`.
- **Toast.** A selection with no text layer: no change and the toast "Select a text layer first…". A text layer with no source site gets a second toast.
- **Platform.** On Windows and Linux, `Ctrl+Alt+T` stays Tidy up, and align center is not bound. The shortcut sheet row says this.
- **Sheet.** All 7 keys show in the shortcut sheet only. `Mod+I` stays "Ask".

## Checks in the running app

HTML prototype (mock agent, `STUDIO_DATA_DIR=ds-wt/text-keys-data`, port 6090):

- Passes: `h1` (weight 500), `Mod+B` → `font-weight: 700`; again → 400; `Mod+Alt+T` → `text-align: center`; 3 `Mod+Z` presses restore it, one per press.
- Passes: 3 selected labels, `Mod+U` → all 3 underlined in 1 request; `Mod+Shift+X` → `underline line-through`; `Mod+U` → `line-through`.
- Passes: focus in the frame, `Mod+Alt+R` → all 3 `text-align: right`.
- Passes: text edit open, caret at the end, `Mod+B` → `font-weight: 700` on the `h1`, then typed "Z" and Esc → `Text keysZ`, no `<b>`.
- Passes: empty box selected, `Mod+B` → toast, no request.

Tailwind fake app `ds-wt/tk-next` (Next 16, Tailwind 4), attached app canvas:

- Passes: `font-medium` label, `Mod+B` → `font-bold` (one weight class); again → `font-normal`.
- Passes: 3 labels (one with `underline`), `Mod+U` → `underline` added to the other 2, in one request.
- Passes: `h1`, `Mod+Alt+T` → `text-center`; `Mod+Alt+J` → `text-justify` (replaces it).
- Passes: MCP `edit_element` with `font-weight: 700` on the `font-medium` label gives the same diff as the key (`key-source-diff.txt`, `mcp-source-diff.txt`, `mcp-edit-element.txt`).

The Tailwind check used the attached app canvas, not a route copy, because the route copy writes plain CSS classes (as in cycle 32 size-keys).

`scripts/call-action.ts direct-edit.apply` with a `font-weight` edit: http passes; MCP and agent legs are skipped because they are `legacy-mcp` and `legacy-agent` (`call-action-direct-edit.txt`). There is no new action.

Screenshots in `cycle-33/text-keys/`, dark and light: `toast-*.png`, `shortcut-sheet-*.png` (the sheet shot also shows the toast).

Gates, run once at the end: `pnpm run typecheck` passes, `pnpm run lint:gate` passes (59605 diagnostics, baseline 89733), `pnpm run build:ui` passes.

## Files outside the pick's list

- `src/shared/text-keys.ts` (new): maps a key event to a text key id with `matchesKey`. The bridge and the UI both need it, so it is in `shared`, as `resize-step.ts` is for size keys.
- `src/bridge/text-key-forward.ts` (new): the bridge forwarder, so `keyboard.ts` grows by 2 lines only.

No `bridge-protocol.ts` or `contracts.ts` change: the key id goes in the existing `arrange-key` message, and the other `arrange-key` readers ignore ids they do not know.

## Left out

- **Inline ranges.** `Mod+U` and `Mod+Shift+X` with a range selected in a text edit apply to the whole layer. `Mod+B` with a range keeps the existing inline bold.
- **Text layer rule.** A layer counts as text when it has text content, so a card that holds text also takes the keys.
- **Real-model run.** None was needed, and none was done.

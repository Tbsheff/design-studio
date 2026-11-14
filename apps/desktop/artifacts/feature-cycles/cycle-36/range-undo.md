# Cycle 36 pick 2: range-undo

Branch `feat/range-undo`. Mod+Z and Mod+Shift+Z now work inside an open text edit. No new action. No contracts change.

## What works

- **Range mode.** Mod+Z and Mod+Shift+Z post `history-key`. The UI runs the same edit history step as Cmd+Z outside the edit. After the frame reloads, the edit reopens on the same layer with the last range selected.
- **Plain edit.** With typed text that is not sent, Mod+Z is text undo (`execCommand("undo")`, with the default stopped). With no typed text, Mod+Z posts `history-key`, as in range mode.
- **Double-click on a styled word.** A double-click on an inline text child of a mixed layer starts the range edit on the parent line, with the word selected.
- **Headless.** MCP and the agent already have `undo` and `redo` (`version.restoreHistory`, `version.applyHistory`).

## Checked in the running app (mock agent, data `ds-wt/range-undo-data`, port 6520)

HTML prototype, paragraph "Book your first class today and save 20 percent":
- Passes: Enter, select "today", Mod+B, Mod+Z. The bold is gone, the edit stays open and "today" is selected. Mod+Shift+Z brings the bold back.
- Passes: select "save", Mod+U, Mod+Z, Mod+Z. The source is back to the start text, and the edit is still open.
- Passes: plain `h1`. Type "x", Mod+Z removes "x" with no server call. Mod+Z again runs `edit-history/undo`.
- Passes: double-click "today" when it is bold. Range mode opens on the `p` with "today" selected. Typing shows the range notice and changes nothing.

Tailwind fake app `ds-wt/ru-next` (Next 16.4, Tailwind 4, a clone of `fv-next`, attached, route frame `/`):
- Passes: the same bold, undo, redo, underline, undo, undo steps with HMR. The edit stays open on the same range after each step. The plain `h1` steps and the double-click also pass. `next build` passes.

`call-action version.restoreHistory` after 3 `apply_range_text` writes (`ds-wt/ru-call-undo.txt`): the script verdict is `fail, 2 diffs`. All 3 surfaces (http, mcp, agent) ran the same undo, with the same label and state, and the file went back to the start text. Only the per-call version id, `createdAt`, `parentId` and `origin` fields differ.

Screenshots: `cycle-36/range-undo/edit-after-undo-{dark,light}.png` (the open edit after Mod+Z, with "today" selected and the bar shown).

Gates: `pnpm run typecheck`, `pnpm run lint:gate` (59613, baseline 89733) and `pnpm run build:ui` pass. `gen-routes --check` shows no change.

## Files

- `bridge/history-key.ts`: `isHistoryKey`.
- `bridge/text-edit.ts`: the history key branch in `onKeyDown` (451 lines).
- `bridge/text-edit-range-mode.ts`: `toMixedParentOf`, `selectChildText`.
- `bridge/hover-select.ts`: `onDblClick` only.
- `ui/features/text-range/use-text-range-resume.ts`: keeps the last range layer and arms the resume on `history-key`. A frame `ready`, a `text-commit` or an edit end clears the layer, so a later Mod+Z outside an edit does not reopen a closed edit (checked: plain `h1` commit, then Mod+Z and Mod+Shift+Z outside the edit, keep the edit closed).
- `ru-next` is a copy of pick 3's `fv-next`; `fv-next` was not changed. No file outside the pick 2 list changed.
- Not changed: `preview-key-forward.ts`, `use-text-range-apply.ts`, `deps.ts`, `contracts.ts`. The existing `history-key` route was enough.

## Left out

- **Electron menu (not checked).** In the packed app, the Edit menu owns Cmd+Z, and the parent's echo dedupe does not see a keydown in the frame. If the menu still fires after the frame stops the default, a plain edit with typed text gets a history step and loses that text.
- **Redo after text undo.** In a plain edit, after Mod+Z removes all typed text, Mod+Shift+Z runs the history redo, not the browser text redo.
- **A caret with no range.** The edit reopens only when a range was selected in the edit. With only a caret in a plain edit, the edit closes after the history step, as before.
- **Double-click before the first click is in the UI.** A double-click that comes faster than the UI can take the first click's selection does not show the bar until the selection changes. A real double-click (about 200 ms between clicks) shows it. The text-range hooks start to listen only when there is a selection.
- **Fake app canvas.** A newly attached app has no saved frames, so `apply_range_text` cannot find the layer file until a route frame exists (`add_route_frame "/"`). This happens before this pick. It is not part of it.

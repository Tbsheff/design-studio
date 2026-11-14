# Cycle 35, pick 3: mixed-range

Branch `feat/mixed-range`. Commits: `b5ae28ab6` (feature), `6e9e39606` (in-place reload fix), `a273024d6` (stale resume fix), and this report.

## What works

- **Range mode on a mixed layer.** `canEdit` accepts a layer whose element children are all inline text tags (`strong`, `b`, `em`, `i`, `u`, `s`, `a`, `span`, `code`, `mark`, `small`, `sub`, `sup`) with no element inside them. Enter starts the edit in range mode: caret, selection, `Mod+A`, the range bar and the range keys work. `beforeinput`, paste, cut and drop are blocked. An `input` fallback restores the snapshot for IME input. Escape, Enter and blur cancel. Range mode sends no `text-commit`.
- **Notice.** The first blocked input per layer shows: "This line has styled text. Select a range to style it. To change the words, edit one part." It shows in the bar when a range is selected, or as a toast when no range is selected. The UI dedupes it per layer selector.
- **Child target.** A selection inside one inline child targets the child: its selector, its own `data-studio-loc`, and offsets over the child text. `Mod+B` on a word in a `<strong>` sends `isRemove: true` and the tag goes. A selection inside the layer's own text targets the layer. A selection across a child edge sends layer offsets, and the writer refuses with its cross message. No file changes.
- **Edit stays open.** The UI no longer posts `text-edit-stop` before the write.
  - HTML (the frame swaps): on `ready` from the new frame, the UI stops the old edit so the swap can finish. Then it posts `text-edit-resume` with the new frame token and the layer offsets. The bridge starts range mode and selects the same characters.
  - Next (in-place HMR): a `MutationObserver` on the edited layer sees the new elements. The bridge restarts the edit and selects the last range again.
  - In range mode the bridge primes `appSourceFor` on each child, so new children get a source location.
- Plain text layers keep normal typing. One write is one version and one undo step.

## Checks in the running app

HTML prototype (mock agent, port 6490, `STUDIO_DATA_DIR=ds-wt/mixed-range-data`), paragraph "Book your first class today and save 20 percent":

- Passes: Enter, select "today", `Mod+B` gives `<strong>today</strong>`, and the edit stays open with "today" selected. Select "save", `Mod+U` gives `<u>save</u>`, and the edit stays open. Select "today", `Mod+B` sends `isRemove: true` on the child (`index.html:9:49`) and removes the bold. 3 writes.
- Passes: Escape, then 3 `Mod+Z` steps undo the 3 writes, one at a time.
- Passes: type "x" or press Backspace in range mode. The text does not change and the notice shows. Escape closes the edit.
- Passes: a selection across `today| and` refuses with the cross message, and the source does not change.
- Passes: a plain `h1` still takes typed text and commits it.

Tailwind fake app `ds-wt/mx-next` (Next 16, Tailwind 4, attached, route frame `/`):

- Passes: the same 3 steps give `<strong>`, `<span className="underline">`, and then remove the strong. The edit stays open after each HMR write (`cycle-35/mixed-range/app-next-diff.txt`). `next build` passes.

`scripts/call-action.ts text.applyRange` with a child layer target (`index.html:10:41`, the `<em>` in a mixed line): http, mcp and agent all pass with the same output shape. The only diff is `versionId` (`cycle-35/mixed-range/call-action-child.txt`).

Screenshots, dark and light: `cycle-35/mixed-range/edit-open-*.png` (the edit is open after the second write, with "save" selected and the bar shown) and `typing-note-*.png` (the notice after typing).

Gates, run once at the end: `pnpm run typecheck`, `pnpm run lint:gate` (59612 diagnostics, baseline 89733) and `pnpm run build:ui` pass. No real-model run.

## Files outside the pick's list

- `packages/common/contracts/src/contracts.ts`: the bridge unions live here, not in `actions/src/bridge-protocol.ts`.
  - Added `isRangeMode` to `text-edit`.
  - Added `source` and `layer` to `text-range` and `text-range-key`.
  - Added the new `text-edit-blocked` message (also in `CLOUD_BLOCKED_BRIDGE_TYPES`) and `text-edit-resume` with `frameToken`.
  - Added the `TextRangeLayer` type.
- `src/bridge/text-range-target.ts` (new): maps a selection to the layer or one child.
- `src/ui/features/text-range/{use-text-range-resume.ts,use-text-range-notice.ts}` (new), `use-text-range-feed.ts` (clears the reading on `ready`), `text-range-bar.tsx` (notice), `deps.ts`.
- `src/ui/use-inline-text-edit.test.ts`: added the new required `isRangeMode` field so typecheck passes. I wrote no new test.
- `wrap-range.ts` is not changed. The writer handled the child target and the remove path as it is.

## Left out

- **Bar over the text.** With the notice shown, the bar is taller and covers the line below its anchor (`typing-note-*.png`). `toSpot` uses a fixed bar height.
- **Double-click on a styled word** starts a plain edit on the `<strong>` itself, because it has no element children. Typing there is allowed and writes only that child.
- **Nested inline tags** (`<a><strong>x</strong></a>`) are not range mode. The layer stays not editable, as before.
- **Mod+Z inside an open edit** goes to the browser, so it does nothing in range mode. Escape first, then `Mod+Z` undoes the write.
- **Two frames of one page** on the canvas were not checked. A `ready` from the other frame could take the resume token, and then the edit does not reopen.
- **Next child source.** A child gets a source location only after `appSourceFor` resolves. A selection made before that falls back to the layer, and the writer refuses with the cross message.

# Cycle 34, pick 4: range-keys

Branch `feat/range-keys`. Commits: `e768f8d32` (feature) and this report.

## What works

- **Range keys.** In a text edit with a range selected, `Mod+B` wraps the range in `<strong>`, `Mod+U` in `<u>`, `Mod+Shift+X` in `<s>`. Each press is one `text.applyRange` write: one version, one undo step. The bridge calls `preventDefault`, so the browser writes no `<b>` or `<u>`.
- **Toggle.** When the edited layer is already the styled tag (`strong`/`b`, `u`/`ins`, `s`/`del`/`strike`, or a `span` with the `underline` or `line-through` class), the key sends `isRemove: true` and the tag goes.
- **Tailwind JSX.** In a JSX file that uses Tailwind classes, underline and strike write `<span className="underline">` and `<span className="line-through">`. Other JSX and HTML get `<u>` and `<s>`.
- **Caret only.** With no range, the keys still act on the whole layer (text-keys behaviour).
- **Text layer rule.** Outside a text edit, a layer that has a block child (a card with a heading and a paragraph) is not a text layer. The key writes nothing and shows the toast "This layer holds other blocks, not only text...".
- **Headless.** `text.applyRange` (`apply_range_text`) takes `style: "underline"` and `"strike"`. The field description, action description and agent `short` text name them. MCP and the agent use the same tool. The tool is in no MCP snapshot.
- **Sheet.** The 3 shortcut sheet labels say the key acts on the selected range in a text edit. The range bar has no new button. `Mod+I` is not changed.

## Checks in the running app

HTML prototype (mock agent, `STUDIO_DATA_DIR=ds-wt/range-keys-data`, port 6390):

- Passes: 3 lines; Enter, select "one", then `Mod+B`, `Mod+U`, `Mod+Shift+X` → `Bold <strong>one</strong> word here.`, `Underline <u>one</u> ...`, `Strike <s>one</s> ...`.
- Passes: Enter on the line (selects the styled child), Enter again, select "one", same key → `isRemove: true`, tag removed, for all 3.
- Passes: one `Mod+Z` after a removal restores only that step (`<s>` back, the other lines unchanged).
- Passes: caret at the end, `Mod+U` → `text-decoration-line: underline` on the whole `p` (direct-edit, as before).
- Passes: card with heading and text selected, `Mod+B` → toast, no request, no source change.

Tailwind fake app `ds-wt/rk-next` (Next 16, Tailwind 4, imported, route frame `/`):

- Passes: select "one", `Mod+U` → `Underline <span className="underline">one</span> word here.`; Enter on the span, select, `Mod+U` → span removed (`cycle-34/range-keys/app-underline-diff.txt`).

`scripts/call-action.ts text.applyRange` with `style: "strike"`: http, mcp and agent all pass with the same output shape; the only diff is `versionId`, because each leg writes a new version (`cycle-34/range-keys/call-action-strike.txt`). With `text: null`, each leg's offsets apply to the source text after the earlier legs, so legs 2 and 3 wrapped other characters. This is the existing write semantics, not new.

Screenshots in `cycle-34/range-keys/`, dark and light: `range-*.png` (range selected in the frame, range bar shown), `toast-*.png` (card toast).

Gates, run once at the end: `pnpm run typecheck` passes, `pnpm run lint:gate` passes (59609 diagnostics, baseline 89733), `pnpm run build:ui` passes, `gen-routes --check` passes. No real-model run.

## Files outside the pick's list

- `packages/common/contracts/src/contracts.ts`: the `text-range-key` message gets `underline` and `strike` commands and a `className` field (shared type; check on merge).
- `src/bridge/text-range.ts` and `src/bridge/text-key-forward.ts`: the key handling lives here, not in `text-edit.ts` and `keyboard.ts`.
- `src/ui/features/text-range/{text-range-model.ts,use-text-range.ts,use-text-range-feed.ts,use-text-range-actions.ts,use-text-range-apply.ts}`: the key path to `text.applyRange` and the remove rule.
- `src/server/style-scope/text-search/{wrap-range.ts,apply-range.ts}`: the server range writer.
- `src/shared/keymap-edit.ts`: shortcut sheet labels.

## Left out

- **Edit stays open after the write.** The range write ends the text edit (existing `text-edit-stop`), and the frame reloads. To keep it open, the bridge would need to start a new edit on the new element and select the range again.
- **Second range in a styled line.** A text edit starts only on a layer with no element child. When a line has `<strong>one</strong>`, you can style the styled child, but not another word in the same line. A fix needs an edit mode that blocks typing on mixed-content layers, plus a write that targets the child layer.
- **Tailwind detection** checks the file for Tailwind-like `className` strings. It misses a file that uses only `cn(...)` calls.

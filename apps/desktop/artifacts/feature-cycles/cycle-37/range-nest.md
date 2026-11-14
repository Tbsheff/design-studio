# Cycle 37 pick 1: range-nest

Branch `feat/range-nest`. No new action, no tool input change, no UI copy, no Home byte change (B1 294,622 B, delta 0).

## What changed

- **Mixed layer** (`bridge/text-edit-range-mode.ts`): a line is a range-mode layer when its children are `<br>` or inline text tags (`INLINE_TAGS`, display `inline`, `inline-block` or `contents`) nested up to 3 deep. A block child, a flex or grid child, or deeper nesting keeps the plain edit.
- **Snapshot and prime**: `toSnapshot` and the source prime cover every descendant, not only direct children.
- **Offsets**: `<br>` counts as one `\n` in the range offsets and in the reselect walk, so the offsets match `plainText`. `text-edit.ts` stores `original` with `plainText` (one line), so a `<br>` line is not "dirty" at start.
- **Double-click** (`hover-select.ts`): a double-click on a nested inline child opens its mixed line, also when that line is the selected layer.
- **Target** (`text-range-target.ts`, `text-range.ts`): Mod+B, Mod+I, Mod+K, Mod+U and the strike key pick the nearest tag of that style inside the selection, so Mod+B on bold text removes bold. When the inline child has no source (a Next `<Link>` renders an `<a>` with no loc), the reading keeps the line as the layer and reports the child tag, so the bar shows "remove link".
- **Server** (`text-search/apply-range.ts`, `wrap-range.ts`, `range-extent.ts`, new `split-inner.ts`):
  - The layer text includes the text of inline descendants, so a wrap inside `<a><strong>the terms</strong></a>` works on the outer layer.
  - Unwrap finds the styled tag that holds the range (the layer, or the innermost tag of that style inside it), so `text.applyRange` with the line as the layer also works over MCP and the agent.
  - Unwrap closes and reopens the inner tags at the cut points: `<a><strong>the terms</strong></a>` minus the link on "terms" gives `<a><strong>the </strong></a><strong>terms</strong>`. An inner tag with a `{...}` attribute or an `id`, a `{...}` in a JSX cut, or a comment fails with "Remove the inner style first, then this one."
  - `link` style also matches a JSX `<Link>` tag for removal.

## Checked

- HTML prototype (mock agent, `ds-wt/rn-projects/nested-range`): `<p>Read <a href="/terms"><strong>the terms</strong></a> before you book.<br>Classes start at 7 am.</p>`.
  - Range mode opens on double-click. "terms" + Mod+U: `<strong>the <u>terms</u></strong>`; edit stays open; Mod+Z restores it, edit open.
  - "terms" + Link button: `<a href="/terms"><strong>the </strong></a><strong>terms</strong>`; Mod+Z restores.
  - "terms" + Mod+B: `<a href="/terms"><strong>the </strong>terms</a>`; Mod+Z restores.
  - "7 am" + Mod+B: `Classes start at <strong>7 am</strong>.`, `<br>` kept.
  - "terms before" + Mod+B: 400 with the cross message, shown in the bar; source unchanged.
- Tailwind Next app `ds-wt/rn-next` (Next 16.4, Tailwind 4, `<Link href="/terms"><strong>`): the same 5 steps pass with HMR (underline is `<span className="underline">`). `next build` passes.
- `text.applyRange` outer unwrap: `scripts/call-action.ts` (`call-action-unwrap.txt`) runs all 3 surfaces; http writes the balanced markup, then mcp and agent fail because the first call already changed the file (a write is not idempotent). `call-each-html.txt` and `call-each-next.txt` reset the file before each surface: http, mcp and agent write the same source, HTML and JSX.
- Screenshots: `cycle-37/range-nest/range-bar-dark.png`, `range-bar-light.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` (59,624, baseline 89,733), `pnpm run build:ui`, `check-bundle` (B1 delta 0), `gen-routes --check`: pass.

## Left out

- The bar Bold and Italic buttons read the outer child tag (`a`), so Bold on bold text inside a link adds a second `<strong>`. The keys (Mod+B, Mod+I) toggle correctly.
- Nest depth is 3, not 2: after Mod+U inside `<a><strong>`, the line is 3 deep, and depth 2 would close range mode, so Mod+Z in the edit (the spec step) could not run.
- The first double-click after a page load sometimes does not open the edit (also in the range-undo drive); the second does.
- `.claude/goal/roadmap.md` is still missing in the worktree, so Appendix A was not updated.

## Files outside the pick list

- `apps/desktop/src/bridge/text-edit.ts` (1 line: `original: plainText(element)`).
- `apps/desktop/src/server/style-scope/text-search/apply-range.ts` (descendant segments).
- `apps/desktop/src/server/style-scope/text-search/range-extent.ts` (`toStyledExtent`).

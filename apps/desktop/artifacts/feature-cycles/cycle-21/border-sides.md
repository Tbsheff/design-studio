# Cycle 21 pick 2: border-sides

Branch `feat/border-sides`. No new action.

## Changed

- Contracts: new `contracts/src/border-side-properties.ts` holds the border entries and the 4 side widths. `DIRECT_STYLE_PROPERTIES` spreads it at the same place. gen-routes added the `./border-side-properties` export. `contracts.ts` went from 2624 to 2622 lines.
- Engine: border width is now one sided Tailwind group, `border`, with sides t, r, b and l. The new file `direct-edit/engine/tailwind/border-sides.ts` holds the class rule, the width suffix, the CSS edits and the class props. `map.ts` went from 1041 to 1026 lines, and `classes.ts` went from 864 to 847.
  - A side width of 0 is dropped from the side map, unless all 4 sides are 0. So Custom T0 R0 B2 L4 writes `border-b-2 border-l-4`.
  - `keyword-groups.ts` lost its `border` entry. The sided rule now owns bare `border`.
- Bridge: `element-info.ts` sends the 4 computed side widths.
- Inspector:
  - The Border section has a side choice: All, Top, Right, Bottom, Left, Custom. One side or All shows one width field. Custom shows T, R, B and L.
  - The side state comes from the 4 side widths. `hasBorder` uses the widest side, so a `border-b` layer no longer reads as having no border.
  - A side switch is one forced patch: it holds the 4 side widths, plus one style and one color when those are uneven. That makes one undo step, and a CSS project also draws the new side.
  - Remove border sets the side widths to 0 too.
- Friction 14:
  - `toColorHex` now uses `colorHex` when no token UI is present.
  - A half-width color field hides its "Color" label and shows the eyedropper only on hover or focus. The fix is in `inspector-edit.css`, so `oklch(0.15 0 0)` now shows in full.

## Checked

- Tailwind v4 HTML page with `<header class="border-b ...">`:
  - The section opens on Bottom with width 1px.
  - Top, then 2, gives `border-t-2`.
  - Custom B 2, L 4, T 0 gives `border-b-2 border-l-4`.
  - All gives `border`. Bottom gives `border-b` again.
  - Cmd+Z after Top gives back `border-b` in one step.
- CSS project, where `.bar` has `border-bottom: 1px solid`:
  - Top, then 2, gives an inline `border-top-width: 2px`, with the other sides at 0, style `solid` and the color kept.
  - All writes `border-width`. This is the existing CSS-mode inline edit.
- MCP `edit_element` with `{"border-bottom-width":"2px"}` on `border-b` gives `border-b-2` (`cycle-21/border-sides/mcp-edit-element.txt`).
- `call-action.ts state-style.set`, property `border-bottom-width`:
  - HTTP wrote `hover:border-b-2`.
  - MCP and agent decoded the new key and ran the handler. They answered "already has this value", because the action is not idempotent (`call-action-state-style.txt`).
- Live MCP `tools/list`: these tools take the side widths now: `edit_element`, `batch_edit`, `set_breakpoint_style` and `set_state_style`. The snapshot files are not changed. Approve them at merge.
- Bonaparte, read-only, by grep:
  - 300 real `className` strings with `border-b`. Each of the 279 with only `border-b` as a base width moves to `border-t-2` and keeps its other classes.
  - Color classes such as `border-[#eaeaea]` stay border-color.
  - `git status` is unchanged.
- Text with `color: oklch(0.15 0 0)`: the swatch is `#0b0b0b` and the value fits (`text-{dark,light}.png`).
- Screenshots: `cycle-21/border-sides/{bottom,custom}-{dark,light}.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Left out

- The Bonaparte inspector was not opened in a running app, because a local clone has no `node_modules` and no database. The engine was checked on real Bonaparte classes.
- The mock agent edits only a fixed `h1` color, so it cannot send a side width. The agent tool shares the `DIRECT_STYLE_PROPERTIES` schema, and call-action proved the agent surface.
- In a CSS project, All after a side edit writes `border-width` after the old side longhands in the inline style. This is correct, but it leaves extra declarations.
- Custom: setting the last drawn side to 0 removes the border, so the section shows Add border again.
- The `.claude/goal` roadmap is not in the worktree, so no Appendix A glob was added.

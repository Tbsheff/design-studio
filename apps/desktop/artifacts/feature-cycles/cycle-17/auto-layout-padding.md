# Cycle 17 pick 3: auto-layout-padding

Branch `feat/auto-layout-padding`.

## What works

- `layer-style.set` (`set_layer_style`) has a new input field, `padding`: `"auto"` (the default, through `withDecodingDefaultKey`) or `null` (no padding change). The output has a new field, `padding` (the CSS text, or null). No new action.
- The probe also reads the padding box of the parent (inside the border). `engine/to-auto-layout.ts` returns the padding: the space from that box to the bounds of the children on each side, clamped to 0 or more, snapped to 4 px on a Tailwind page.
- CSS page: the parent gets one `padding` shorthand (1 to 4 values) and the 4 `padding-*` sides are cleared. Tailwind page: the 4 sides are written and the class writer joins them (`pt-6 pb-18 pr-34 pl-10`, or `px-10 py-6` when the sides match).
- `inset: null` is in `CLEAR_POSITION`, so an absolute child loses `inset` too. On Tailwind, `inset-0` goes with the `top`..`left` side clear.
- Mixed children (some absolute, some in flow): all children are sorted on the axis and the gap is the median space between neighbours. In-flow children keep their styles.
- The inspector shows "1 layer kept its place" / "N layers kept their place" below the Display row when `skipped` is not empty, with the reasons in `data-tip`. The note clears when the selection changes.

## Checked

- `call-action layer-style.set` on 3 surfaces (HTML page, 3 absolute boxes at 40 px left and 24 px top of a 400 x 160 div, source order C A B): HTTP wrote `display: flex; ... gap: 20px; padding: 24px 140px 76px 40px`, moved 3 children into A B C, with no `position`, `top` or `left` left. MCP and agent ran with no errors and saw the layout that was already there (the 3 imports share one folder).
- `inset: 0 auto auto 0` child: `inset` is gone after the call. 2 absolute boxes and 1 in-flow box: one row, gap 30px (median of 40 and 20).
- Tailwind page (`@tailwindcss/browser`): `flex items-start flex-row gap-4 pt-6 pb-18 pr-34 pl-10`; `absolute`, `inset-0`, `top-6` and `left-*` are gone.
- MCP only (`set_layer_style` through `scripts/stamp/call-mcp.ts`): a frame with a child that a script adds returned `skipped: [{ layerId: "child 3", reason: "This child has no source location ..." }]` and wrote the padding.
- UI: Shift+A on the first frame: the boxes stayed in place and the source got the padding. Shift+A on the frame with the script child: the note "1 layer kept its place" shows, and its tip gives the reason. Cmd+Z restored the old source in one step. Screenshots: `cycle-17/auto-layout-padding/after-dark.jpg` (with the tip), `after-light.jpg`.
- `pnpm run typecheck`, `pnpm run lint:gate` (59685, baseline 89733) and `pnpm run build:ui` pass. `check:actions` fails on old items (S11 in `events/event-file.ts`, E16 legacy names), none in `layer-style`.

## Shared file: `contracts.ts`

The writer does not drop keys: `StyleSchema` in `direct-edit/request/edit-request-schema.ts` rejects any key that is not in `DIRECT_STYLE_PROPERTIES`. So `inset` and the `padding` shorthand cannot go through `parseDirectEditRequest`. `contracts.ts` is not changed. `toPatchedWork` in `layer-layout-files.ts` parses only the listed keys, then adds the other keys (`inset`, `padding`) to the parsed request. The server makes these values (`null` or px), so they skip the value check safely. If the merge step prefers it, add `inset` and `padding` to `DIRECT_STYLE_PROPERTIES` and remove that split.

## Left out

- The `.map()` case is not checked on a React page. The note is checked with a child that has no source location (same `skipped` path).
- A parent with `width: auto` gets a large right padding, and a parent with `box-sizing: content-box` grows by the padding. The test page uses `border-box` and a fixed width. Figma has the same rule for a fixed frame; a hug-width parent is not handled.
- The median gap can move a child by a few px when the old spaces are not equal (the mixed case moved N by 10 px).
- Values of 0 are written as `0px`.
- `artifacts/mcp-snapshots/*.json` is not updated for `set_layer_style` (a merge decision).
- Changed beyond the spec file list: `handlers/layer-style/set.ts` (passes `padding`), `style-scope/layer-style/layer-layout-probe.ts`, `layer-layout-files.ts`, new `layer-layout-padding.ts`, `engine/index.ts` (type exports), `inspector/auto-layout-model.ts` (note text helpers).

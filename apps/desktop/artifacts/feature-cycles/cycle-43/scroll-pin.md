# Cycle 43, pick 2: scroll-pin

Branch `feat/scroll-pin`. The Prototype tab has a "Scroll behavior" section with 3 choices: "Scroll with parent", "Fixed" and "Sticky".

## What works

- **Sticky.** Writes `position: sticky` and `top: 0px`. If the layer already has a `top`, the section keeps it. A "Top (Y)" field sets the offset.
- **Fixed.** Writes `position: fixed` with a top pin. When the layer has no left or right value, it also writes `left: 0` and `right: 0`. A "Top / Bottom" control moves the pin.
- **Scroll with parent.** Writes the `IN_FLOW` patch: it removes `position`, `top`, `right`, `bottom` and `left`.
- **Read.** The section reads the computed `position`. For a fixed layer, it reads the side from the `authored-*` values, because the computed `top` and `bottom` are both set.
- **Absolute layer.** "Scroll with parent" shows as disabled (`aria-disabled`), with the tip "Absolute layers move with their parent. Turn off absolute first."
- **Many layers.** When a selection has mixed values, no choice shows as on. 1 choice writes 1 version for all layers (proved for header + nav). 1 Cmd+Z undoes it.
- **Write path.** Writes go through `useDirectEdits`, then `preview` and `commit`, as `setEdit` does. This is the path that `absolute-toggle` uses. It works for both Tailwind and plain CSS.

## Proof (mock agent, data `ds-wt/scroll-pin-data`, port 7950)

| Check | Result |
|---|---|
| `pin-seed` header: Sticky | 1 version, `style="position: sticky; top: 0px;"`. Cmd+Z restores it. |
| `pin-seed` tab bar: Fixed, then Bottom, then Sticky, Cmd+Z ×2, Scroll with parent | Each step makes 1 version. The source and the pressed state are correct at each step. |
| `pin-next` header (Tailwind): Sticky | Adds `top-0 sticky` to `className`. |
| `.badge` (absolute) | "Scroll with parent" is disabled and has the tip. |
| `edit_element` over MCP, `position: sticky` on nav | The Prototype tab shows "Sticky". |
| Present, Play prototype, iPhone 15 (852 px screen), scrollY 1500 | The header stays at 0–64 px. The fixed nav stays at 795–852 px. |
| Design tab after the Prototype tab | The opacity edit and its undo still work. |

- **`pin-seed` frame height.** The frame is 900 px. The page is 3,112 px.
- **Present with no device.** It scrolls (innerHeight 900, scrollY 1500). The header and the nav stay in place. The canvas frame also scrolls inside its 900 px. So the hint is "Play the frame in Present and scroll to see it." and does not name the device step. Present is unchanged.

Screenshots are in `cycle-43/scroll-pin/`:
- `plain-*`, `plain-panel-*`: the section, dark and light.
- `tip-*`, `tip-panel-*`: the absolute tip, dark and light.
- `tabbar-*`, `multi-*`, `next-*`, `mcp-*`, `present-*`: the other proof steps.

## Gates

- **typecheck.** Passes.
- **lint:gate.** Passes, 59,575 diagnostics (baseline 89,733).
- **build:ui.** Passes.
- **check-bundle.** Passes. B1 is 274,673 B, delta 0. The Home chunk list is the same.
- **check-actions --probes.** 557 hits, the same as `main` at `cd8f2558c`.
- **Actions.** No new action, so there was no `call-action.ts` run.
- **MCP snapshots.** No tool input, output or description changed. No snapshot changed.

## Left out

- **`z-index: 10` on Fixed.** `z-index` is not in `DIRECT_STYLE_PROPERTIES` (`contracts.ts`). `edit_element` drops it, and no pick may edit `contracts.ts`. `set_stacking` can write `z-10`, but its `others` field takes no `top` or `bottom`, so one version for many layers is not possible on that path. A fixed layer already paints over in-flow content.
- **Fixed pin.** Fixed starts with the top pin unless the layer already has an authored bottom. The tab bar needs 2 clicks: Fixed, then Bottom.

## Files

- **New.** `inspector/scroll-pin-model.ts`, `use-scroll-pin.ts`, `scroll-pin-section.tsx`, `scroll-pin-choices.tsx`. The last one is a segmented control file, added for `jsx-max-depth` and `max-lines-per-function`.
- **Changed.** `inspector/prototype-tab.tsx`, `inspector-tab-body.tsx` and `copy.ts` (+4 lines, now 491).
- **Outside the list.** `ui/styles/inspector-edit.css` (+30 lines at the end). No other pick owns this file.
- **Fixtures.** `ds-wt/pin-seed`, `ds-wt/pin-next` (a copy of `ac-next-b`), and the `ds-wt/pin-*.mjs` and `pin-server.sh` scripts.

# Cycle 43, pick 3: squircle

Branch `feat/squircle`. Server on port 7930, `STUDIO_AGENT=mock`, data at `ds-wt/squircle-data`. Fixtures: `ds-wt/sq-seed` (HTML, 3 cards with radius 24 and 1 flat layer) and `ds-wt/sq-next` (copy of `ac-next-b` with a `rounded-3xl` card).

## What works

- **Field.** "S" number field (0 to 100 %) and an "iOS" chip (60 %) in the radius expand area, under the 4 corner fields. Shows only when a corner is more than 0. Tip: "Corner smoothing. Safari and Firefox show a plain radius."
- **Mapping.** `corner-smoothing-model.ts`: write `k = 1 + percent / 60` (2 decimals), 0 % removes `corner-shape`, 60 % writes `squircle`. Read: `squircle` or `superellipse(2)` is 60 %, `superellipse(k)` is `round((k - 1) * 60)`, other values are 0 %. Chrome 157 returns `superellipse(2)` for `squircle` and `superellipse(1)` for no value.
- **Edits.** Scrub previews on the canvas, and pointer up makes 1 version. Multi-selection makes 1 batch version. A mixed selection shows the Mixed placeholder. Cmd+Z works.
- **MCP and agent.** `edit_element` and `batch_edit` take `style: { "corner-shape": ... }`. The chat agent edit tool takes it too, because its schema comes from the same list.

## Checked

- Proof log: `cycle-43/squircle/ui-proof.txt`. Main refusal: `cycle-43/squircle/main-refusal.txt`.
- An MCP `edit_element` with `superellipse(1.5)` made the field show 30 %.
- Screenshots: `radius-row-{dark,light}.png`, `inspector-{dark,light}.png`, `corner-zoom-400.png` (round on the left, squircle on the right, at 4x).
- Passes: `pnpm run typecheck`, `pnpm run lint:gate` (59,575 diagnostics, baseline 89,733), `pnpm run build:ui`.
- `check-bundle` passes. B1 is 274,688 B, 15 B over the 274,673 B baseline. The 15 B are the `"corner-shape",` entry in `DIRECT_STYLE_PROPERTIES`, which is in the Home chunk.
- `check-actions --probes`: 278 hits (E1 25, E16 6, O11 1, O12 52, S11 194). Cycle 42 had the same count.
- No new action, so no `call-action.ts` run. No real-model run.

## Spec differences

- **Engine change needed.** On main, `edit_element` with `corner-shape` fails with `style: Unrecognized key: "corner-shape"`. The MCP `style` object in `mcp/edit-kit.ts` is strict, and `edit-request-schema.ts` refuses unknown keys too. Fix: 1 line in `packages/common/contracts/src/border-side-properties.ts`, which adds `"corner-shape"` to `BORDER_STYLE_PROPERTIES` (no change to `contracts.ts`). Also 1 line in `apps/desktop/src/bridge/element-info.ts` `STYLE_KEYS`, so the bridge reads the computed value.
- **Host file.** `corner-field.tsx` renders 1 corner and runs 4 times. The field renders in the split branch of `inspector-corners.tsx`. `corner-field.tsx` did not change.
- **Names.** `anti-slop/no-shape-in-symbol-names` refuses "Shape". The spec's `toCornerShape` is named `toSmoothingCss`.
- **Tailwind.** `corner-shape` is not in `isMappedProperty` in `tailwind/map.ts`, so the Tailwind path writes an inline style: `style={{ cornerShape: 'squircle' }}`. It renders, and 0 % removes it. The `[corner-shape:squircle]` class needs a `SINGLE_PROPS` entry, a `SingleGroup` member and a class reader in `tailwind/**`. The spec does not allow edits to `map.ts`, so I left this out. The `edit_element` reply still says `"wrote": "classes"` for this write.

## Snapshots

I did not edit a snapshot. `artifacts/mcp-snapshots/direct-edit-element.json` will differ: the `style` object of `edit_element` and `batch_edit` gets a `corner-shape` key. The agent `direct-tools` style schema and the agent `breakpoints-tool` property enum get the key too.

## Files outside the pick list (no other pick owns them)

- `packages/common/contracts/src/border-side-properties.ts` (1 line)
- `apps/desktop/src/bridge/element-info.ts` (1 line)
- `apps/desktop/src/ui/features/inspector/inspector-corners.tsx` (renders the field)
- `apps/desktop/src/ui/styles/inspector.css` (`.ins-smoothing`, 12 lines)

`inspector/copy.ts` is 490 lines (+3).

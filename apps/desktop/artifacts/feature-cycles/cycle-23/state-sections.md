# Cycle 23 pick 4: state-sections

Branch `feat/state-sections`. No new action. Tool names stay.

## Changed

- Actions: new `_core/style-variant.ts` with `StyleVariantSchema` (default `""`, the base style). `fill.set` and `fill.get` use it, and `fill/schema.ts` lost its local schema. `effect.set`, `effect.get` and `layer-style.apply` take `variant`. The `set_effect` and `apply_layer_style` descriptions name `variant` with the `set_fill` text. `effect.get` also takes `variant`, so the Effect section can read the state stack back.
- Effect writer (`style-scope/effect/variant-plan.ts`, `variant-read.ts`, `engine/variant-classes.ts`): with a variant, the fx sheet class is not used.
  - Tailwind: writes arbitrary prefixed classes (`hover:shadow-[...]`, `md:hover:blur-[1px]`, `md:hover:backdrop-blur-[8px]`, `md:hover:backdrop-saturate-[150%]`) and removes only effect classes with the same prefix.
  - CSS page: sends `box-shadow` and `filter` with the variant to direct edit, which writes a `.sv-xxxxxx:hover` rule.
  - Under a variant, only shadows, layer blur and background blur are allowed. Noise, glass, shader and `styleName` fail with a clear message. A background blur on a CSS page fails, because `backdrop-filter` is not in `DIRECT_STYLE_PROPERTIES`.
- Layer style: with a variant, the base classes of the picked groups of the source get the prefix. The target loses only picked-group classes with that prefix, so its base classes stay. CSS targets get the declarations as a state rule.
- UI: the Effect section sends `useEditVariant` (a prop from `inspector/effect-section.tsx`, because `effect` may not import `inspector`). Paste style gets the variant from `canvas/use-preview-menu.tsx` (one line, outside the owned list).
- Border position (`use-stroke-position.ts`, `stroke-position-model.ts`, new `stroke-variant-model.ts`):
  - The ring and class writes carry the picked prefix. A ring set only under the state (`focus:ring-2`) shows in the Border section.
  - Under a state, the position and width come from the state classes (`focus:outline-1`), and clearing writes `focus:border-none` or `focus:outline-none`, not a class removal.
  - Inside to Outside or Center adds the old border width to each padding side in the same edit. Back to Inside takes it off (under a state it removes the state padding).

## Checked

- `call-action.ts effect.set` hover: (`call-action-effect-set.txt`). HTTP wrote `hover:shadow-[0px_10px_15px_-3px_rgba(0,_0,_0,_0.1)]`, base `shadow-sm` stayed. MCP and the agent decoded `variant` and ran the handler, then answered "already has these effects" (not idempotent, same as cycle 22).
- `call-action.ts effect.get` hover: pass, 3 surfaces, 0 diffs (`call-action-effect-get.txt`).
- `call-action.ts layer-style.apply` md:hover: (`call-action-layer-style-apply.txt`). Card B got `md:hover:rounded-xl md:hover:border-slate-300 md:hover:bg-white md:hover:p-4 md:hover:shadow-md`, base classes stayed. MCP and the agent skipped with "Already has this style."
- HTTP: md:hover: with shadow, layer blur and background blur, read back the same stack; noise under hover fails (`http-effect-tw.txt`). CSS page: hover wrote `.sv-c11e9f:hover { box-shadow: ... }` and read back (`http-effect-css.txt`).
- UI (playwright-core, mock agent, port 47310):
  - Hover picked, Add effect, Drop shadow: wrote a `hover:shadow-[...]` class, base `shadow-sm` stayed, the section lists the state shadows. Cmd+Z took the new shadow off in one step.
  - `border-2 p-4` card, Outside: `outline-2 ... p-[18px]`, the heading box did not move (same x, y). Inside: `border-2 p-4`.
  - Focus picked, input, Outside: `focus:border-none focus:outline focus:outline-1 focus:outline-slate-300 focus:px-[13px] focus:py-[9px]`; the section then reads Outside. Inside: `focus:border focus:border-slate-300`, the state padding is gone.
  - `focus:ring-2 focus:ring-blue-500` with Focus picked shows Outside, width 2 (`border-ring-focus-dark.png`).
- Screenshots: `effect-hover-{dark,light}.png`, `effect-hover-bar-{dark,light}.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Left out

- The spec example `hover:shadow-lg`: the Effect section edits numbers, so it writes arbitrary `shadow-[...]` classes. `effect.get` reads only arbitrary classes back; a hand-written `hover:shadow-lg` is not listed in the state stack.
- The variant bar has Focus (`focus:`), not Focus visible, so `focus:` was checked.
- `border-2` is not in any layer-style group (old behavior, also at base), so Paste style does not copy the border width.
- Layer style on a CSS page under a state was not run in the UI (engine path only).
- `artifacts/mcp-snapshots` is not changed. The `set_effect`, `get_effect` and `apply_layer_style` input and description diffs wait for approval at merge.
- Bonaparte was not used.

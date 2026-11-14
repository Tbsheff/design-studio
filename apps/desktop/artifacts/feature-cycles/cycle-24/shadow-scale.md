# Cycle 24 pick 2: shadow-scale

## Built

- Added `size` (`2xs` to `2xl` or `null`) to drop and inner shadow items in `effect.set` and `effect.get`, with `SHADOW_SIZES` in `contracts/src/layer-effect.ts`. Default is `null` (`withDecodingDefaultKey`).
- Added `shadowSizes` and `innerShadowSizes` to the `effect.get` output. They list the sizes of the project scale.
- Reads the scale from the Tailwind theme (project `@theme` values override the defaults), else from `--shadow-*` and `--inset-shadow-*` in the app token file, the effect sheet or the page. Inner sizes come only on Tailwind 4.
- Writes on Tailwind layers: shadows go to classes, also at the base (not to the `fx-` sheet). One sized drop shadow writes `shadow-<size>`, one sized inner shadow `inset-shadow-<size>`, other shadows one `shadow-[...]`. The writer removes old size and arbitrary shadow classes and keeps `shadow-<color>` (`shadow-black/10`). Custom numbers that equal the first layer of a scale value write the name.
- Writes on CSS layers: `box-shadow: var(--shadow-md)` in the `fx-` rule, and in the `:hover` rule for a state.
- Reads named classes under a variant: `hover:shadow-lg` reads LG when Hover is picked.
- UI: each shadow row has a Size field (None, the project sizes, Custom). None removes the row. Editing a number turns the row to Custom. No Size field when the project has no scale.
- New engine files: `engine/shadow-scale.ts`, `engine/shadow-parse.ts` (moved out of `variant-classes.ts`), `engine/shadow-tokens.ts`. New server files: `shadow-site.ts`, `shadow-read.ts`, `shadow-plan.ts`. New UI file: `shadow-size-select.tsx`.

## Checked in the running app

- Tailwind card `rounded-lg shadow-sm`: row shows SM. Picked LG in the UI: `rounded-lg shadow-lg`, no `shadow-[`. Cmd+Z: back to `shadow-sm` in one step. Blur 7: Custom, `shadow-[0px_1px_7px_0px_rgb(0_0_0_/_0.1)]`. Numbers set to 0, 4, 6, -1: `shadow-md`.
- Hover + XL: `shadow-sm hover:shadow-xl`, base stays. Under Hover the row reads XL.
- `shadow-md shadow-black/10` + LG: `shadow-lg shadow-black/10`.
- `inset-shadow-sm` reads SM; XS writes `inset-shadow-xs`.
- `@theme { --shadow-md: ... }` override: MD reads the project values (0, 6, 12, -2).
- HTML project with `--shadow-sm/md/lg` tokens: sizes SM, MD, LG only; MD writes `.fx-...{box-shadow:var(--shadow-md)}`; Hover LG writes `:hover { box-shadow: var(--shadow-lg); }` and reads back LG. Without tokens: no sizes.
- `direct-edit` with `{ "box-shadow": "var(--shadow-md)" }` (the edit_element route) writes `shadow-md` already; `tailwind/map.ts` is unchanged.
- `call-action.ts effect.get`: pass, 3 surfaces, 0 diffs. `call-action.ts effect.set` size lg: HTTP wrote `shadow-lg`; MCP and the agent decoded `size` and answered "already has these effects" (the set is not idempotent, as in cycles 22 and 23).
- Screenshots: `shadow-scale/size-menu-dark.png`, `size-menu-light.png`, `css-tokens-dark.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Left out

- Bonaparte route copy check not run.
- `review_frame` off-token check for a named shadow not run.
- State stack listing of `hover:shadow-lg` not checked (pick 4 owns that list).
- A sized shadow keeps only its first layer numbers in the row; the class keeps every layer. Disabled shadows on Tailwind layers are not kept (no class can hold them), as in the cycle-23 variant path.
- Seen, not fixed: Enter in an effect number field can commit twice and show "The layer already has these effects." The first write is correct.
- MCP snapshot diffs for `set_effect` and `get_effect` (input `size`, output `size`, `shadowSizes`, `innerShadowSizes`, `set_effect` description): user decision at merge.

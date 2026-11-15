# Cycle 41 pick 2: color-pick

Branch `feat/color-pick`. A click on a color swatch (or Enter on it) opens a color popup under the field: a saturation and brightness pad, a hue slider, an alpha slider on a check pattern, a hex field (6 digits, 8 when alpha is below 100 %), an alpha field (0 to 100), and "On this page": up to 16 page colors, most used first. The text input, the eyedropper and the token control stay as they were.

## What changed

- **Added** `color-popup-model.ts` (pure): parse hex, `rgb()`, `rgba()`, `transparent`, and `lab()` or `oklab()` with alpha (through the existing `colorHex`); HSV math; `toColorText` (hex at 100 %, else `rgb(r g b / a)`); key steps (1, Shift 10); page color rows; `var(--color-x/NN)` Tailwind values resolve to `rgb(.. / 0.NN)`.
- **Added** the popup: `color-swatch.tsx`, `color-popup.tsx`, `color-pad.tsx`, `color-sliders.tsx`, `color-slider.tsx` (native `input type=range`), `color-text-fields.tsx`, `color-text-input.tsx`, `color-page-swatches.tsx`, `color-page-swatch.tsx`, `color-popup.module.css`, and hooks `use-color-popup.ts`, `use-color-preview.ts`, `use-color-drag.ts`, `use-color-controls.ts`, `use-color-text.ts`, `use-color-page.ts`.
- **Write.** A drag previews once per animation frame (`edit.preview`). Pointer up commits once (`edit.preview` + `edit.commitSoon`): 1 version per drag. Escape during a drag reverts to the value at drag start and writes nothing. Keys and the text fields commit at once.
- **Swatch.** `toSwatchColor` (in `css-value-model.ts`) draws the color over a check pattern, so `rgba()` values no longer show the empty swatch. `toHexColor` is unchanged.
- **Page colors** come from the existing `find-styles` bridge scan (`getStyles`, `{ property: "color" }`), the same data as Selection colors. A token color shows its token in `data-tip`, and a click writes `var(--token)`.
- **Where.** `color-field.tsx` and `vector-color-row.tsx`. Not `token-inputs.tsx`.
- `copy.ts`: +5 lines (484).

Files outside the pick list (no other pick owns them):
- `ui/features/inspector/simple-contexts.tsx`, `inspector-simple.tsx`: provide the preview port to the popup (`ColorPageContext`).
- `ui/features/inspector/use-vector-color.ts`, `vector-model.ts`: the vector row uses the popup; removed the unused `toSwatchClass`, `toSwatchStyle`, `DEFAULT_HEX`.
- `shared/token-match.ts`: `matchColor` skips a token whose alpha differs from the value (0.01 tolerance). Without this, "Keep tokens" snapped `rgb(255 255 255 / 0.4)` to `var(--background)` and dropped the alpha.

## Checked in the running app

Server on port 7460, `STUDIO_AGENT=mock`, data at `ds-wt/color-pick-data`. Fixtures `ds-wt/ck-seed` (HTML) and `ds-wt/ck-next` (copy of `ac-next-b`, overlay `bg-black/50`). Driven with playwright-core (`ds-wt/ck-drive.mjs`).

| Check | Result |
|---|---|
| `ck-seed` overlay Fill swatch shows the alpha color | Passes: `linear-gradient(rgba(15,23,42,.5)…)` over the check pattern |
| Popup opens; hex `0f172a80`, alpha 50; 6 page colors | Passes |
| Text color, alpha drag | Passes: 1 POST, `color: rgb(255 255 255 / 0.28)`, 1 version; Cmd+Z restores |
| Fill row, alpha drag | Passes, then Apply: 1 `fill.set`, `rgb(15 23 42 / 0.28)`, 1 version; Cmd+Z restores |
| Escape mid-drag (lead text) | Passes: canvas previews `rgb(37,65,128)`, Escape restores `rgb(37,99,235)`, 0 writes, popup closes |
| "On this page" `#2563eb` on lead text | Passes: 1 write, 1 version |
| Arrow keys in the pad, Shift+Arrow on hue | Passes: 64%/16% to 63%/6%; hue 222 to 232 |
| Tab | Moves through pad, hue, alpha, hex, alpha, swatches; no trap |
| `ck-next` text color alpha 40 % | Passes: `text-white` to `text-card/40` (theme white) |
| `ck-next` Fill row alpha 40 % + Apply | Writes `bg-[rgb(0_0_0_/_0.4)]`, not `bg-black/40` (see Open) |

Screenshots: `cycle-41/color-pick/popup-{light,dark}.png`.

## Headless

No new action, so no `call-action.ts` run. MCP: `find_styles` (`property: color`) on `ck-next` lists the page colors with tokens (`bg-black/50`, `text-background`). `edit_element` with `background-color: rgb(0 0 0 / 0.4)` wrote `bg-black/40`; with `color: rgb(255 255 255 / 0.4)` it wrote `text-card/40`; on `ck-seed` `.muted` it wrote `rgb(156 163 175 / 0.5)`. The chat agent uses the same tools. No real-model run.

## Gates

- `pnpm run typecheck`: 0 errors.
- `pnpm run lint:gate`: pass, 59,586 (baseline 89,733).
- `pnpm run build:ui`: pass. `check-bundle`: pass, B1 274,705 B, delta +2 B. No new Home chunk and no new Home code: the 2 B are 2 index numbers in the `__vite__mapDeps` list of `screen-preload`, because the inspector chunk now imports `token-match` and `popover-placement` earlier. Tyler decides if the baseline moves.
- `check-actions.ts --probes`: 557 hits, the same as main.
- MCP snapshots: no change (no tool description or input changed).
- `.claude/goal/roadmap.md`: not in worktree.

## Open

- **Fill row is a draft.** The Appearance Fill row (`fill/use-paint-edit.ts`) turns `preview` into a draft and makes `commit` a no-op, so a popup pick there needs Apply or Enter, as the native swatch did. Its writer (`FillWriter`) writes an arbitrary `bg-[rgb(…)]` class in Tailwind, not `bg-black/40`. Direct edits (text, border and the MCP path) use `tailwind/map.ts` and write `x/40`.
- **Popup closes after a Tailwind write.** In `ck-next`, the HMR reload changes the inspector height; the scroll closes the popup (`useAnchoredPopover` closes on any scroll). In HTML it stays open.
- **Multi-selection** color fields show no "On this page" row (no port context there).
- Left out: the token editor (`token-inputs.tsx`), runner-up 6.

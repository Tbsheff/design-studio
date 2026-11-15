# Cycle 42, pick 4: token-color

Branch `feat/token-color`, cut from `5e544ae40`.

## What works

- **Token editor.** A click on the swatch of a color token opens the cycle-41 color popup: pad, hue, alpha, and hex and alpha fields. It has no "On this page" row.
- **Write.** A drag previews the token on the canvas through the token draft. Pointer up commits 1 version. Example: `--overlay` alpha 50 to 27 gives `rgb(15 23 42 / 0.27)` in `tokens.json` and 1 new version.
- **Escape.** Escape during a drag reverts the field. No write is sent, and no draft entry stays.
- **Dark slot.** The popup on the dark slot of `--brand` writes only `$extensions["studio.modes"].dark` (`rgb(96 165 250 / 0.62)`). Cmd+Z restores `#60a5fa` through `edit-history/undo`.
- **Swatch.** The swatch uses `toSwatchColor` on a check pattern, so an alpha token no longer shows white.
- **Tweaks panel.** The color tweak opens the same popup, and a drag stages the tweak draft (`rgb(37 99 235 / 0.58)`, "1 change", Save). Tweaks keep their own Save step.
- **Inspector color fields.** The Fill popup still shows "On this page".
- **Headless.** No new action. `call-action.ts direct-edit.updateTokens` with `color.overlay = rgb(15 23 42 / 0.5)`: HTTP, MCP and agent all ok (58, 48, 51 ms). The 2 diffs are only version ids, timestamps and the agent `origin` field. `call-action.ts workspace.getTokens`: pass, 0 diffs.

## Design

```
ui/app/studio/studio-column-body.tsx  (ColorPickerSlot.Provider around TokensPanel)
ui/app/studio/studio-inspector.tsx    (ColorPickerSlot.Provider around StudioEditPane)
        | value: toColorPicker = (props) => createElement(ColorPickerPopup, props)
        v
ui/domain/color-picker-slot.ts        (context, props type)
        ^
versions-layers-tokens/use-color-picker-slot.ts  (reads slot + TokenCommitSlot)
        ^
token-inputs.tsx ColorValue -> token-color-swatch.tsx (popup or native input)
```

- `onPreview` and `onRevert` call the field `onChange`, so the token draft and its preview path run. `onCommit` calls `onChange`, then `draft.commit()` from `TokenCommitSlot`, which `tokens-sections.tsx` provides.
- With no slot, the field keeps the native `<input type="color">`.

## Differences from the spec

- **No `anchor` prop.** `useColorPopup` finds the `.ins-field` anchor itself, so the slot has `swatch` instead.
- **Second provider.** The tweaks panel is under the inspector, not the column, so `studio-inspector.tsx` also provides the slot.
- **Inspector chunk.** `ColorPickerPopup` is exported from `inspector.tsx` and the lazy loader imports `./inspector.js`. A separate lazy chunk renamed a Home preload chunk to `contracts` (check-bundle fail, +448 B). Now check-bundle passes: B1 is 274,743 B, which is 38 B over main (274,705 B). The new 86 B `color-picker-slot` shared chunk shifts the `screen-preload` indexes.
- **Commit scope.** Pointer up commits every pending token draft, not only this token.
- **Value seed.** The popup opens on the resolved swatch color. An alias token (`var(--x)`) becomes a literal after a drag.
- **Not rebased on polish-42.** It is not merged yet, so the token popup still uses the current dismiss.

## Files outside the pick list

- `ui/features/versions-layers-tokens/tokens-sections.tsx` (TokenCommitSlot provider)
- `ui/features/versions-layers-tokens/token-color-swatch.tsx` (new; keeps `ColorValue` under 80 lines)
- `ui/features/inspector/inspector.tsx` (exports `ColorPickerPopup`)
- `ui/app/studio/studio-inspector.tsx` (second provider)

`versions-layers-tokens/copy.ts` is unchanged (0 lines), because the popup uses the inspector copy.

## Checks

- `pnpm run typecheck`: pass.
- `pnpm run lint:gate`: pass, 59,593 diagnostics (baseline 89,733).
- `pnpm run build:ui`: pass.
- `check-bundle`: pass, as above.
- `check-actions.ts --probes`: 278 hit lines, the same as main.
- `gen-routes.ts --check`: pass.
- MCP snapshots: unchanged.
- Real-model runs: 0.

## Fixture

`ds-wt/tc-seed`: an HTML prototype with `design-system/{tokens.json,pack.json,tokens.css}` and `studio/tweaks.json` (Accent color tweak).

## Screenshots

`cycle-42/token-color/token-popup-dark.png`, `token-popup-light.png`, `tweaks-popup-dark.png`.

## Open

- The inspector `TABS` list has no Tweaks tab, so the tweaks panel cannot be opened from the UI. For the check, the tab was set from the React props.

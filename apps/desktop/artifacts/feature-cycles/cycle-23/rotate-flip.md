# Cycle 23 pick 1: rotate-flip

Branch `feat/rotate-flip`, cut from `main` at `2018eb98e`.

## What works

- **Rotation field:** the field is in the Position rows of the Layout section. It shows when the layer has a rotation that is not 0, or after "Rotate…" (in the layer menu or Cmd+K), which shows it with focus. It uses the normal number field, so scrub and math input work. Shift+Arrow steps 15°.
- **Tailwind writes:** 45 writes `rotate-45`, 17 writes `rotate-[17deg]`, -12 writes `-rotate-12`, and 0 removes the class. Each write leaves `translate-x-1` in place, and Cmd+Z undoes each write in one step.
- **Flip:** Shift+H toggles `-scale-x-100` and Shift+V toggles `-scale-y-100`. Each toggle is one undo step. The keys work with focus in the canvas, where the bridge forwards the chord, and with focus in the app. A key typed into a canvas text input stays text ("HV").
- **Menus:** the layer context menu has "Flip horizontal ⇧H", "Flip vertical ⇧V" and "Rotate…". Cmd+K lists the same 3 commands.
- **CSS project:** Rotation 30 writes `rotate: 30deg` and Shift+H writes `scale: -1 1`, both as inline style. This is the same path that other direct edits in HTML projects use.
- **Headless:** `rotate` and `scale` are now in the direct style properties (new `packages/common/contracts/src/transform-style-properties.ts`).
  - Over MCP, `edit_element {rotate: "90deg"}` writes `rotate-90` and `{scale: "-1 1"}` writes `-scale-x-100`.
  - The style descriptions of `edit_element`, `batch_edit` and the agent direct tools name the two keys.
- **Engine:** the new `server/direct-edit/engine/tailwind/rotate-scale.ts` gives rotate, scale-x and scale-y their own class groups, so a flip never removes `scale-50` or `translate-*`. The `transform` token case moved out of `map.ts`.

## Checks

- **call-action, `state-style.set`:** input `property: "rotate", state: "hover", value: "45deg"`.
  - HTTP wrote `hover:rotate-45`.
  - MCP and the agent each answered "already has this value". The write ran 3 times, so the 2nd and 3rd calls had nothing to change. All 3 surfaces accept `rotate`.
- **call-action, `direct-edit.apply`:** `{rotate: "17deg"}` passed and wrote `rotate-[17deg]`. Its MCP and agent bindings are off (legacy), so only HTTP ran.
- **Gates:** `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59617 diagnostics, baseline 89733). `pnpm run build:ui` passes.
- **check:scripts:** it fails, but only on old S11 and E16 items in files that this branch does not change.
- **Screenshots:** in `cycle-23/rotate-flip/`: `rotation-field-{dark,light}.png` and `layer-menu-{dark,light}.png`.
- **Bonaparte:** read-only `git grep`. It has 78 `rotate-180` and 37 `rotate-90` uses. All of these classify into the new rotate group. `git status` in Bonaparte did not change.

## Left out

- **Bonaparte route:** I did not open a Bonaparte route copy in the app. I checked only the class read with `git grep`.
- **`set_state_style` description:** it does not name rotate and scale yet. Pick 3 edits that file. The input enum includes both keys already.
- **Transform rotation:** a rotation that comes only from `transform` is read from the matrix. An edit then adds `rotate` on top of it, so the old `transform` rotation stays.
- **Not done:** multi-select flip, a canvas rotate handle, and a field for a Tailwind v3 rotate (v3 writes `rotate-*` through `transform`).
- **Focus:** after you type a value in the Rotation field, focus stays in the field. Press Escape first, or Shift+H types "H" into the field.
- **MCP snapshots:** `edit_element`, `batch_edit`, `set_state_style` and the agent direct tools get 2 new style keys in their input enum, and the first 3 also get the description text above. `artifacts/mcp-snapshots` is unchanged; this is your decision at merge.

# Cycle 29 pick 4: figma-keys

Branch `feat/figma-keys`. Commits: `af5737b4b` (keys), `b78089f34` (rotate zone).

## What works

- Opacity: `1` to `9` set 10% to 90%, `0` sets 100%. Two digits within 400 ms set the exact value (`4` `5` = 45%, `0` `0` = 0%). One write and one undo step per sequence.
- Font size: `Mod+Shift+.` and `Mod+Shift+,`. On Tailwind a value on the scale steps to the next class (`text-sm` to `text-base`); other values step 1 px.
- Letter spacing: `Alt+.` and `Alt+,` step 0.01 em. Line height: `Alt+Shift+.` and `Alt+Shift+,` step to the next `leading-*` ratio on Tailwind, else 1 px.
- Matching uses `event.code`, so macOS `Alt+.` works.
- Keys work with the canvas focused and inside the preview frame (forwarded as an arrange key).
- Keys write through the inspector edit, so they write the picked breakpoint and state (`md:hover:opacity-70`).
- Multi-selection: one key writes all layers in one batch, one undo step.
- Shortcut sheet rows (Selection group) and Cmd+K commands ("Opacity 0%" to "Opacity 100%", font size, letter spacing, line height).
- Rotate zone: the drag now writes the picked breakpoint and state (`md:rotate-30`, base untouched). The Rotation field already did (`md:rotate-12` on main), so `use-rotation.ts` has no change.

## Checked in the running app (mock agent, port 49810)

- Tailwind 4 page: `5` gives `opacity-50`; `4` `5` gives `opacity-45`; `0` gives `opacity-100`; Cmd+Z undoes one sequence each time.
- `md` + Hover, `7`: `md:hover:opacity-70`.
- `text-sm` heading: `Mod+Shift+.` gives `text-base`; `Alt+.` gives `tracking-[0.01em]`; `Alt+Shift+.` gives `leading-relaxed`.
- CSS page: values change (`opacity: 0.45`, `font-size` 14 to 16 px, `letter-spacing: 0.01em`, `line-height: 19px`).
- `5` in the chat box and in a text edit: no opacity change. Comment mode and Play: no change. `Mod+Shift+.` cannot match `stop` (`appKeyOf` needs no Shift; the keymap matcher checks Shift).
- Cmd+K "Font size up" writes `text-base`.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59622 diagnostics against baseline 89733) and `pnpm run build:ui` pass.

Screenshots: `cycle-29/figma-keys/{layer-45,palette-font-size,sheet-opacity,sheet-spacing}-{dark,light}.png`.

## Notes

- Type keys use `previewForced`, so the token snap does not pull a 1 px step back to a near token. An exact token match still writes the token (`16px` gives `var(--text-sm)` in the CSS pack page).
- On an HTML project the direct edit writes inline style, as the inspector fields do. The rule values do not change.
- `0` writes `opacity-100`. It does not remove the class.
- The keys work only while the inspector is visible (`checkVisibility`). This blocks them in comment mode.
- The rotate drag reads the variant through `use-resize-handles.ts` (it is on the cross-feature list), not through a new import in `use-rotate-drag.ts`. These files are outside the pick list: `keymap-edit.ts` (new; keeps `keymap.ts` at 476 lines), `simple-editor-body.tsx`, `simple-multi-body.tsx` (mount and root ref), `use-resize-handles.ts` (variant reader).
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A has no change.

## Left out

- No new action and no MCP change: `edit_element` and `set_state_style` already set these values. No `call-action.ts` proof, because the pick adds no action.
- Multi-selection type keys use the 1 px step, not the Tailwind scale step (the multi editor has no class info).
- The font and leading scales are the default Tailwind scales. A custom theme scale steps 1 px.
- No real-model run (the spec says none).

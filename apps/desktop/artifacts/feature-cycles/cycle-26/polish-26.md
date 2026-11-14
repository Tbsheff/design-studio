# Cycle 26 pick 5: polish-26

Branch `feat/polish-26`. No new action, no MCP change.

## Changed

- Esc leaves a forced state: the inspector stays mounted when the selection is empty, so its unmount reset never ran. `inspector/use-inspector-session.ts` now calls `restoreEditVariant` when the selection goes empty. It posts the same `force-state` reset (selector `null`) as the Default chip. `state-styles/use-state-styles.ts` clears the forced frame record (`set_forced_state` with `null`) when the edit variant resets, so MCP screenshots also stop forcing the state. `applyChip` now sends the record before it sets the variant, so the Default chip sends one request, not two. `bridge/force-state.ts` needed no change: `set(null)` already removes the marks and puts the old `data-state` back.
- Effect number field (`effect/effect-field.tsx`): it remembers the value it sent for the current value. Blur after Enter does not send it again. Focus clears the memory, so a retry after a failed write works.
- Opacity: new `inspector/opacity-field-model.ts` (`toPercentEdit`) and `opacity-field.tsx`. The field shows `60%`, takes 0 to 100 in steps of 5, and writes `0.6`. The mixed-value shift converts the step and bounds too.
- Fill color Enter: `fill/paint-field.tsx` wraps the color field in a `display: contents` element that catches Enter. `use-fill.ts` `handleEnter` applies the draft when it changed and no write runs. This covers the solid color and the gradient stop color. Blur still only changes the draft, so Reset still works.
- Screen check (`server/agent/screen-review.ts`): the catch moved from the screen to the size. The review keeps the images that worked and lists the failed sizes (`failed`). The note ends with "These images failed: Settings desktop." The prompt asks the agent to take those with `mcp__studio__screenshot`. Line 94 (`runScreens(...).catch(() => [])`) is unchanged: it lists the screens, and an empty list means no check, as before.

## Checked

Server on port 47926 with `STUDIO_AGENT=mock` and `STUDIO_DATA_DIR=ds-wt/polish-26-data`. React project with the Tailwind browser script and `src/tw.css`. UI through playwright-core.

- Esc:
  - Hover on `#cta`: `data-studio-force="hover"`, 5 marks, blue fill. After Esc: no mark, default fill, selection empty, and one `forced` request with `layer: null`.
  - Closed on `#panel`: `data-state="closed"`, opacity 0.3. After Esc: `data-state="open"`, opacity 1.
  - Esc with focus in the frame: no marks after.
- Effect: Add effect, Drop shadow, then Blur 8, Enter, then a click outside: one `POST /effect` (`blur: 8`), no error.
- Opacity: `#box` showed `100%`. 60, Enter: one `direct-edit` with `opacity: "0.6"`, the source has `opacity-60`, and the field shows `60%`.
- Fill: `#ff6600`, Enter: one `POST /fill`, the source has `bg-[#ff6600]`.
- Screen check: `screen-check.txt`. I ran `studioScreenReview` with a fake preview that fails the desktop size of screen 2 (a script outside the repo, no mock agent run). Result: 3 images (Home desktop, Home mobile, Settings mobile), and the note and prompt name "Settings desktop".
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59606 diagnostics, baseline 89733) and `pnpm run build:ui` pass. No real-model run (the spec needs none).
- Screenshots in `cycle-26/polish-26/`: `opacity-field-{dark,light}.png`, `effect-row-{dark,light}.png`.

## Left out

- I did not check undo with Cmd+Z for each write. Each change writes once through the normal path.
- The screen check was not run in a full mock agent run. I called the function with a fake preview.
- Forced Dark only (no state chip) clears through the same variant reset, but I did not check it.
- `.claude/goal/roadmap.md` is not in the worktree, so I added no Appendix A glob. The new files are `ui/features/inspector/opacity-field-model.ts` and `opacity-field.tsx`.
- Outside the listed files: `inspector/use-inspector-session.ts` (the deselect handler), `state-styles/use-state-styles.ts`, `fill/{use-fill.ts,fill-row.tsx,gradient-fields.tsx,fill.module.css}` and `inspector/{appearance-grid.tsx,simple-model.ts}`. The other picks own none of these files.

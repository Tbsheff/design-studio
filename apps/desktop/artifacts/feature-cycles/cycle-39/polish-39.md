# Cycle 39 pick 5: polish-39

Branch `feat/polish-39`. No new action. No union or generated file changed.

## What changed

- **Toast "Copied style of h2".** `ui/features/layer-style/copy.ts`: `copied` is now `toCopiedText(tag)`. It returns "Style copied" when the tag is empty. `use-layer-style-host.ts` calls it with `target.tag`, which the bridge already sends in lower case. The menu and `Mod+Alt+C` run the same item, so both show the same text.
- **Transition stop for every dark render.** `STILL_EXPRESSION` moved from `app-review-dark.ts` into `listContrastMisses` (`prototype-dark-review.ts`), after `waitForPage` and before axe. The prototype dark check (`listDarkLines`), the app dark check and pick 1 now share it.
- **Photo-text in the dark step.** `listContrastMisses` runs `runPhotoTextPass(page, loadAxeSource)` after the contrast run. `preview/page-capture/index.ts` exports `runPhotoTextPass` and `PhotoTextHit` (W19b). `DarkMiss` has `kind: "contrast" | "photo"`, `need` and `part`, and is exported as a type. Both dark paths split lines by kind. Contrast keeps its summary line per page or file. Each photo hit gets one line from the shared `toPhotoLine`, for example: `- Dark: text "h1" on a photo on index.html is 1.2:1 at its lightest part in dark (AA needs 3:1). Add a scrim behind the text, or move it off the light part.` The cap of 6 lines now counts all lines, and the rest line says "N more dark lines are not shown". The cycle-38 skip rules stay (no photo: 1 ms, max 3 nodes).
- **Range apply with no canvas frame** (`style-scope/text-search/scope.ts`). Proof: on `p39-ac` with no frame, `apply-range-text` gave 400 "The file of this layer was not found." The cause was not only the frame scope: `apply-range.ts` passes the layer file as the scope pattern, and `toPatternOf` turned `app/crew/page.tsx` into `app/crew/page.tsx/**/*`, which matches no file. Now `toGlobFiles` first checks `toExactFiles`: a pattern with no glob characters that names a scan file in the work tree (same `..` and absolute guard, same skip rules) gives that one file. This works for a layer in any imported component, so I did not add the route file of the open preview as the spec said. Side effect: `search_text` with a `glob` that names one file now searches that file.

## Checked

- **Toast**, mock server on port 6910, HTML fixture `ds-wt/p39-seed`, playwright-core (`ds-wt/p39-tools/drive.mjs`): right-click on the `h2`, "Copy style", and click on the `h2`, `Mod+Alt+C`. Both show "Copied style of h2", in dark and light. Screenshots: `cycle-39/polish-39/{toast-menu,toast-key,menu-copy-style}-{dark,light}.png`.
- **Photo-text in dark**, no model (`ds-wt/p39-tools/dark.mts` calls `listDarkLines` with a playwright preview), `ds-wt/p39-photo` (`pt-seed` plus `tokens.css` with a `.dark` block): 1 photo line on `index.html`, 0 on `plan.html`, 585 to 928 ms for both pages. Output: `cycle-39/polish-39/dark-no-model.txt`.
- **Transition stop**, `ds-wt/p39-trans` (2 raw dark text lines, 1.5 s color transitions): branch 2 items on each of 5 checks; main 0 items on each of 5 checks (it read the colors while they were still light). The prototype path had the race.
- **Real run** (Sonnet, fresh data folder `polish-39-data-real`, in-app chat run API, route frame `/crew`, fresh copy `ds-wt/p39-ac` of `ac-next-b`, the cycle-38 prompt): completed in 24.4 s, $0.11, 1 prompt, no fix loop. The agent imported `Badge` and `Button`. One dark render: 0 items under AA (643 ms). The note says "Dark: 0 items under AA". There was only 1 pass, so the pass 1 and pass 2 counts could not be compared. The model again did not add a price label. `next build` passes. Log: `cycle-39/polish-39/real-run.txt`.
- **Range apply** on `p39-ac` (mock server): no frame, before the fix 400; after the fix 200 with `<strong>Crew</strong>`; with a `/crew` route frame 200. `call-action.ts text.applyRange` with no frame: HTTP, MCP and agent all 200. The only diffs are the version ids. Each call adds one more `<strong>`, because the input has `isRemove: false`. All edits were undone. Files: `cycle-39/polish-39/{range-no-frame.txt,call-action-text-apply-range.txt}`.
- **Mod+B in the UI with no frame**, fresh copy `ds-wt/p39-ac2` (an `h1` added to `app/page.tsx`), canvas `null`. I entered text edit on the `h1`, selected "home", and pressed Mod+B. The UI sent `apply-range-text`, which returned 200, and the source became `Crew <strong>home</strong>`. Then I undid it. Screenshot: `cycle-39/polish-39/range-modb-no-frame-dark.png`.
- **Photo line in `get_run` over MCP: not proven.** A mock `start_run` over MCP completed, but mock runs do not run the studio review (`sdk-driver.ts` runs it), so the run had no dark step. The real run used the real render pool, and its dark render called the photo pass ("photo-text: leased page, 0 nodes"). The `/crew` page has no photo, so the pass did not take a screenshot. The photo line itself is proven only with the no-model preview.
- **Line count.** The note's `Dark` count is `dark.length` in `prototype-kit-review.ts` for prototypes, and `count` (all kinds) for apps. A page with only a photo line counts as 1. No code parses the line text.
- **Gates.** `pnpm run typecheck` 0 errors. `pnpm run lint:gate` passes (59,616, baseline 89,733). `pnpm run build:ui` passes. `check-bundle` passes: B1 274,703 B, delta 0. `gen-routes --check` passes.

## Open

- **Not run: OS keyboard Cmd+Z through the macOS menu.** `ioreg` reports `CGSSessionScreenIsLocked = true` for the third time. By the stop rule, this is now a manual check for Tyler. Open the packed app and make a plain edit. Type "x", then press Cmd+Z twice. Then select a range, press `Mod+B`, and press Cmd+Z. The expected results are the same as in polish-37.

## Files outside the spec list

- `style-scope/text-search/scope.ts`. The proof named it, and no other pick owns it.

## Notes

- `.claude/goal/roadmap.md` is missing in the worktree, so I added no Appendix A entry.
- Fixtures: `ds-wt/p39-{ac,photo,trans,seed}`. Tools: `ds-wt/p39-tools/`.

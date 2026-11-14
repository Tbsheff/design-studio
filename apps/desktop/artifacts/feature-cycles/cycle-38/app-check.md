# Cycle 38 pick 1: app-check

Branch `feat/app-check`. A chat edit of an attached app route now gets kit and dark lines for the changed lines only. This also happens when the agent took its own mobile shot and ran `review_frame`. No new action. No schema change.

## What works

- **Gate.** `toAppCheckGaps` (`agent/app-review-lines.ts`) comes after `appReviewGaps` in `toReviewGaps`. A run qualifies when it has an attached app, a target, a preview URL, `mode: "edit"`, a task other than `PORT_TASK`, a level other than wireframe, and at least one edit tool call. When `appReviewGaps` returns `null` (the agent checked itself), the gate returns `{ isPrototype: false, mobile: false, review: false }`, so only the kit and dark lines run.
- **Kit lines** (`agent/app-review-kit.ts`). The changed TSX files go to `listPortKitFinds`. A find counts only when its line is on a changed range or up to `NEAR_LINES` (3) lines before it, which is the `reviewItems` rule. Other finds count as old code. The line text comes from the `toKitLines` export of `port-review-kit.ts`. A high find opens a fix loop. A medium find is only listed.
- **Dark lines** (`agent/app-review-dark.ts`).
  - Dark values come from `getAppTokensIn` (`design-system/index.ts`), which reads the app token file through `getAppDirTokenFile` and `readCssTokens`. If there is no `dark` scope entry, there is no render and the log shows `[agent] app dark check: no dark values, so no dark render`.
  - The render uses the `listContrastMisses` export of `prototype-dark-review.ts` at 1440 x 900 through `toSchemedPreview(preview, "dark")`, with a 12 s timeout. Before axe runs, it stops CSS transitions so that colors are final.
  - Each failing node gets its source from the React fiber (`toAppSourceBody`, preferring `usedAt`). Only items near a changed line are kept. The check shows at most 6 lines, then a count line.
- **Opening.** `toAppOpening` (`prototype-review-opening.ts`) is used. On pass 1 with fallback gaps, it asks for one fix loop only when a high kit find or a dark item exists. On a later pass it adds no loop. The pass cap does not change.
- **Run note.** Example: "Studio app check: Kit: 2 raw elements found on changed lines, 0 left (1 on old code not counted); Dark: 0 items under AA."

## Checked

- **Passed** (no model; `ds-wt/ac-tools/no-model.mts`, real preview proxy, fake app `ds-wt/ac-next`, Next 16.4.1, Tailwind 4.2.2):
  - **Self-checked run.** Pass 1 gave 2 kit lines (a raw button and a hand-made pill), 1 dark line (line 15, 1.1:1) and a fix opening. After the fix with `Button` and `Badge`, there were 0 lines and no opening. The note said 2 found, 0 left, 1 on old code. The old "Add crew" button was not touched.
  - **Unchecked run.** The same 3 lines were added to the mobile and `review_frame` pass.
  - **App with no `.dark` block.** No render, and the log line was written. The note said "Dark: not checked".
- **Passed** `call-action.ts kit-drift.list` on `ac-next`, on main (port 6390) and on the branch (port 6380): 3 surfaces, 0 diffs, and the same finds.
- **Real runs** (Sonnet, the in-app chat run API, the spec prompt, a route frame `/crew`, fresh fixture copies):

  | Run | Time | Cost | Changed file | Old raw button | `next build` |
  |---|---|---|---|---|---|
  | main | 27.6 s | $0.12 | imports `Button` and `Badge` | not changed | passes |
  | branch | 27.4 s | $0.11 | imports `Button` and `Badge` | not changed | passes |

  - Both runs did 2 prompts and 1 fix loop, which came from an older `review_frame` hover finding. Neither model added a price label.
  - The branch note listed kit 0 (1 on old code). The dark render in pass 1 returned 0 items, but pass 2 counted 1 item, and the agent never saw it. The cause was a dark render read during the CSS color transition. It is fixed in `0e62a8f89` (transitions stop before axe; a failed render now reads "not checked"). It was re-checked with the no-model script only, because the real-run budget was used.
- **Screenshots** of the real branch run note: `cycle-38/app-check/run-note-{dark,light}.png`.
- **Gates.** `pnpm run typecheck`, `pnpm run lint:gate` (59615, baseline 89733) and `pnpm run build:ui` pass.

## Files outside the pick list

- **`agent/screens.ts`** (no other pick owns it):
  - `toChangedEntry` and `NEAR_LINES` moved here from `final-check.ts`. An export from `final-check.ts` made an import cycle, and a new import there breaks `max-dependencies` 20.
  - `changedSince` now drops a `./` or `.` app dir. Before this fix, an app at the repo root (`appDir: "."`) gave `./app/...` paths. The base version read missed those paths, so every line counted as changed. Both real runs show this: `review_frame` flagged the old "Add crew" button as a changed line.
- **`final-check.ts`** is now 521 lines (was 537). Its changes are the moved helper and one call argument. `changedFiles` is not exported, because the added `export` made the file grow. The new file calls `changedLinesSince` directly.

## Left out

- **MCP-driven app edit (`start_run`).** It uses the same run review, but no real run proved it (no budget left). `kit-drift.list` over MCP is proven.
- **`isKitTrade`-style keep rule.** The app review has no score and no revert, so nothing to keep.
- **The same CSS transition race may hit the prototype dark check** (`listDarkLines`). Not changed.
- **`.claude/goal/roadmap.md`** is missing in the worktree, so Appendix A was not updated.

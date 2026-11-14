# Cycle 38 pick 5: polish-38

Branch `feat/polish-38`. Parallel flow checks no longer hit closed preview pages. The range bar shows Bold as on inside a link, and a click removes it. First `port.start` is under 2 s on a big repo with no change. Menu Cmd+Z by OS keyboard: not run.

## What changed

- **Fixed** `preview/peek-pages.ts` (491 to 496 lines). The proof named the peek pages, not the pool:
  - `sweep` dropped the oldest pages past `MAX_PAGES` (6). A flow check uses 6 or more peek keys (3 prototype pages and 3 app routes at 1280), so the sweep closed pages that a check was waiting on (in `fresh`, `settled` or a reload) or using. Temporary logs showed every close came from the sweep, and the tasks then failed with "Target page, context or browser has been closed".
  - Now `attempt` lists its key in `entering` until it occupies the page. `sweep` skips a page with `busy > 0` or a key in `entering`. When the last user leaves (`occupy` drain), the page runs `sweep`, so an over-cap page goes then.
- **Fixed** Bold in a link:
  - `contracts.ts`: the `text-range` message has one new field, `styleTags: string[]`. `tag` stays as it is.
  - `bridge/text-range-target.ts`: new `listStyleTags` walks from the range up to the target element and keeps the style tags (`strong`, `b`, `em`, `i`, `a`, `s`, `del`, `strike`, `u`, `ins`).
  - `bridge/text-range.ts`: the reading post fills `styleTags` in all 3 shots.
  - `ui/features/text-range/text-range-model.ts`: new `isStyleOn(command, reading)` checks `tag` and `styleTags`. `toIsRemove` takes the reading. The key reading sets `styleTags: []` (its `tag` already comes from the command walk).
  - The keys and `apply_range_text` did not change. The apply body is now the same for the bar and Mod+B.

## Checked

- **Preview errors.** Mock `[port-bash]` flow on `ds-wt/p38-next`, `ROUTES_AT_ONCE` 3, 10 runs each, with temporary logs (removed before commit):

  | Code | Routes that needed the re-check | "closed" or "Unable to capture" errors in the server log | Wall p50 |
  |---|---|---|---|
  | main | 8 in 10 runs | 148 | 16.1 s |
  | busy guard only (not shipped) | 0 | 119 (absorbed by the peek retry) | 15.7 s |
  | branch (committed code) | 0 | 0 | 13.9 s |

  The re-check in `port-review-routes.ts` stays as a guard. All 30 runs gave the same scores and note.
- **Bold in a link** (`app/page.tsx`: `<Link href="/terms"><strong>the terms</strong></Link>`), driven with playwright-core in the running app:
  - Enter, select "the terms": Bold is on and Link is on (`pressed` class). Before, Bold was off (`tag` was `a`).
  - Click Bold: `isRemove: true`, 200. The source is `<Link href="/terms">the terms</Link>`, with no `<strong>` left. `next build` passes.
  - Mod+Z: `edit-history/undo` 200. The `<strong>` is back.
  - Select only "terms", then Bold: only "terms" loses bold (`<strong>the </strong>terms`).
  - Mod+B sends the same body as the bar.
  - Screenshots: `cycle-38/polish-38/range-bar-bold-in-link-{dark,light}.png` and `range-bar-page-{dark,light}.png`.
- **OS keyboard Cmd+Z through the menu: not run.** `ioreg` reports `CGSSessionScreenIsLocked = true`, so `osascript` keystrokes reach no app. A CDP key event does not count. I did not pack the app.
- **First `port.start`** on `ds-wt/p38-big`: `p38-next` plus 20,000 generated files, 202 commits. 5 fresh data folders, then import, route copy of `/visits`, then `port.start` (single page) over HTTP:

  | Code | First call p50 | Range | Second call |
  |---|---|---|---|
  | main path (branch has no port.start change) | 635 ms | 618 to 637 ms | 133 to 144 ms |

  A temporary log showed the first app version save runs inside `port.start` (`startAssetRun` → `startHeldRun` → `holdEditsForFirstVersion`) and takes 519 ms here. p50 is already under 2,000 ms, so by the stop rule I changed nothing. The polish-35 2.5 s figure came from the Bonaparte clone. A synthetic repo with tracked files does not show that cost.
- **Passed** `pnpm run typecheck`, `pnpm run lint:gate` (59,620, baseline 89,733), `pnpm run build:ui`, and `check-bundle`: B1 274,703 B, delta 0.
- No action or tool was added or changed, so there is no `call-action.ts` run. The preview fix serves every surface (HTTP `port.start`, MCP `inspect_port`, agent runs). The Bold fix is bar only.

## Files outside the spec list

No other pick owns these: `ui/features/text-range/{text-range-buttons.tsx,use-text-range.ts,use-text-range-actions.ts}` (the call sites of `toIsRemove` and the pressed state).

## Left out and findings

- **Menu Cmd+Z by OS keyboard:** not run (screen locked).
- **port.start fix:** not tried. The stop rule applies (p50 635 ms).
- **Finding:** in an app project with no saved canvas frame, `apply-range-text` answers "The file of this layer was not found." The text-search scope builds its app files from canvas frames. After "Pick a route" adds a frame, it works. This happens on main with Mod+B too. I did not fix it.
- **Missing roadmap:** `.claude/goal/roadmap.md` is not in the worktree, so I added no Appendix A entry.
- **Fixtures:** `fl-next` was gone. I rebuilt `ds-wt/p38-next` from the cycle 37 run prompt. The packages are `cp -c` copies from the Bonaparte pnpm store (read only), and `node_modules/.bin/next` is a small script.

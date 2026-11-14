# Cycle 24 pick 1: type-rhythm

Branch `feat/type-rhythm`. No new action. A new review kind, `type` ("Type and spacing"), serves `review_frame` (`direct-edit.runReview`), `apply_fix` (`direct-edit.applyReviewFix`), the Review panel and the final check.

## Changed

- Contracts: `review.ts` adds `"type"` to `REVIEW_KINDS` and the label "Type and spacing". The Review panel shows the group with no UI change.
- Probe: `server/review/type-probe.ts` (a `String.raw` source). It reads each visible direct text owner: font size, line height (`normal` = 1.2), first font family, line count from text rects, characters per line, heading level, and label or block role. It also reads padding and flex or grid gap, and margins on tags with no UA default margin.
- Engine (pure): `server/review/engine/type-{facts,scale,lines,rhythm}.ts`. `toTypeHits` makes one hit per element and merges the hits on the same element into one finding (the final check dedupes on `kind|selector`). Cap: 24.
  - Font sizes: more than 7 (medium), more than 9 (high). Flags non-heading text whose size is used by 2 elements or fewer. Fix: the nearest type token or common size, only within 2 px or 12 %; otherwise `fix: null`.
  - Long lines: block text over 85 characters per line (medium). Fix: `max-width: 65ch`, or `max-w-prose` through a class edit on Tailwind pages.
  - Tight body: 2 or more lines, under 20 px, line height under 1.35 (medium). Fix: `line-height: 1.5` (`leading-normal`).
  - Loose headings: 32 px or more, line height over 1.4 (low). Fix: `line-height: 1.25` (`leading-tight`).
  - Small text: non-label body text under 14 px (low; medium under 12 px). Fix: 14 px or the nearest type token at 14 px or more.
  - Weak hierarchy: largest heading under 1.25 times the body size, or two heading levels less than 2 px apart (medium, no fix).
  - Off-scale spacing: a value off the 4 px step that 3 or more elements share (low). Fix: the nearest spacing token, or the nearest 4 px step.
  - Font families: more than 3 (medium, no fix).
- Runner: `run.ts` runs the type probe together with the layout probe. It passes the hit selectors to the existing review probe, so `source` (also app sources from React fibers) and the classes come from there. `type-drafts.ts` maps the hits to drafts. Type drafts go last in `base`, so the 60-fix dry-run budget serves contrast and tap fixes first. In attached apps each type draft has the `noArbitrary` guard, so `verifyFixes` drops a fix that writes an arbitrary class.
- `review_frame` description names "type scale, line length, line height and spacing steps" (474 chars). The `prompt.ts` hierarchy line adds "Review lists measured type and spacing findings; fix the medium and high ones." (net 0 lines). `critic.ts`, `final-check.ts`, `polish-loop.ts` and `checks.ts` do not change.

## Checked

- HTML seed (10 sizes, 1200 px paragraph, 3-line paragraph at line height 1.1, 48 px heading at 1.6, 3 cards with `padding: 13px`): 10 type findings, 5 high, 1 medium, 4 low. Each has its own selector and `index.html:line:col` (`call-action-run-review-html.txt`).
- UI: Review shows "Type and spacing 10" and "Fix all 9". "Limit line length" on the paragraph wrote `style="max-width: 65ch;"`. Cmd+Z took the file back in one step (`edit-history/undo`). Screenshots: `review-group-{dark,light}.png`, `after-fix-dark.png`.
- Well-set seed (5 sizes, 65ch lines, 4 px steps): 0 findings (`call-action-run-review-clean.txt`).
- Tailwind v4 HTML seed (`text-[13px]` on 2 elements next to 6 `text-sm`): apply wrote `text-sm` in place of `text-[13px]`. The long-line fix wrote `max-w-prose` (`call-action-apply-fix-tailwind.txt`, `review-group-tailwind-dark.png`).
- `call-action.ts direct-edit.runReview`: HTTP and MCP give the same findings with `kind: "type"`. The only diff is `ranAt`. The agent surface is `legacy-agent` off.
- `call-action.ts direct-edit.applyReviewFix`: HTTP applied the fix and changed the file. MCP and the agent ran the handler after it and answered "This finding is gone from the latest review" (the fix is not idempotent).
- Bonaparte, read-only `git grep` of `*.tsx`: `text-[10px]` x250, `text-[11px]` x126, `text-xs` x4177, `text-sm` x5208, 8 files with `max-w-prose` or `max-w-[Nch]`. Bonaparte `git status --short` count is the same before and after (14 lines, not ours).
- `pnpm run typecheck`, `pnpm run lint:gate` (59612, baseline 89733) and `pnpm run build:ui` pass.

## Snapshot diff (decide at merge)

`review_frame` description changed. Snapshot files are not changed.

## Left out

- Agent loop: the mock run on the HTML seed ran no final check. The studio review in the final check runs only for attached apps (`appReviewGaps` needs `project.app`), and no fake React app was set up. The path does not change: type findings reach the final check through `review_frame` like other kinds. The real-model before and after count is open.
- Bonaparte live Review on a dashboard route: not run (needs the app dev server and a database). The grep shows heavy `text-xs` and `text-[10px]` use. On a dashboard the small-text check will list many low findings. Low findings do not reach the agent, and the cap is 24. Check the noise when a live route is available.
- Attached app with type tokens: not run live. The `noArbitrary` guard and token steps are in place.
- When two hits merge on one element, the message repeats the size (for example "13 px" twice).
- Chat agent: `review_frame` in `agent-tool.ts` passes every kind through, so the agent gets type findings on the same `runReview` path. Not exercised in a run. The in-app tool help text (`agent/tool-help.ts`) still lists only the old checks.

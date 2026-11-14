# Cycle 36 pick 4: phone-flow

Branch `feat/phone-flow`, cut from main `79d75cc9f`.

## What it does

- **Added: phone lines in the prototype review.** On an HTML flow run with an edit, `listKitLines` reads the flow once, then renders each flow page (up to 6) at 390 x 844 with the viewport probe (`matrixProbe`: `scroll`, `taps`). Each page has an 8 s timeout. A failed render gives no line.
  - Sideways scroll (`scrollWidth > innerWidth + 1`): "- Phone: plan.html scrolls sideways at 390 px (page 1216 px wide). Let the grid wrap or stack under 640 px, then run run_viewport on plan.html."
  - Tap targets under 44 px: "- Phone: 1 tap target on done.html is under 44 px (first: "Back" 32 x 20 px). Give each one at least 44 x 44 px with padding or min-height, then run run_viewport on done.html."
  - Max 6 lines, then a count line.
- **Changed: one opening per pass, built from the kit, flow and phone line counts (kit first).**
  - Pass 1 names each check that has lines.
  - Pass 2 and later name the gaps that are left when there is a flow or phone line.
  - 0 lines give no opening, so no prompt.
  - The flow-match "Left out" is fixed: after a kit fix loop, flow and phone lines get an opening on pass 2.
  - A kit-only pass 2 still has no opening, as on main. This keeps one kit fix loop.
- No new action, no union member, and no change in `gen-routes` output. MCP agents use `run_viewport` (named in the lines) and `inspect_flow_page`.

## Checks

- **Seed `ds-wt/pf-seed`** (index; plan with a 1200 px grid; done with a 32 x 20 px back link). The script calls `toReviewGaps`, `listKitLines` and `toReviewOpening` with a real Chrome render:
  - Before the fix: 2 phone lines and the phone opening (`seed-before-fix.txt`).
  - After a CSS fix: 0 lines and a null opening (`seed-after-fix.txt`).
- **Kit copy `ds-wt/pf-kit`** (`design-system/components.md` Button recipe, a changed nav, the same phone gaps). The script fixes the kit classes between passes:
  - Main: pass 2 opening is `null`, so the flow line is dropped (`kit-two-pass-main.txt`).
  - Branch: pass 1 has 7 lines and one opening (kit, flow, phone). Pass 2 has the flow and 2 phone lines, and the opening names the linked pages and the 390 px check (`kit-two-pass-branch.txt`).
  - Limit: the script makes the kit gaps once and uses them for both passes. In a live run, the fix-loop edits come after the agent's last review note, so pass 2 often goes through `toPrototypeReviewGaps`. That opening was never null. The script proves the opening for the kit-gaps path, not the live route.
- **Added seconds per pass:** `listPhoneLines` alone takes 0.28 to 0.32 s on the seed, and 0.34 to 0.75 s on the main and branch run trees (3 pages each, rendered in parallel, 3 tries each; `phone-step-time.txt`). These numbers come from a script stub: a local static server and a fresh Chrome context with only the `load` wait. The studio `peekPage` path has its own settle waits and may be slower. The server does not log this step.
- **`call-action.ts viewport.run`** on the seeded `plan.html` at 390 px: http, mcp and agent find the same horizontal scroll (1216 px). The only diffs are the contact-sheet file names, which have a time stamp (`call-viewport-run.txt`).
- **Share link at 390 x 844** (branch run): Welcome, Choose your plan and You're in all have `innerWidth` 390 and `scrollWidth` 390. Tap through works. Screenshots: `phone-flow/share-{dark,light}-{0,1,2}.png`.
- **Commands:**
  - `pnpm run typecheck`: 0 errors.
  - `pnpm run lint:gate`: pass, 59612 diagnostics (baseline 89733).
  - `pnpm run build:ui`: pass.
  - `gen-routes --check`: no change.

## Real-model runs (2 of 2)

Prompt: the cycle-35 yoga prompt plus "The plan picker shows 3 plans side by side.". Sonnet 5.5, fresh data folders. Raw data: `phone-flow/runs.json`.

| | main `79d75cc9f` | branch |
|---|---|---|
| Phone gaps at run end (branch probe) | 0 | 0 |
| Phone lines in the review | n/a | 1 (tap target "Change plan" 92 x 25 px on confirmed.html) |
| Review fix loops | 1 (2 hover findings) | 1 (2 hover findings + 1 phone line) |
| Wall time | 108 s | 104 s |
| Cost | $0.32 | $0.25 |

The gate passes: 0 phone gaps at run end on the branch. On the branch, the phone line went into the first fix loop, and pass 2 had 0 findings. Main also ended with 0 phone gaps. Both runs built a plan grid that stacks at 390 px, so the sideways-scroll line did not fire in a live run. There was one run per side, so model variance is not measured.

## Left out

- No phone tally in the run note ("N phone gaps; after the fix loop M"). That needs more than one line in `prototype-review.ts`.
- Openings from `toPrototypeReviewGaps` (the agent skipped `review_frame`) keep the old "the studio ran them" text. The phone lines are in the prompt, but the opening does not name the phone check. Adding this needs the `toReviewGaps` chain in `prototype-review.ts` to register its gaps.
- The tap line reads the label and size from the probe's `detail` text. If that text changes, the line shows the selector.
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A is not updated.

## Files outside the pick list

- New `apps/desktop/src/server/agent/prototype-review-opening.ts`: the opening text and the counts type. `prototype-kit-review.ts` was over 500 lines with the opening logic in it (`max-lines`, `studio/no-file-growth`). No other pick owns this file.

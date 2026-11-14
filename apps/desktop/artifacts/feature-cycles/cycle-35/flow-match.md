# Cycle 35 pick 2: flow-match

Branch `feat/flow-match`, cut from main `2197e34d9`.

## What it does

- **Added: action `page.inspectFlow`** (`GET /api/projects/:projectId/d/:directionId/pages/flow`, `inspect_flow_page` on MCP and the agent, set `core`, lean).
  - Starts at `entry`, or at the project entry page when `entry` is null. When that page is missing, it uses the root page that no other page links to.
  - Follows local `.html` links (anchors, form actions, script strings), up to 12 pages.
  - Compares each page with the entry page:
    - `part-missing` and `part-changed`: the first `header`, `nav`, `footer`, `[role=banner]` and `[role=navigation]` of the entry page, matched with the page-match engine. `aria-current` and active classes are ignored. A part inside another part is not counted twice: a changed nav inside the header shows as the header.
    - `token-changed`: a `:root` custom property in `<style>` that has a different value.
    - `sheet-missing`: a `rel=stylesheet` or font link that the page lacks.
  - Output `{ gaps: [{ detail, kind, page, part, selector }], pages }`. Errors: `BadRequest` (not HTML), `Conflict` and `NotFound` (the shared direction read can fail with `Conflict`).
- **Added: flow lines in the prototype review.** On an HTML prototype run with an edit, the review lists up to 6 gaps, then a count line. Example: "- Flow: The header on plan.html differs from index.html (1 item changed). Copy the header of the first page (selector body > header) to plan.html with update_matches_page, or change both on purpose."
  - The flow opening asks for a fix loop only when there is a flow gap. A run with 0 gaps gets no new prompt, and a second pass runs while gaps stay.

## Checks

- **call-action, seeded `fm-seed`** (index, plans, done; plans has a renamed nav item and `--brand` `#c2410c`): http, mcp and agent match, 0 diffs. 2 gaps: `part-changed` nav, `token-changed --brand` (`call-1.txt`).
- **Fix:** `page.updateMatches` copied the nav to plans.html and kept its active marks. Next call: only the `--brand` gap is left, 3 surfaces match (`call-2-after-fix.txt`).
- **Error:** `entry: "nope.html"` returns `NotFound` on all 3 surfaces.
- **Review line:** a script that calls `toReviewGaps`, `listKitLines` and `toReviewOpening` on a copy of the main run with one nav item renamed gives the line above and the flow opening. On the unchanged copy it gives no line and no opening (`review-line.txt`).
- **Commands:** `pnpm run typecheck` 0 errors. `pnpm run lint:gate` passes (59604, baseline 89733). `pnpm run build:ui` passes.
- **Screenshots:** `canvas-dark.png` and `canvas-light.png` show the seeded 3 frames (plans has the orange `--brand`). `run-dark.png` and `run-light.png` show the branch run: 3 frames and the run note.

## Real-model runs (2 of 2)

Prompt: the cycle-34 yoga prompt plus "Each screen has the studio header and nav.". Sonnet 5.5, fresh data folders, `POST /api/projects`.

| | main `2197e34d9` | branch |
|---|---|---|
| Flow gaps at run end (branch `inspect_flow_page`) | 0 | 0 |
| Pages compared | index, plan, done | index, plans, done |
| Wall time | 120 s | 103 s |
| Cost | $0.35 | $0.32 |
| Review fix loops | 1 (layout findings) | 1 (layout findings) |

The gate passes (0 gaps on the branch). Main also had 0 gaps, so the flow fix loop did not fire in a live run. One run per side, so model variance is not measured. Raw data: `runs.json`.

## Left out

- No flow tally in the run note ("N flow gaps; after the fix loop M"). That needs more than one line in `prototype-review.ts`.
- Pages that a script builds are read as static files (as the spec says).
- On a kit project, the kit opening wins on pass 1, and pass 2 has no opening. So flow lines after the first kit fix loop are dropped.
- Each HTML prototype run with an edit now runs `studioAppReview` once, also with 0 flow gaps. With no layout target this reads only files. With a layout target, `listOutsideLines` probes the page. No prompt is sent when there are no gaps.
- `page.updateMatches` does not list `page.inspectFlow` in `invalidates`. No UI reads it.
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A is not updated.

## Files outside the pick list

- `apps/desktop/src/server/agent/prototype-kit-review.ts`: `listKitLines` also returns the flow lines, and `toReviewOpening` uses the flow opening for flow gaps. The review lines are built in `final-check.ts`, which no pick may edit, and it calls only `listKitLines`.

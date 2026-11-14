# Cycle 25 pick 3: interaction-check

Branch `feat/interaction-check`. No new action. Two new review kinds, `interaction` ("Hover and focus") and `broken-image` ("Broken images"), serve `review_frame` (`direct-edit.runReview`), `apply_fix` (`direct-edit.applyReviewFix`), the Review panel and the chat agent `review_frame` tool.

## Changed

- Contracts: `review.ts` adds the 2 kinds to `REVIEW_KINDS` and `REVIEW_KIND_LABEL`. The Review panel shows both groups with no UI change. No copy key.
- Probe: `server/review/interaction-probe.ts` (a `String.raw` source, no `*.probe.ts` sibling). It reads every visible, enabled `button`, `a[href]`, `[role=button]`, `summary` and submit, button or reset input (cap 200):
  - Hover: a `:hover` rule that matches the element after `:hover` is removed from the selector. It reads media, layer, supports and nested rules, and skips cross-origin sheets. A `hover:` class also counts.
  - Focus: the outline and box-shadow before and after `focus({ focusVisible: true, preventScroll: true })`, with transitions off for the read. It also checks whether a rule or class sets the outline to none, 0 or hidden. It gives the focus back to the element that had it before.
  - Images: an `img` that is complete with `naturalWidth` 0 and fails `decode()`, so an SVG with no size is not flagged. A computed `background-image` url that fails to load in a new `Image`.
  - Emoji: an element whose own text is 1 or 2 emoji inside a button, link, heading or list item.
- Engine (pure): `server/review/engine/interaction.ts` (`toInteractionHits`, cap 40), plus export lines in `engine/index.ts`.
  - Focus removed: high. The message says "Add a focus-visible ring". No direct fix.
  - No hover style: medium, and low for a text link inside a paragraph. Fix: when the element has a `bg-<color>-<step>` class, add `hover:bg-<color>-<next step>` (600 gives 700). There is no fix at step 950 or for an arbitrary value.
  - Broken image: high. The message names the url, `set_image` and `search_images`. No direct fix.
  - Emoji as icon: low. The hint names `list_icons`.
- Runner: `run.ts` runs the probe together with the layout and type probes. It sends the hit selectors to the main review probe, which gives the source (also app sources from React fibers) and the classes. `server/review/interaction-drafts.ts` (new, not in the spec list) maps the hits to drafts. It also holds the probe cap, so `run.ts` stays at 20 imports (`max-dependencies`). The fix is a class edit only on Tailwind pages. Attached apps get the `noArbitrary` guard.
- `review_frame` description adds "hover and focus styles and broken images" (516 chars). `agent/tool-help.ts` lists type, interaction and broken-image in both `review_frame` entries (the short one is 157 chars).

## Checked (studio on port 47930, `STUDIO_AGENT=mock`, data in `ds-wt/interaction-check-data`)

- HTML seed (a button with no hover rule, a button with `outline: none` and no focus rule, `<img src="missing.png">`, a `background-image: url(gone.jpg)` box, a button whose text is one emoji, and a prose link with a `p a:hover` rule): 5 findings, 3 high, 1 medium, 1 low. Each has its own selector and `index.html:line:col`. The prose link gives no finding (`call-action-run-review-seed.txt`).
- Clean seed (`outline: none` with a `:focus-visible` box-shadow and `transition: all`, a hover rule inside `@media (hover: hover)`, a hover rule inside `@layer`, nav links with hover, a loaded SVG `img` with no size and an SVG background): 0 findings (`call-action-run-review-clean.txt`).
- Tailwind v4 HTML seed (CSS built locally with `@tailwindcss/node`): `bg-blue-600` with no `hover:` gives medium with the fix "Add hover:bg-blue-700". A link in a paragraph gives low. A button with `hover:bg-blue-700` (Tailwind puts it in `@media (hover: hover)`) gives no finding. In the UI, the fix button wrote `hover:bg-blue-700`, and Cmd+Z took the file back in one step (`call-action-run-review-tailwind.txt`).
- `call-action.ts direct-edit.runReview`: HTTP and MCP give the same findings with `kind: "interaction"` and `"broken-image"`. The only diff is `ranAt`. The agent surface is `legacy-agent` off.
- `call-action.ts direct-edit.applyReviewFix`: HTTP and MCP applied the fix (the class add is the same both times). The agent answered "This finding is gone from the latest review" (`call-action-apply-fix-tailwind.txt`).
- Screenshots of the Review panel with both groups: `review-dark.png`, `review-light.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` (59606, baseline 89733) and `pnpm run build:ui` pass.
- Bonaparte: read-only `git grep` only. `git status --short` has 14 lines before and after (none are ours).

## Snapshot diff (decide at merge)

The `review_frame` description changed. The snapshot files did not change.

## Left out

- Fix-loop check: it needs pick 1 (prototype-check). Today the final check runs the studio review only for attached apps. After pick 1 merges, run a mock run on the HTML seed and look for the high findings in the fix-loop prompt.
- Bonaparte live Review on a route: not run, because it needs the app dev server and a database. The shadcn `Button` in `packages/ui/src/components/button.tsx` has 6 `hover:` and 2 `focus-visible:` class lines, so the hover and focus checks should stay quiet on it. Check the count when a route renders.
- Emoji findings use the `interaction` kind ("Hover and focus"), because the spec names only 2 groups.
- No hover fix for buttons with no fill class (outline or ghost buttons), or in projects that are not Tailwind. They get `fix: null`.
- A broken image inside `loading="lazy"` that has not started to load is not checked.
- No real-model runs (the spec needs none for pick 3).

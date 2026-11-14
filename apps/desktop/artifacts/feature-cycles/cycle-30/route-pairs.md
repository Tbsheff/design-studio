# Cycle 30 pick 1: route-pairs

Branch `feat/route-pairs`, cut from main `f224e3a68`.

## What changed

- **Pairs.** The port probe reads each shown element on both pages (box and 15 computed values) after the kept-text hide and the row limit. New `port-pairs-probe.ts` holds the in-page source. New `port-pairs.ts` pairs app and prototype elements:
  - First by the same text (case-folded, data rows left out). Nested elements with the same text pair from the innermost out.
  - Else by the same tag and order (table, thead, img, button, section, main and other structure tags).
  - Data rows and their cells, and hidden kept text, are never in a pair.
- **Values** (new `port-pair-values.ts`): margin-top, margin-bottom, the 4 paddings, gap, font-size, line-height, font-weight, border-width (4 sides as one item), border-radius, height and width.
  - Lengths count from 2px.
  - font-weight, font-size and border-width count from 1px. A 1px border against none and 16px against 15px text are real faults, and the 2px rule hid them.
  - `line-height: normal` shows as `normal (18px)` (1.2 times the font size), so it compares as a number.
- **First shift.** The first pair in document order whose top offset changes by 2px or more from the pair before it. `above` is the element just above it. When that element is an ancestor, the parent is reported with its top values.
- **Output.** `PortElementSchema` has `diffs` (max 6). `PortMatchSchema` has `firstShift` (`{ shift, element, above }` or null). Low areas list up to 3 pairs that have style diffs, with 8 pairs per check in all (first shift included). The old named elements fill the free slots with `diffs: []`. The `inspect_port` description has 1 new sentence (573 chars). `gen-routes` ran, and `--check` passes.
- **Fix loop** (`agent/port-review.ts`):
  - It has a first-shift line, for example `- First shift: content from main > div.card is 20px higher than the prototype. Above it, main > h1 "Patients": margin-bottom app 4px, prototype 24px. Give it the prototype values; it is not kept text.`
  - The area lines show each element's values.
  - The kept line adds "Do not edit the kept app text or its margins."
  - A second loop runs only when the first raised the score, the score is still low, and the first loop took 60 s or less.
- **Run note**: "...; hid 1 extra data row on the app page." The note also names 2 loops when 2 ran.
- **Fix differences** (`ui/features/chat/port-check-model.ts`) builds its prompt from the same first-shift, masked and area value lines.

## Checked

Setup: `ds-wt/rf-next` (Next 16.4.1, `.jsx`, plain CSS) and `ds-wt/rf-next-tw` (the same app with Tailwind 4.2.2). `node_modules` is a dereferenced copy of the closure from the Bonaparte pnpm store (read only). Studio ran on port 7310 with MCP on 7320, data in `ds-wt/route-pairs-data`. The route copy was taken before the app change ("Ward list for today." and 6 rows). The copy page was then replaced with `cycle-29/route-fidelity/replay-inputs/prototype-index.html`.

No-model replay (`replay-scores.txt`), `inspect_port` output:

| App files | Main | Branch |
|---|---|---|
| cycle-29 real run 2 | 71 | 71. `firstShift`: div.card 20px higher; **above `h1 "Patients"`: margin-bottom app 4px, prototype 24px** (gate passes) |
| Correct port | 99 | 99, no low area, `firstShift` null, no diffs |
| Fault (`.card` no border, `.title` 20px) | 50 | 50. `firstShift` names `border-width` 0px/1px on the card, and `font-size` 20px/32px and height on the h1 |

`call-action port.inspect`: http, mcp and agent pass with 0 diffs (`call-action-inspect.txt`).

Real model, 2 runs (local sign-in, Sonnet 5.5), Move to app of the copy onto `/patients` after the app change:

| Run | App | First studio score | Loops | After loops | Kept text edited | Data reads kept | Sample rows in `app/` | Time | Cost |
|---|---|---|---|---|---|---|---|---|---|
| 1 | rf-next | 99 | 0 | 99 | no (it added a class only) | yes (2) | 0 | 39 s | $0.139 |
| 2 | rf-next-tw | 65 | 2 | 69, then 65 | no (it added classes only) | yes (2) | 0 | 34 s | $0.167 |

- **Run 1.** The agent's own `inspect_port` call returned the pairs. It then changed `.title` margin from `0 0 8px` to `0 0 24px`, which is the cycle-29 run 2 fault, and scored 99 before the studio check. Files: `real-run-1-rf-next/`.
- **Run 2: under 80.** The fix prompts are in `real-run-2-fix-prompts.txt`. The cause, from its `diffs`:
  - `h1` margin-bottom app 8px against 24px. The agent did not change it in either loop.
  - The table font-size is 16px against 15px, with line-height 20px against normal.
  - `main` width is 896px against 880px (`max-w-4xl`).
  - The agent changed the padding and the leading instead, and the second loop undid the first.
  - The second loop ran because the first raised the score (65 to 69).
- **Changes after run 2** (commit `8b70e1a2b`):
  - The first-shift line now says "Give it the prototype values; it is not kept text."
  - `line-height: normal` resolves to px.
  - font-size counts from 1px.
  - No budget was left for a third real run.
  - As a no-model check, I applied only the listed values by hand (`mb-6 text-[32px]`, `max-w-[880px]`, `text-[15px]`, `leading-[normal]`). The score went from 65 to 96, with no low area and no shift (`tw-diffs-check.txt`, `tw-handfix.diff`).
- **UI.** `run-note-{light,dark}.png` show the tw run note with "2 fix loops ran ... hid 1 extra data row on the app page" and the 65% port check row. `fix-prompt-{light,dark}.png` show the "Fix differences" prompt with the first-shift, kept, data-row and area value lines. That prompt started a mock run (`mock-fix-differences-run.txt`).
- **Final checks.** `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59601 diagnostics, baseline 89733). `pnpm run build:ui` passes. `gen-routes --check` passes.

## Left out

- **The tw gate (80 or more after the loops) is not met in a real run.** Run 2 ended at 65. The wording and value fixes made after it have only the no-model check above.
- **Fixture copy.** Both real runs used a plain route copy (with `.db-ok` present), not a fixture copy.
- **Sibling order.** Structural pairing uses tag order in the whole page, not order among siblings under the paired parent. Text pairs cover the test pages.
- **Duplicate text.** The h1 can show in `firstShift` and as a named element in its area. The area entry then has no diffs, so the prompt shows the values once.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added. New files: `review/port-check/{port-pairs.ts,port-pairs-probe.ts,port-pair-values.ts}`. `port-pair-values.ts` is a third new file, split out to keep `port-pairs.ts` under 500 lines.

# Cycle 33, pick 2: kit-badges

Branch `feat/kit-badges`. The prototype kit check now finds hand-styled badges and status pills, and maps each one to the app Badge variant.

## What changed

- **Added `badge`** to `KitDriftTagSchema` and `DriftTag`, and to every `Record<DriftTag, ...>`: `COMPONENT_NAMES`, `COMPONENT_OF`, `TAG_WORDS` and `PLURAL_WORDS`.
- **Added a `variant` field** (`string | null`) to each find. It holds the picked Badge variant for a badge and is null for every other tag. On a badge find, `suggestedVariant` is set to the same value, so the two fields never give different answers. `parts` stays empty for a badge.
- **Added `engine/to-badge-drift.ts`** (pure, parse5). It flags a `span`, `div`, `a` or `p` when all of these are true:
  - the app has a Badge recipe;
  - the element has a radius, a background or a border, horizontal padding, and 12 to 14 px text. These signals come from Tailwind classes, inline `style`, `<style>` blocks and linked local CSS;
  - its text is 1 to 3 words and 24 chars or less, with at most one icon or empty dot child.
  - It skips a kit Badge (`data-slot="badge"` or all base classes) and everything inside it. It also skips buttons, inputs, selects, text areas and link buttons, so those tags win.
  - It flags pills in table cells.
- **Added `engine/to-badge-variant.ts`** (pure). It picks the variant from the background hue first, then from the text hue. It reads Tailwind palette names, semantic names (`bg-destructive`, `text-success`), and hex, rgb, hsl and oklch values. The mapping:
  - red to `destructive`;
  - amber, yellow or orange to `warning`;
  - green to `success`;
  - blue to `info`;
  - a border with no background to `outline`;
  - gray to `secondary`;
  - anything else to `default`.
  - It returns only variants that the recipe has; otherwise it returns the recipe default.
  - Dropped and kept classes use the base classes plus the classes of the picked variant.
- **Changed `agent/prototype-kit-review.ts`** to add the badge line: "N badges are hand-styled (file:line variant, ...). Replace the hand-styled badge with the app Badge (variant X | per place); keep the text." The line also gives the Badge base classes, `data-slot="badge"` and the classes of each variant used. The fix loop rule did not change, and `toGroups` did not change.
- **Changed the `kit-drift.list` description** to name badges. It is now 596 chars. `gen-routes` ran and gave no generated diff.

## Checks

- **call-action `kit-drift.list`** on a prototype beside `ds-wt/kb-next` (Next 16, Tailwind 4, shadcn Badge with `default`, `secondary`, `outline`, `success`, `warning` and `destructive`, plus Card and Button). Source: `kit-badges/kb-fixture.html`. Output: `kit-badges/kb-call-proto.txt`.
  - Passed on http, mcp and agent with 0 diffs.
  - Found 6 badges: green `success`, amber `warning`, red by linked CSS `destructive`, gray with a dot `secondary`, inline-style border `outline`, and the table-cell pill `destructive`.
  - Found 0 badges for the kit Badge. The small rounded button stays a `button` find.
  - The app-source path on kb-next passed on 3 surfaces (`kb-call-app.txt`).
- **Fix line script** (`kb-loop-check.txt`): the line lists the 6 places with variants and the recipe. After `data-slot="badge"` was added, the re-scan found 0 badges (`kb-loop-after.txt`).
- **Real runs.** Prompt: "a visit list with a status pill per row: scheduled, completed, missed, cancelled", beside kb-next. Both results were scored with the branch `list_kit_drift`.

| | main | branch |
|---|---|---|
| First-pass kit finds | 1 (the button) | 9 (8 pills, 1 button) |
| Hand-styled badges at end | 0 seen (see note) | 0 |
| Kit Badge uses (`data-slot="badge"`) | 0 | 8 |
| Fix loops | 1 | 1 |
| Time, cost | 73 s, $0.21 | 56 s, $0.19 |

  - The branch gate passes: 0 hand-styled badges, and all 8 pills have the Badge base classes and `data-slot`. The agent kept the page CSS colours and did not add the variant classes.
  - Note on main: the agent rendered its pills from a JS template literal (`<span class="pill" data-s="${...}">`). The scanner reads static HTML, so it cannot see those pills. The main result has 0 kit Badges, but its hand-styled pills are not counted.
- **Screenshots**: `cycle-33/kit-badges/run-note-{dark,light}.png` show the branch run prototype and the Studio check note.
- **Gates pass**: `pnpm run typecheck`, `pnpm run lint:gate` (59605 against baseline 89733), `pnpm run build:ui` and `gen-routes --check`.

## Left out

- Badges in markup that a script renders (template literals, `innerHTML`). The check reads static HTML only. The main real run shows this gap.
- Badge detection in app source (TSX). `toDriftTag` never returns `badge`, and `apply_kit_drift` has no badge splice.
- Element and id CSS selectors, and `@import` in CSS (the same limits as cards).
- Font size inherited from a parent. The pill must set its own size.

## Files outside the spec list

- `components/kit-drift/engine/to-badge-variant.ts` is new. I split it out of `to-badge-drift.ts` to keep each file within the size and complexity limits.
- No other pick owns this file.

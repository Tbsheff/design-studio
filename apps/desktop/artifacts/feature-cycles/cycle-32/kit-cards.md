# Cycle 32, pick 3: kit-cards

Branch `feat/kit-cards`. The prototype kit check now finds hand-styled cards and maps them to the app Card recipe.

## What changed

- **Added `card`** to `KitDriftTagSchema` and `DriftTag`. Each find has a new `parts` field (empty for controls). `list_kit_drift` input does not change. Its description names cards (588 chars). `gen-routes` gives no diff.
- **Added `engine/to-card-drift.ts`** (pure, parse5). It flags a `div`, `section`, `article`, `aside` or `li` with 2 or more element children when the app has a Card recipe and the block has all 4 signals: border or shadow, radius, background, padding. Signals come from Tailwind classes, inline `style`, `<style>` blocks and linked local CSS (class rules; `:hover` rules do not count).
  - Skips a kit Card (`data-slot="card"` or all Card base classes) and everything inside it.
  - Flags only the outer card; skips tables, cells, scripts and templates.
  - `parts`: `CardHeader, CardTitle, CardContent` when a heading is first (or first inside the first child), else `CardContent`; only parts that the kit has.
- **`kit-drift-prototype.ts`** reads linked local stylesheets of each page and passes the CSS to the engine.
- **`agent/prototype-kit-review.ts`**: the card line says "Replace the hand-styled card with the app Card (CardHeader, CardTitle, CardContent); keep the content." and gives the Card and part recipe classes and `data-slot`. Fix loop rule and note joiner unchanged.

## Checks

- **call-action `kit-drift.list`** on a seeded prototype beside `ds-wt/kd-next` (4 hand-styled cards: 2 by linked CSS, 1 by a `<style>` rule, 1 by Tailwind classes with a nested card; 1 kit Card; 1 card in a table cell; 1 plain block): http, mcp and agent pass, 0 diffs, 4 card finds, 0 for the kit Card, the cell card and the nested card (`kit-cards/kd-call-proto.txt`). The app-source path on kd-next passes on 3 surfaces.
- **Fix line script** (`kit-cards/kd-loop-check.txt`): lists "4 cards are hand-styled" with the parts and recipes. After `data-slot="card"` is added, the re-scan has 0 card finds (`kd-loop-after.txt`).
- **Real runs** (prompt "a clinic dashboard with 4 stat cards and a visit list", beside kd-next, both scored with the branch `list_kit_drift`):

| | main | branch |
|---|---|---|
| Hand-styled cards at end | 0 | 0 |
| Kit Card uses | 0 | 0 |
| Fix loops | 1 | 1 |
| Time, cost | 81 s, $0.22 | 94 s, $0.31 |

  Both agents built one bordered stat strip (4 cells, no background), not 4 cards, so the card rule had nothing to find. The real runs do not prove the card fix loop; only the script check does.
- **Screenshots:** `cycle-32/kit-cards/run-note-{dark,light}.png` (branch run, prototype and the Studio check note).
- **Gates pass:** `pnpm run typecheck`, `pnpm run lint:gate` (59619 against baseline 89733), `pnpm run build:ui`, `gen-routes --check`.

## Left out

- Card detection in app source (TSX). `toDriftTag` never returns `card`; `apply_kit_drift` has no card splice.
- Element and id CSS selectors, `@import` in CSS.
- A real run where the agent writes hand-styled cards.

## Files outside the spec list

- `components/kit-drift/kit-drift-prototype.ts` (linked CSS), `components/kit-drift/kit-drift-list.ts` (`parts` field), `packages/common/actions/src/kit-drift/list.ts` (description).

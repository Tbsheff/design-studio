# Editorial

## Visual Theme & Atmosphere

This pack makes a screen read like a printed magazine page. Dark ink sits on warm, off-white paper. Big serif headlines carry the voice. A calm humanist sans carries the long text. One deep oxblood color marks links and the single main action.

The mood is slow and literate. Type earns attention, not color blocks or shadows. Thin rules, columns and white space give structure, as in print. The serif has an optical-size axis: large headlines look sharp, small serif text looks sturdy. Radii are small (2px to 6px).

Use it for long-form articles, essays, journals, reports and newsletters: any product where reading is the main task.

## Color Palette & Roles

All values are OKLCH. The dark column is the value from `$extensions.studio.modes.dark`.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `oklch(96.5% 0.014 85)` | `oklch(17% 0.01 60)` | Page background: warm paper. |
| `--surface` | `oklch(98.8% 0.007 85)` | `oklch(21% 0.011 60)` | Cards, panels, inputs, raised sheets. |
| `--fg` | `oklch(21% 0.018 55)` | `oklch(93% 0.014 85)` | Body text and headings: brown-black ink. |
| `--fg-muted` | `oklch(46% 0.02 60)` | `oklch(73% 0.016 75)` | Bylines, captions, dates, placeholders. |
| `--border` | `oklch(86% 0.018 80)` | `oklch(32% 0.012 60)` | Hairline rules, input and card outlines. |
| `--primary` | `oklch(40% 0.13 22)` | `oklch(70% 0.12 22)` | Oxblood: links, the one filled button, drop caps. |
| `--primary-fg` | `oklch(98% 0.01 85)` | `oklch(17% 0.03 22)` | Text and icons on `--primary`. |
| `--accent` | `oklch(92% 0.03 40)` | `oklch(29% 0.05 22)` | Soft blush fill: tags, selected rows, callouts. |
| `--accent-fg` | `oklch(36% 0.12 22)` | `oklch(86% 0.06 30)` | Text and icons on `--accent`. |
| `--success` | `oklch(47% 0.1 150)` | `oklch(74% 0.11 150)` | Positive status icons, fills, borders. |
| `--warning` | `oklch(58% 0.12 70)` | `oklch(80% 0.12 75)` | Caution status icons, fills, borders. |
| `--danger` | `oklch(50% 0.18 0)` | `oklch(72% 0.15 5)` | Destructive and error icons, fills, borders. |
| `--ring` | `oklch(40% 0.13 22)` | `oklch(70% 0.12 22)` | Focus outline. |

Rules:

- Oxblood is rare: links, one filled button, drop caps, kickers. Never fill large areas with it.
- `--success`, `--warning` and `--danger` are for fills, icons and borders. Do not use them for small body text. Always pair the color with an icon or a word ("Error:", "Saved").
- Primary pressed: `color-mix(in oklab, var(--primary) 78%, var(--fg))`.
- Subtle hover fill on quiet rows: `color-mix(in oklab, var(--accent) 50%, var(--surface))`.

## Typography Rules

### Families

- Display: `var(--font-display)`, Fraunces. Set `font-optical-sizing: auto` so the opsz axis (9 to 144) follows the size.
- Body: `var(--font-body)`, Source Sans 3.
- Mono: `var(--font-mono)`, JetBrains Mono, for code and data only.

### Scale

The scale is a perfect fourth (ratio 1.333) up from a base of 1.125rem (18px). Below base the ratio is 1.125, so small text stays legible.

| Element | Token | Size | Family | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|---|
| h1 | `--text-4xl` | 4.735rem | display | 400 | 1.05 | -0.02em |
| h2 | `--text-3xl` | 3.552rem | display | 400 | 1.1 | -0.015em |
| h3 | `--text-2xl` | 2.665rem | display | 600 | 1.1 | -0.01em |
| h4 | `--text-xl` | 1.999rem | display | 600 | 1.15 | 0 |
| h5 | `--text-lg` | 1.5rem | display | 600 | 1.2 | 0 |
| h6 | `--text-base` | 1.125rem | body | 600 | 1.3 | 0 |
| body | `--text-base` | 1.125rem | body | 400 | 1.6 | 0 |
| caption | `--text-sm` | 1rem | body | 400 | 1.5 | 0 |
| label / kicker | `--text-xs` | 0.889rem | body | 600 | 1.3 | +0.08em, uppercase |

### Weights

Only these weights load: Fraunces 400, 600 and 400 italic; Source Sans 3 400, 600 and 400 italic; JetBrains Mono 400. Do not ask for 300, 500 or 700. The browser will fake them.

- h1 and h2 use Fraunces 400; the contrast at large sizes gives enough weight. Use 400 italic for deks and pull quotes.
- Text below 18px is never lighter than 400.

### Reading rules

- Body text is 18px (`--text-base`). Never set running text below 16px.
- Cap the measure at 65ch for article body. Never exceed 75ch.
- Headings: `text-wrap: balance`. Deks and descriptions: `text-wrap: pretty`.
- Numbers that change (counts, prices, read time, tables): `font-variant-numeric: tabular-nums`.
- Article paragraphs: `margin-block-end: var(--space-6)`, no indent.

### Editorial details

- **Drop cap**: first letter of the first paragraph. `float: left`, `var(--font-display)`, weight 600, about 3 lines high (`font-size: 4.2em; line-height: 0.85`), color `var(--primary)`, `margin-inline-end: var(--space-2)`.
- **Kicker**: label style, color `var(--primary)`, above the headline.
- **Byline**: `--text-sm`, `var(--fg-muted)`; author name 600 in `var(--fg)`.
- **Pull quote**: Fraunces 400 italic, `--text-xl`, `var(--fg)`. Top and bottom 1px `var(--border)` rules, `padding-block: var(--space-6)`. Max 30ch.

## Component Stylings

### Buttons

All buttons: `var(--font-body)`, weight 600, `--text-sm`, `border-radius: var(--radius-sm)`, `min-height: 44px`, `padding: var(--space-3) var(--space-6)`. Compact size: `min-height: 36px`, `padding: var(--space-2) var(--space-4)`.

- **Primary**: `background: var(--primary)`, `color: var(--primary-fg)`, no border. Hover `color-mix(in oklab, var(--primary) 88%, var(--fg))`. Only one filled primary button per view.
- **Secondary**: transparent fill, `1px solid var(--fg)`, `color: var(--fg)`. Hover fill `var(--surface)`.
- **Ghost**: no fill, no border, `color: var(--primary)`. Hover adds an underline (1px, `text-underline-offset: 0.2em`).
- **Destructive**: `1px solid var(--danger)`, `color: var(--fg)`, a warning icon in `var(--danger)`. In a confirm dialog it may take the filled spot: `background: var(--danger)`, `color: var(--primary-fg)`.
- Focus on all: `outline: 2px solid var(--ring); outline-offset: 2px`.

Inline links: `color: var(--primary)`, 1px underline, `text-underline-offset: 0.18em`.

### Inputs

- `background: var(--surface)`, `1px solid var(--border)`, `border-radius: var(--radius-sm)`, `min-height: 44px`, `padding: var(--space-2) var(--space-3)`.
- Font `var(--font-body)` at `--text-base`. On mobile the size is never below 16px, so the browser does not zoom.
- Label above the field: `--text-sm`, weight 600, `margin-block-end: var(--space-2)`.
- Focus: `outline: 2px solid var(--ring); outline-offset: 2px`. Keep the border.
- Error: border `var(--danger)`, an icon, and a message in `var(--fg)` under the field.

### Cards

Cards are story teasers, not boxes. Default card: no fill, no shadow, `border-top: 1px solid var(--border)`, `padding-block-start: var(--space-4)`. Order: image (`--radius-sm`, 3:2), kicker, headline (`--text-lg` or `--text-xl`, display), dek (`--text-sm`, `var(--fg-muted)`, pretty), byline. Hover: the headline gets an underline. Boxed card (forms): `var(--surface)`, `1px solid var(--border)`, `var(--radius-md)`, `padding: var(--space-6)`.

### Nav / top bar

Height 64px. `background: var(--bg)`, `border-bottom: 1px solid var(--border)`. Masthead or wordmark in `var(--font-display)` 600 at `--text-lg`, centered or left. Section links use the label style in `var(--fg)`; the active one has a 2px `var(--primary)` underline. Sticky is fine; add `var(--shadow-sm)` only after scroll.

### Hero

An article opener, not a marketing banner. Kicker, then h1 (balanced, max 18ch), then a dek in Fraunces 400 italic at `--text-xl` and `var(--fg-muted)` (max 40ch), then the byline. Then a lead image with a `--text-sm` caption. Padding `var(--space-16)` top, `var(--space-12)` bottom.

### Tables

Print-style. No vertical lines, no zebra fill. A 2px `var(--fg)` rule above the head and below the last row; 1px `var(--border)` between rows. Header cells: label style, `var(--fg-muted)`. Cells `padding: var(--space-3) var(--space-4)`, `--text-sm`. Numbers right-aligned with `tabular-nums`. Selected row: `var(--accent)` fill. 

### Badges / tags

`background: var(--accent)`, `color: var(--accent-fg)`, label style (`--text-xs`, weight 600, uppercase, +0.08em), `padding: var(--space-1) var(--space-2)`, `border-radius: var(--radius-sm)`. Status badges add a 6px dot or icon in the status color; the text stays `var(--fg)`.

## Layout Principles

- Article column: `max-width: 65ch` (about 680px at 18px), centered.
- Wide figures and pull quotes may break out to 880px.
- Page container: `max-width: 1200px`, inline padding `var(--space-6)` on desktop, `var(--space-5)` on mobile.
- Grid: 12 columns, gutter `var(--space-8)` on desktop, `var(--space-6)` on tablet. Story grids use 3 or 4 columns; a lead story may span 8 of 12.
- Section rhythm: `var(--space-20)` between major sections, `var(--space-12)` between groups inside a section, `var(--space-6)` between paragraphs and blocks.
- Mark section starts with a 1px `var(--border)` rule and a kicker, not a colored band.
- A narrow side column (notes, footnotes) beside the text at 4 / 8 is good.

## Depth & Elevation

Paper is flat. Depth is the exception.

- **Borders first.** 1px `var(--border)` is the main tool to separate things. A heavier 2px `var(--fg)` rule marks the start of a major block or a table.
- **`--shadow-sm`**: sticky top bar after scroll, small menus attached to a control.
- **`--shadow-md`**: dropdowns, popovers, toasts.
- **`--shadow-lg`**: modal dialogs and side sheets only, over a `color-mix(in oklab, var(--fg) 40%, transparent)` scrim.
- Story cards get no shadow.

## Do's and Don'ts

### Do

- Let size, serif versus sans and italic set the hierarchy.
- Keep the article column at 60 to 75 characters.
- Use thin rules, kickers and bylines to give structure.
- Use Fraunces italic for decks and pull quotes.
- Keep oxblood to links, one button and small marks.

### Don't

- Do not use gradients, glass effects or colored hero bands.
- Do not use radii above `var(--radius-lg)` except pills.
- Do not set body text in Fraunces. It is for display and quotes.
- Do not use font weights that the pack does not load.
- Do not use status colors for body text, or color alone to show status.
- Do not place two filled primary buttons in one view.

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| < 640px | One column. h1 drops to `--text-2xl`, h2 to `--text-xl`. Page padding `var(--space-5)`. Nav collapses to masthead and a menu button (44px target). Section gap `var(--space-12)`. Pull quotes lose breakout. Tables scroll inside a wrapper. |
| 640px – 1023px | Story grid 2 columns, gutter `var(--space-6)`. h1 at `--text-3xl`. Side notes move under the text. |
| 1024px – 1279px | Full 12-column grid, gutter `var(--space-8)`. h1 at `--text-4xl`. Side column at 4 / 8. |
| >= 1280px | Container stops at 1200px. Wide figures break out to 880px. |

Touch targets are 44px or more at all sizes.

## Agent Prompt Guide

1. Set `body` to `var(--font-body)` at `var(--text-base)`, line-height 1.6, `color: var(--fg)`, `background: var(--bg)`. Set every heading in `var(--font-display)` with `font-optical-sizing: auto` and `text-wrap: balance`.
2. Cap article text at 65ch. Use a 1200px page container and a 12-column grid.
3. Separate content with 1px `var(--border)` rules and white space. Use shadows only for menus, popovers and dialogs.
4. Use `var(--primary)` only for links, one filled button per view, drop caps and kickers. Hover with `color-mix(in oklab, var(--primary) 88%, var(--fg))`.
5. Load only the weights in pack.json: Fraunces 400, 600, 400 italic; Source Sans 3 400, 600, 400 italic; JetBrains Mono 400.
6. Add editorial details where content allows: kicker, italic dek, byline, drop cap, pull quote, captioned figures.
7. Keep radii at `var(--radius-sm)` or `var(--radius-md)`. Give every focusable item `outline: 2px solid var(--ring); outline-offset: 2px`.

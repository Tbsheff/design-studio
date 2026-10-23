# Modern Minimal

## Visual Theme & Atmosphere

This pack is neutral, exact and quiet. Near-white space does most of the work. One grotesk family sets every word. Thin hairline borders draw the structure. A single deep teal marks the one thing the user should do next.

The mood is calm precision. Nothing is loud, and nothing is there for decoration. Each line, gap and color must have a job. When you are not sure, remove it.

Use it for software products, dashboards, developer tools, docs and product pages. The grays carry a slight cool tint (hue 200), so they do not look dead. Radii are medium (4px to 12px) on a strict 4px grid.

## Color Palette & Roles

All values are OKLCH. The dark column is the value from `$extensions.studio.modes.dark`.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `oklch(99.2% 0 0)` | `oklch(16% 0.003 200)` | Page background. |
| `--surface` | `oklch(97.4% 0.002 200)` | `oklch(19.5% 0.004 200)` | Cards, panels, inputs, sidebars. |
| `--fg` | `oklch(18% 0.004 200)` | `oklch(96% 0.002 200)` | Body text and headings. |
| `--fg-muted` | `oklch(47% 0.006 200)` | `oklch(72% 0.006 200)` | Secondary text, help text, placeholders. |
| `--border` | `oklch(91% 0.003 200)` | `oklch(29% 0.005 200)` | Hairlines, dividers, input and card outlines. |
| `--primary` | `oklch(46% 0.076 200)` | `oklch(76% 0.11 195)` | Deep teal: one filled button per view, links. |
| `--primary-fg` | `oklch(99% 0.004 200)` | `oklch(17% 0.03 200)` | Text and icons on `--primary`. |
| `--accent` | `oklch(95% 0.022 195)` | `oklch(26% 0.035 200)` | Pale teal fill: selected rows, tags, callouts. |
| `--accent-fg` | `oklch(38% 0.063 200)` | `oklch(86% 0.07 195)` | Text and icons on `--accent`. |
| `--success` | `oklch(52% 0.12 150)` | `oklch(76% 0.13 150)` | Positive status icons, fills, borders. |
| `--warning` | `oklch(66% 0.14 70)` | `oklch(80% 0.13 75)` | Caution status icons, fills, borders. |
| `--danger` | `oklch(54% 0.19 27)` | `oklch(70% 0.16 25)` | Destructive and error icons, fills, borders. |
| `--ring` | `oklch(46% 0.076 200)` | `oklch(76% 0.11 195)` | Focus outline. |

Rules:

- About 90% of any screen is `--bg`, `--surface`, `--fg`, `--fg-muted` and `--border`. Teal is the exception.
- `--success`, `--warning` and `--danger` are for fills, icons and borders. Do not use them for small body text. Always pair the color with an icon or a word.
- Primary pressed: `color-mix(in oklab, var(--primary) 78%, var(--fg))`.
- Quiet hover fill for rows and ghost buttons: `color-mix(in oklab, var(--fg) 4%, var(--bg))`.
- Strong hairline (for a hovered input or a selected card): `color-mix(in oklab, var(--border) 60%, var(--fg))`.

## Typography Rules

### Families

- Display and body: Geist, via `var(--font-display)` and `var(--font-body)`. Keep both vars so a theme can split them later.
- Mono: `var(--font-mono)`, Geist Mono, for code, keyboard keys, IDs, hashes and API values.

### Scale

The scale is a major third (ratio 1.25) up from a base of 1rem (16px). Below base the ratio is 1.125.

| Element | Token | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| h1 | `--text-4xl` | 3.052rem | 600 | 1.1 | -0.03em |
| h2 | `--text-3xl` | 2.441rem | 600 | 1.1 | -0.025em |
| h3 | `--text-2xl` | 1.953rem | 600 | 1.15 | -0.02em |
| h4 | `--text-xl` | 1.563rem | 600 | 1.2 | -0.015em |
| h5 | `--text-lg` | 1.25rem | 500 | 1.3 | -0.01em |
| h6 | `--text-base` | 1rem | 600 | 1.4 | 0 |
| body | `--text-base` | 1rem | 400 | 1.55 | 0 |
| caption | `--text-sm` | 0.889rem | 400 | 1.5 | 0 |
| label (overline) | `--text-xs` | 0.79rem | 500 | 1.3 | +0.06em, uppercase |

### Weights

Only these weights load: Geist 400, 500, 600 and Geist Mono 400. Do not ask for 300 or 700.

- 400 for reading text. 500 for UI labels, buttons, nav and table headers. 600 for headings.
- Text below 18px is never lighter than 400.
- Size and weight set hierarchy. `var(--fg-muted)` is the only second gray.

### Reading rules

- Body text is 16px. Never set running text below 16px. `--text-sm` and `--text-xs` are for captions, meta and labels only.
- Cap paragraph measure at 68ch. Never exceed 75ch.
- Headings: `text-wrap: balance`. Descriptions and subtitles: `text-wrap: pretty`.
- Changing numbers (metrics, prices, counters, timers, table values): `font-variant-numeric: tabular-nums`.
- Inline code: `var(--font-mono)` at 0.9em, `background: var(--surface)`, `1px solid var(--border)`, `border-radius: var(--radius-sm)`, `padding: 0 var(--space-1)`.

## Component Stylings

### Buttons

All buttons: `var(--font-body)`, weight 500, `--text-sm`, `border-radius: var(--radius-md)`. Default `height: 40px`, `padding-inline: var(--space-4)`. Small `height: 32px`, `padding-inline: var(--space-3)`. Large `height: 48px`, `padding-inline: var(--space-6)`. Icon and label gap `var(--space-2)`. On touch screens, every button is at least 44px tall.

- **Primary**: `background: var(--primary)`, `color: var(--primary-fg)`, no border. Hover `color-mix(in oklab, var(--primary) 88%, var(--fg))`. Only one filled primary button per view.
- **Secondary**: `background: var(--bg)`, `1px solid var(--border)`, `color: var(--fg)`. Hover border `color-mix(in oklab, var(--border) 60%, var(--fg))`.
- **Ghost**: no fill, no border, `color: var(--fg-muted)`. Hover `color: var(--fg)` and fill `color-mix(in oklab, var(--fg) 4%, var(--bg))`.
- **Destructive**: secondary shape, `color: var(--fg)`, icon in `var(--danger)`, border `var(--danger)` on hover. In a confirm dialog it may take the filled spot: `background: var(--danger)`, `color: var(--primary-fg)`.
- Focus on all: `outline: 2px solid var(--ring); outline-offset: 2px`.
- Disabled: `opacity: 0.5`.

### Inputs

- `height: 40px`, `padding-inline: var(--space-3)`, `background: var(--bg)`, `1px solid var(--border)`, `border-radius: var(--radius-md)`.
- Font `--text-sm` on desktop. On mobile set `--text-base` (16px) so the browser does not zoom.
- Label above: `--text-sm`, weight 500, `margin-block-end: var(--space-2)`. Help text below in `--text-sm` `var(--fg-muted)`.
- Hover: border `color-mix(in oklab, var(--border) 60%, var(--fg))`.
- Focus: `outline: 2px solid var(--ring); outline-offset: 2px`.
- Error: border `var(--danger)`, an icon, and the message in `var(--fg)`.

### Cards

`background: var(--bg)` or `var(--surface)`, `1px solid var(--border)`, `border-radius: var(--radius-lg)`, `padding: var(--space-6)`. No shadow at rest. A clickable card changes its border to the strong hairline on hover; do not lift it. Card title `--text-lg` weight 500; description `--text-sm` `var(--fg-muted)`, pretty. Stat cards: label in overline style, value in `--text-2xl` weight 600 with `tabular-nums`.

### Nav / top bar

Height 56px. `background: color-mix(in oklab, var(--bg) 85%, transparent)` with `backdrop-filter: blur(8px)`, `border-bottom: 1px solid var(--border)`. Wordmark left at `--text-base` weight 600. Links `--text-sm` weight 500 in `var(--fg-muted)`; active and hover in `var(--fg)`. One primary button at the right is the only filled element. App side nav: 240px, `var(--surface)`, hairline right border, 32px items, active item `var(--accent)` with `var(--accent-fg)` text.

### Hero

Left-aligned or centered, on plain `var(--bg)`. Optional overline label, then h1 (max 16ch, balanced), then a subtitle in `--text-lg` `var(--fg-muted)` (max 52ch, pretty), then one primary and one secondary button with `gap: var(--space-3)`. Padding `var(--space-24)` top, `var(--space-20)` bottom. A product image below sits in a `var(--radius-lg)` frame with a hairline border, no glow.

### Tables

Full-width, no outer box, no zebra. Header row: overline label style, `var(--fg-muted)`, `border-bottom: 1px solid var(--border)`. Rows `height: 44px`, `border-bottom: 1px solid var(--border)`, cells `padding-inline: var(--space-3)`, `--text-sm`. Numbers right-aligned with `tabular-nums`; IDs in `var(--font-mono)`. Row hover `color-mix(in oklab, var(--fg) 4%, var(--bg))`; selected row `var(--accent)`.

### Badges / tags

`height: 22px`, `padding-inline: var(--space-2)`, `border-radius: var(--radius-pill)`, `--text-xs` weight 500. Neutral: `1px solid var(--border)`, `color: var(--fg-muted)`. Highlight: `var(--accent)` fill, `var(--accent-fg)` text. Status: neutral badge plus a 6px dot in the status color, text in `var(--fg)`.

## Layout Principles

- Marketing container: `max-width: 1120px`. App content: `max-width: 1280px`. Reading pages (docs, posts): `max-width: 68ch`.
- Page inline padding: `var(--space-6)` mobile, `var(--space-8)` tablet, `var(--space-12)` desktop.
- Grid: 12 columns, gutter `var(--space-6)`. Feature grids use 3 columns; dashboards use 12 with cards spanning 3, 4, 6 or 12.
- Section rhythm on marketing pages: `var(--space-24)` between sections, `var(--space-12)` between a section heading and its content.
- In apps: `var(--space-8)` between page groups, `var(--space-4)` inside cards and forms, `var(--space-2)` between label and field.
- Keep everything on the 4px grid.

## Depth & Elevation

Hairlines first, shadows last.

- **Borders**: 1px `var(--border)` separates cards, tables, inputs, side nav and top bar. This is the default for every static surface.
- **Surface step**: `var(--surface)` on `var(--bg)` gives a quiet second layer with no shadow.
- **`--shadow-sm`**: segmented control thumb, a toggle knob, a dragged row.
- **`--shadow-md`**: dropdown menus, popovers, command menus, toasts. Pair it with a 1px `var(--border)`.
- **`--shadow-lg`**: modal dialogs and drawers only, over a `color-mix(in oklab, var(--fg) 30%, transparent)` scrim.
- Never lift a card on hover.

## Do's and Don'ts

### Do

- Use one teal action per view and let the rest be neutral.
- Use weight 500 for UI text and 600 for headings.
- Use Geist Mono for code, keys and IDs.
- Use `tabular-nums` in tables, stats and timers.

### Don't

- Do not use gradients, glows, glass cards or colored section bands.
- Do not use shadows on cards at rest.
- Do not add a second accent color.
- Do not use font weights that the pack does not load.
- Do not use status colors for body text, or color alone to show status.
- Do not use more than two text colors (`--fg`, `--fg-muted`) in one block.
- Do not add icons, badges or dividers that carry no meaning.

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| < 640px | One column. h1 to `--text-2xl`, h2 to `--text-xl`. Inputs at `--text-base`. Buttons 44px tall; hero buttons full width and stacked with `gap: var(--space-3)`. Page padding `var(--space-6)`. Section gap `var(--space-16)`. Top bar keeps wordmark and a menu button. Tables scroll in a wrapper. |
| 640px – 1023px | Feature grids 2 columns. Side nav becomes a drawer. h1 at `--text-3xl`. Page padding `var(--space-8)`. |
| 1024px – 1279px | 12-column grid, 3-column feature grids, side nav visible at 240px. h1 at `--text-4xl`. |
| >= 1280px | Containers stop at 1120px (marketing) or 1280px (app). |

## Agent Prompt Guide

1. Set `body` to `var(--font-body)` at `var(--text-base)`, line-height 1.55, `color: var(--fg)`, `background: var(--bg)`. Set headings at weight 600 with negative letter-spacing and `text-wrap: balance`.
2. Load only Geist 400, 500, 600 and Geist Mono 400. Use mono only for code, keys and IDs.
3. Separate surfaces with 1px `var(--border)` hairlines. Use `--shadow-md` and `--shadow-lg` only for floating layers.
4. Use `var(--primary)` for exactly one filled button per view and for links. Hover with `color-mix(in oklab, var(--primary) 88%, var(--fg))`.
5. Use 40px controls with `var(--radius-md)`, cards with `var(--radius-lg)` and `var(--space-6)` padding, and 44px touch targets on mobile.
6. Keep wide white space: `var(--space-24)` between marketing sections, a 1120px container, 68ch for reading text.
7. Give every focusable item `outline: 2px solid var(--ring); outline-offset: 2px`, and use `tabular-nums` for changing numbers.

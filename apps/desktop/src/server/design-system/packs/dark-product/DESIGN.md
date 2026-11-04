# Dark Product

## Visual Theme & Atmosphere

Dark Product is a night-first interface for tools that people keep open all day. The page is near-black with a faint cool tint. Panels sit one small step lighter. Thin, quiet borders mark the edges. One bright chartreuse color marks the single most important thing on screen: the main action, the active nav item, or the focus ring.

The mood is calm, dense and exact. There is no glow, no neon blur and no gradient behind text. Depth comes from surface lightness steps and dark shadows with a faint 1px highlight.

This pack is dark only. It has no light mode. Do not build a light variant from these tokens.

## Color Palette & Roles

All values are OKLCH. There is one value per token because the pack has no light mode.

| Token | Value | Role |
|---|---|---|
| `--bg` | `oklch(14.5% 0.006 265)` | Page background. The lowest layer. |
| `--surface` | `oklch(18.5% 0.008 265)` | Cards, panels, sidebars, inputs, menus. |
| `--fg` | `oklch(95% 0.004 265)` | Body text, headings, primary icons. |
| `--fg-muted` | `oklch(71% 0.012 265)` | Secondary text, captions, placeholders, idle icons. |
| `--border` | `oklch(27% 0.01 265)` | 1px dividers, input and card outlines. |
| `--primary` | `oklch(87% 0.19 122)` | Chartreuse. One filled action per view, links, active nav marker. |
| `--primary-fg` | `oklch(19% 0.04 125)` | Dark text and icons on `--primary`. |
| `--accent` | `oklch(27% 0.03 265)` | Raised neutral. Hover rows, selected rows, chips, tags, callouts. |
| `--accent-fg` | `oklch(90% 0.03 250)` | Text and icons on `--accent`. |
| `--success` | `oklch(76% 0.13 165)` | Positive status fills, icons, borders. |
| `--warning` | `oklch(80% 0.13 75)` | Caution status fills, icons, borders. |
| `--danger` | `oklch(68% 0.18 22)` | Destructive actions, error fills, icons, borders. |
| `--ring` | `oklch(87% 0.19 122)` | Focus outline. Same hue as primary. |

Layer order, lowest to highest: `--bg`, `--surface`, `--accent`. A row on hover moves up one step.

### Rules for color

- Chartreuse is rare. On a typical screen it covers less than 2% of the pixels.
- Status colors are for fills, icons and borders. Do not set small body text in `--success`, `--warning` or `--danger`. Pair each status with an icon and a word, never color alone.
- For a soft status fill, mix it with the surface: `color-mix(in oklab, var(--danger) 16%, var(--surface))`, with `--fg` text and a 1px `--danger` border.
- Hover on primary: `color-mix(in oklab, var(--primary) 88%, var(--fg))`. Pressed: `color-mix(in oklab, var(--primary) 85%, var(--bg))`.

## Typography Rules

- Display: Sora, weight 600 only. Use it for h1 to h3 and for large numbers on stat cards.
- Body: Inter, weights 400, 500 and 600. Use it for all UI text, h4 to h6, body and labels.
- Mono: JetBrains Mono, weights 400 and 500. Use it for code, IDs, keys, hashes and log lines.

The scale has a base of 0.9375rem (15px), a ratio of 1.2 (minor third) upward, and 1.125 below base. It is an app scale. In marketing sections, step body copy up to `--text-lg` (about 18px).

| Role | Token | Family / weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| h1 | `--text-4xl` | `--font-display` 600 | 1.1 | -0.02em |
| h2 | `--text-3xl` | `--font-display` 600 | 1.1 | -0.015em |
| h3 | `--text-2xl` | `--font-display` 600 | 1.15 | -0.01em |
| h4 | `--text-xl` | `--font-body` 600 | 1.2 | -0.005em |
| h5 | `--text-lg` | `--font-body` 600 | 1.25 | 0 |
| h6 | `--text-base` | `--font-body` 600 | 1.3 | 0 |
| body | `--text-base` | `--font-body` 400 | 1.55 | 0 |
| marketing body | `--text-lg` | `--font-body` 400 | 1.6 | 0 |
| caption | `--text-sm` | `--font-body` 400, `--fg-muted` | 1.45 | 0 |
| label | `--text-xs` | `--font-body` 500, uppercase | 1.3 | 0.06em |

- Keep every weight at 400 or more below 18px. Never use a weight that is not loaded.
- Cap text blocks at 68ch. Never let a paragraph run past 75ch.
- Set `text-wrap: balance` on headings. Set `text-wrap: pretty` on descriptions and card text.
- Set `font-variant-numeric: tabular-nums` on any number that changes: counters, prices, timers, table columns, charts.

## Component Stylings

### Buttons

All buttons use `--font-body` 500, `--text-sm`, `--radius-md`, and a 1px border. Default height is 36px with padding `0 var(--space-4)`. Small is 28px with `0 var(--space-3)`. Large is 44px with `0 var(--space-5)` and `--text-base`. Icon gap is `--space-2`.

- Primary: fill `--primary`, text `--primary-fg`, border `--primary`. Exactly one filled primary button per view. Hover and pressed use the mixes in the color section.
- Secondary: fill `--surface`, text `--fg`, border `--border`. Hover fill `--accent`.
- Ghost: no fill, no visible border, text `--fg-muted`. Hover fill `--accent`, text `--accent-fg`.
- Destructive: fill `color-mix(in oklab, var(--danger) 16%, var(--surface))`, text `--fg`, border `--danger`, with a warning icon. Use a solid `--danger` fill with `--bg` text only in the final confirm dialog.
- Disabled: opacity 0.5, no hover change, `cursor: not-allowed`.
- Focus: `outline: 2px solid var(--ring); outline-offset: 2px` on every button.

### Inputs

Height 36px, padding `0 var(--space-3)`, fill `--bg`, 1px `--border`, `--radius-md`, text `--fg`, placeholder `--fg-muted`. Font is `--text-sm` on desktop and 16px minimum on mobile to stop zoom on focus. Hover border `color-mix(in oklab, var(--border) 60%, var(--fg-muted))`. Focus: `outline: 2px solid var(--ring); outline-offset: 2px`. Error: border `--danger` plus an icon and a message in `--fg` under the field. Labels sit above the field in `--text-sm` 500, gap `--space-2`.

### Cards and panels

Fill `--surface`, 1px `--border`, `--radius-lg`, padding `--space-5` (dense) or `--space-6` (default). Shadow `--shadow-sm`. Card title in `--font-body` 600 `--text-base`; meta in `--fg-muted` `--text-sm`. Clickable cards move to `--shadow-md` on hover. Do not nest a card inside a card; use a divider instead.

### Nav and top bar

Top bar is 56px tall, fill `--bg`, 1px `--border` on the bottom, padding `0 var(--space-6)`. Sidebar is 240px wide, fill `--bg`, 1px `--border` on the right. Nav items are 32px tall, `--radius-md`, padding `0 var(--space-3)`, text `--fg-muted`. Hover: fill `--accent`, text `--accent-fg`. Active: text `--fg`, fill `--accent`, plus a 2px `--primary` bar on the left edge. The bar is the only chartreuse in the nav.

### Hero (marketing pages)

Padding `var(--space-24) 0 var(--space-20)`. Heading `--text-4xl` at mobile, scaled to `clamp(2.333rem, 5vw, 3.5rem)` on wide screens with `--font-display` 600. Lead text `--text-lg` in `--fg-muted`, max 56ch. One primary button and one secondary button. Show a real product screenshot in a `--surface` frame with `--radius-lg` and `--shadow-lg`. No gradient or glow behind the heading.

### Tables

Header row: `--text-xs` label style, `--fg-muted`, fill `--bg`, 1px bottom `--border`. Body rows: 40px tall, padding `0 var(--space-3)`, 1px bottom `--border`. Hover row fill `--accent`. Selected row fill `--accent` plus a 2px `--primary` left bar. Numbers right-aligned with `tabular-nums`. IDs and hashes in `--font-mono` 400 `--text-sm`.

### Badges and tags

Height 22px, padding `0 var(--space-2)`, `--radius-pill` for status, `--radius-sm` for tags, `--text-xs` 500. Neutral tag: fill `--accent`, text `--accent-fg`. Status badge: fill `color-mix(in oklab, var(--success) 16%, var(--surface))`, 1px border in the status color, text `--fg`, and a 6px dot or icon in the status color.

## Layout Principles

- App shell: 240px sidebar, 56px top bar, content area with padding `--space-6` (desktop) or `--space-4` (mobile).
- App content max width: 1280px. Forms and settings max width: 640px.
- Marketing container: max width 1200px, side gutters `--space-6`, grid of 12 columns with a `--space-6` gap.
- Section rhythm on marketing pages: `--space-20` between sections, `--space-12` between a section heading and its content.
- Inside panels: `--space-4` between related items, `--space-6` between groups, `--space-8` between panel sections.
- Feature grids: 3 columns on desktop, 2 on tablet, 1 on mobile, gap `--space-6`.
- Align all edges to the 4px grid. Use only `--space-N` tokens for gaps and padding.

## Depth & Elevation

Depth comes from two things: the surface step and the shadow tokens. The shadows are dark ambient shadows with a faint white highlight. They contain no color.

| Level | Surface | Shadow | Use |
|---|---|---|---|
| 0 | `--bg` | none | Page, sidebar, top bar |
| 1 | `--surface` | `--shadow-sm` | Cards, panels, inputs on hover |
| 2 | `--surface` | `--shadow-md` | Dropdowns, popovers, hovered clickable cards |
| 3 | `--surface` | `--shadow-lg` | Modals, command palette, toasts |

- Every raised element also has a 1px `--border` unless its shadow already draws the 1px ring (`--shadow-md` and `--shadow-lg` do).
- Put a scrim behind modals: `color-mix(in oklab, var(--bg) 70%, transparent)`.
- Never use a colored shadow. Never use a blur filter to fake glass.

## Do's and Don'ts

### Do

- Use one filled `--primary` button per view.
- Show nesting with the `--bg` to `--surface` to `--accent` steps.
- Use `tabular-nums` on every changing number.
- Pair every status color with an icon and a text label.
- Give every focusable element the `--ring` outline.
- Step body copy up to `--text-lg` on marketing pages.

### Don't

- Don't add glow, neon blur or colored box-shadows.
- Don't put a gradient behind text.
- Don't fill large areas with chartreuse. No chartreuse backgrounds, banners or cards.
- Don't set body text in `--primary` except for links.
- Don't set small text in status colors.
- Don't build a light mode from these tokens.
- Don't use Sora below `--text-2xl` or at any weight other than 600.

## Responsive Behavior

| Breakpoint | Width | Changes |
|---|---|---|
| Mobile | < 640px | Sidebar becomes a drawer behind a menu button. Content padding `--space-4`. Inputs use 16px text. Tables scroll on the x axis or turn into stacked rows. Grids go to 1 column. Hero padding `var(--space-16) 0 var(--space-12)`. |
| Tablet | 640px to 1023px | Sidebar collapses to a 64px icon rail with tooltips. Grids go to 2 columns. Content padding `--space-6`. |
| Desktop | 1024px to 1439px | Full 240px sidebar. 12-column grid. Grids at 3 columns. |
| Wide | >= 1440px | Content stays at max width 1280px and centers. Optional right detail panel, 360px wide. |

- Touch targets are at least 44px tall on mobile. Raise 36px buttons to 44px below 640px.
- Section rhythm drops from `--space-20` to `--space-12` on mobile.
- Respect `prefers-reduced-motion`: keep only opacity fades, max 150ms.

## Agent Prompt Guide

1. Set the page to `var(--bg)` and put panels on `var(--surface)`. Use `var(--accent)` with `var(--accent-fg)` for hover, selected rows and chips. Never invent other surface colors.
2. Use exactly one filled `var(--primary)` button per view. Use chartreuse elsewhere only for links, the active nav bar and `var(--ring)`.
3. Never add glow, colored shadows, blur or gradients behind text. Use `var(--shadow-sm|md|lg)` and 1px `var(--border)` for depth.
4. Set headings h1 to h3 in `var(--font-display)` 600 and everything else in `var(--font-body)` 400/500/600. Use `var(--font-mono)` for code and IDs.
5. Size type only with `var(--text-xs)` to `var(--text-4xl)`. Use `var(--text-base)` for app body and `var(--text-lg)` for marketing body.
6. Space only with `var(--space-N)` tokens and round with `var(--radius-sm|md|lg|pill)`.
7. Give every focusable element `outline: 2px solid var(--ring); outline-offset: 2px`, and pair every status color with an icon and a word.
8. Do not create a light mode. This pack is dark only.

# Soft Pastel

## Visual Theme & Atmosphere

This style is airy, warm and playful, but always easy to read. A cream page holds soft mint and peach blocks with lilac lines. Shapes are round. Shadows are light and lilac-tinted, so nothing looks gray or cold.

Pastels are only backgrounds. All text is dark plum `var(--fg)`, so contrast stays high. One deep berry color carries the main action. A chunky display face sets headlines; a hyperlegible body face keeps long text clear.

Motion is gentle and short, and stops when the user asks for reduced motion. The focus ring is always visible.

## Color Palette & Roles

| Token | Light value | Dark value | Role |
|---|---|---|---|
| `--bg` | `oklch(98% 0.012 75)` | `oklch(19% 0.02 310)` | Page background. Warm cream. |
| `--surface` | `oklch(95.5% 0.03 165)` | `oklch(24% 0.03 175)` | Mint. Cards, panels, blocks. |
| `--fg` | `oklch(24% 0.04 300)` | `oklch(95% 0.012 300)` | Dark plum. All body text and headings. |
| `--fg-muted` | `oklch(45% 0.045 300)` | `oklch(77% 0.03 300)` | Captions, metadata, placeholders. |
| `--border` | `oklch(88% 0.03 300)` | `oklch(35% 0.03 300)` | Lilac. Dividers and outlines. |
| `--primary` | `oklch(48% 0.16 355)` | `oklch(78% 0.1 355)` | Deep berry. The one filled action per view, links. |
| `--primary-fg` | `oklch(99% 0.004 355)` | `oklch(22% 0.06 355)` | Text and icons on berry. |
| `--accent` | `oklch(91% 0.05 50)` | `oklch(34% 0.06 50)` | Peach. Selected rows, tags, callouts. |
| `--accent-fg` | `oklch(38% 0.1 40)` | `oklch(90% 0.05 55)` | Warm brown. Text and icons on peach. |
| `--success` | `oklch(50% 0.11 160)` | `oklch(78% 0.11 160)` | Positive status fills, icons, borders. |
| `--warning` | `oklch(64% 0.13 70)` | `oklch(82% 0.12 80)` | Caution status fills, icons, borders. |
| `--danger` | `oklch(53% 0.18 25)` | `oklch(72% 0.14 22)` | Destructive actions, error icons, fills, borders. |
| `--ring` | `oklch(48% 0.16 355)` | `oklch(78% 0.1 355)` | Focus outline. Same berry as `--primary`. |

### Color rules

- Pastels are fills, never text. Text is `var(--fg)` or `var(--fg-muted)`. The only exceptions: `var(--primary-fg)` on berry, `var(--accent-fg)` on peach, and `var(--primary)` for links.
- Use color blocks to separate sections: cream `var(--bg)`, mint `var(--surface)`, peach `var(--accent)`, and a soft lilac block `color-mix(in oklab, var(--border) 55%, var(--bg))`. Do not put two blocks of the same color next to each other.
- Links: `var(--primary)` text with an underline.
- Status colors are for fills, icons and borders. Do not set small body text in `--success`, `--warning` or `--danger`. Pair each with an icon and a word, so color is never the only signal.
- Hover on primary: `color-mix(in oklab, var(--primary) 88%, var(--fg))`. Pressed: `color-mix(in oklab, var(--primary) 78%, var(--fg))`.

## Typography Rules

- Display: `--font-display` is Bricolage Grotesque. Body: `--font-body` is Atkinson Hyperlegible Next. Mono: `--font-mono` is Atkinson Hyperlegible Mono.
- Loaded weights: Bricolage Grotesque 600 and 800. Atkinson Hyperlegible Next 400, 700 and 400 italic. Atkinson Hyperlegible Mono 400. Use no other weights.
- Scale: base 1.0625rem (17px), ratio 1.25 (major third) upward, ratio 1.125 below base.

### Scale map (descending)

| Element | Token | Size | Family / weight | Line height | Letter spacing |
|---|---|---|---|---|---|
| h1 / hero | `--text-4xl` | 3.242rem | Display 800 | 1.05 | -0.025em |
| h2 | `--text-3xl` | 2.594rem | Display 800 | 1.1 | -0.02em |
| h3 | `--text-2xl` | 2.075rem | Display 600 | 1.15 | -0.015em |
| h4 | `--text-xl` | 1.66rem | Display 600 | 1.2 | -0.01em |
| h5 | `--text-lg` | 1.328rem | Display 600 | 1.25 | 0 |
| h6 | `--text-base` | 1.063rem | Body 700 | 1.35 | 0 |
| Body | `--text-base` | 1.063rem | Body 400 | 1.6 | 0 |
| Caption | `--text-sm` | 0.944rem | Body 400 | 1.5 | 0.005em |
| Label / eyebrow | `--text-xs` | 0.84rem | Body 700, uppercase | 1.3 | 0.08em |

### Rules

- Headlines use sentence case. They feel friendly, not shouty. Use `text-wrap: balance` on all headings.
- Use `text-wrap: pretty` on descriptions, card text and lead paragraphs.
- Cap body text at 68ch. Never exceed 75ch.
- Body text is never under 16px. Text below 18px uses weight 400 or more. Bricolage Grotesque is for `--text-lg` and up only; smaller labels use the body face.
- Use italic 400 for light emphasis, weight 700 for strong emphasis.
- Use mono for code, IDs and number columns. Use `font-variant-numeric: tabular-nums` on prices, counts, timers and any number that changes.

## Component Stylings

### Buttons

All buttons: `font-family: var(--font-body)`, weight 700, `var(--text-base)`, sentence case. Radius `var(--radius-pill)`. Height 48px default, 40px small, 56px large. Padding `var(--space-3) var(--space-6)`. Transition `background-color`, `box-shadow` and `transform` at 160ms ease-out.

- **Primary**: background `var(--primary)`, text `var(--primary-fg)`, `box-shadow: var(--shadow-sm)`. Hover: background `color-mix(in oklab, var(--primary) 88%, var(--fg))`, `box-shadow: var(--shadow-md)`, `translateY(-1px)`. Pressed: `translateY(0)`, `box-shadow: var(--shadow-sm)`. Exactly one filled primary button per view.
- **Secondary**: background `var(--surface)`, text `var(--fg)`, `border: 1.5px solid var(--border)`. Hover: border `var(--fg-muted)`, background `color-mix(in oklab, var(--surface) 85%, var(--border))`.
- **Ghost**: transparent, no border, text `var(--primary)`. Hover: background `color-mix(in oklab, var(--accent) 60%, var(--bg))`.
- **Destructive**: background `var(--bg)`, text `var(--fg)`, `border: 2px solid var(--danger)`, a danger icon before the label.

### Inputs

- Height 48px. Padding `var(--space-3) var(--space-4)`. Background `var(--bg)` on mint blocks, `var(--surface)` on cream. Border `1.5px solid var(--border)`. Radius `var(--radius-sm)` (8px).
- Font `var(--font-body)`, `var(--text-base)`, weight 400. Never under 16px on mobile.
- Label above: body 700, `var(--text-sm)`. Help text below in `var(--fg-muted)`.
- Focus: `outline: 2px solid var(--ring)`, `outline-offset: 2px`, border `var(--primary)`. Never remove the outline.
- Error: border `2px solid var(--danger)` plus an icon and a message in `var(--fg)`.

### Cards

- Background `var(--surface)` (mint) on cream pages, `var(--bg)` on colored blocks. Border `1px solid var(--border)`. Radius `var(--radius-lg)` (22px). Padding `var(--space-6)`, or `var(--space-8)` for feature cards.
- Resting shadow `var(--shadow-sm)`. Clickable cards lift on hover: `var(--shadow-md)` and `translateY(-2px)`.
- Inner images and panels use `var(--radius-md)` (14px).

### Nav / top bar

- Height 68px. Background `var(--bg)`. Bottom border `1px solid var(--border)`. On scroll, add `var(--shadow-sm)`.
- Links: body 700, `var(--text-sm)`, padding `var(--space-2) var(--space-4)`, radius `var(--radius-pill)`. Current page: `var(--accent)` pill with `var(--accent-fg)` text.

### Hero

- A full-width color block in `var(--surface)` mint or a lilac mix, with `var(--radius-lg)` corners inset from the page edge by the gutter.
- Vertical padding `var(--space-20)` desktop, `var(--space-12)` mobile.
- Eyebrow label, h1 at `--text-4xl` weight 800, then a lead paragraph at `--text-lg` in `var(--fg-muted)`, max 52ch.
- One primary button and one secondary or ghost button.

### Tables

- Wrap in a `var(--surface)` container, `var(--radius-md)` corners, `1px solid var(--border)`.
- Header row: background `color-mix(in oklab, var(--border) 45%, var(--surface))`, body 700, `var(--text-sm)`, text `var(--fg)`.
- Cell padding `var(--space-3) var(--space-4)`. Row dividers `1px solid var(--border)`. No vertical lines.
- Hover row: `color-mix(in oklab, var(--accent) 40%, var(--surface))`. Selected row: `var(--accent)` with `var(--fg)` text and a 3px `var(--primary)` left bar.
- Number columns right-aligned with `tabular-nums`.

### Badges / tags

- Height 26px. Padding `var(--space-1) var(--space-3)`. Radius `var(--radius-pill)`. Body 700, `var(--text-xs)`.
- Neutral: `var(--surface)` fill, `1px solid var(--border)`, `var(--fg)` text. Highlight: `var(--accent)` fill with `var(--accent-fg)` text.
- Status: a status-colored dot or icon plus the word in `var(--fg)`.

## Layout Principles

- Container max width: 1200px (75rem) for pages, 680px (42.5rem) for long reading, 440px (27.5rem) for forms and sign-in cards.
- Side gutters: `var(--space-5)` mobile, `var(--space-8)` tablet, `var(--space-12)` desktop.
- Grid: 12 columns on desktop, 8 on tablet, 4 on mobile. Column gap `var(--space-6)` desktop, `var(--space-4)` below.
- Section rhythm: `var(--space-20)` between sections on desktop, `var(--space-12)` on mobile. Inside a section, `var(--space-8)` between blocks, `var(--space-4)` between related items.
- Alternate section color blocks: cream, mint, cream, peach, lilac. Each block can be full bleed or inset with `var(--radius-lg)` corners.

## Depth & Elevation

- Radii: `--radius-sm` 8px (inputs, small chips, checkboxes), `--radius-md` 14px (menus, tables, inner panels, images), `--radius-lg` 22px (cards, hero blocks, modals), `--radius-pill` 9999px (buttons, badges, nav pills, toggles).
- Shadows are soft and lilac-tinted, never pure black:
  - `--shadow-sm`: resting cards, primary buttons, the scrolled top bar.
  - `--shadow-md`: hover lift on cards and buttons, dropdowns, toasts.
  - `--shadow-lg`: modals, popovers, the main hero visual.
- Pair card shadows with a 1px `var(--border)` outline.

## Do's and Don'ts

### Do

- Do keep all text dark plum `var(--fg)` on pastel blocks.
- Do round everything with the radius tokens. Nest smaller radii inside larger ones.
- Do alternate pastel section blocks to give the page rhythm.
- Do use one berry primary button per view.
- Do wrap motion in `@media (prefers-reduced-motion: no-preference)`. Keep transitions at 120–200ms.

### Don't

- Don't set text in pastel colors, or in light gray on pastel.
- Don't use pure black shadows, hard shadows or neon colors.
- Don't use square corners on buttons, cards or inputs.
- Don't use Bricolage Grotesque below `--text-lg`.
- Don't add more than one filled primary button per view.
- Don't use bouncy or long animations.

## Responsive Behavior

- **0–639px (mobile)**: 4 columns, gutters `var(--space-5)`. h1 at `--text-3xl`, h2 at `--text-2xl`. Buttons go full width and stack with `var(--space-3)` gaps. Hero blocks go full bleed with `var(--radius-md)` corners. Nav collapses into a pill "Menu" button that opens a `var(--bg)` sheet with `var(--radius-lg)` top corners. Tables turn into stacked cards. Section padding `var(--space-12)`.
- **640–1023px (tablet)**: 8 columns, gutters `var(--space-8)`. h1 at `--text-4xl`. Cards in 2 columns. Hero padding `var(--space-16)`.
- **1024px and up (desktop)**: 12 columns, cards in 3 columns, full nav with pill links. Container locks at 1200px. Gutters `var(--space-12)`.
- Tap targets are at least 44px by 44px at all sizes. Input text stays at `--text-base` (17px) on mobile.

## Agent Prompt Guide

1. Use only the pack's color, text, space, radius and shadow tokens. Do not invent token names or hard-code colors.
2. Set every text element in `var(--fg)` or `var(--fg-muted)`. Use pastels only as fills behind dark text.
3. Build sections as alternating color blocks (cream, mint, peach, lilac mix) with `var(--radius-lg)` corners when inset.
4. Put exactly one filled `var(--primary)` pill button in each view, with `var(--primary-fg)` text.
5. Set headings in Bricolage Grotesque 600 or 800, sentence case, negative letter spacing and `text-wrap: balance`. Set body in Atkinson Hyperlegible Next 400 at `--text-base` with line height 1.6.
6. Show focus with `outline: 2px solid var(--ring)` and `outline-offset: 2px` on every interactive element.
7. Use only `var(--shadow-sm|md|lg)` for depth. Lift on hover with a 1–2px translate.
8. Wrap all motion in a `prefers-reduced-motion: no-preference` query and keep it under 200ms.

# Brutalist

## Visual Theme & Atmosphere

This style is raw and loud. It looks like a printed poster, not a polished app. Heavy grotesk type fills the page. Black ink sits on near-white paper. One signal-yellow block marks the main action. Electric blue marks selection and focus.

Every edge is square. Every box has a thick ink border. Shadows are hard offset blocks with no blur. The grid is visible: borders and rules show the structure.

There are no gradients, no soft shadows, no rounded corners and no decorative motion. A button moves into its shadow when you press it.

## Color Palette & Roles

| Token | Light value | Dark value | Role |
|---|---|---|---|
| `--bg` | `oklch(99% 0 0)` | `oklch(13% 0 0)` | Page background. |
| `--surface` | `oklch(100% 0 0)` | `oklch(17% 0 0)` | Cards, panels, inputs, table bodies. |
| `--fg` | `oklch(13% 0 0)` | `oklch(98% 0 0)` | Body text, headings, icons. |
| `--fg-muted` | `oklch(38% 0 0)` | `oklch(78% 0 0)` | Captions, metadata, placeholders. |
| `--border` | `oklch(13% 0 0)` | `oklch(98% 0 0)` | All outlines and rules. Pure ink, same as `--fg`. |
| `--primary` | `oklch(91% 0.18 104)` | `oklch(91% 0.18 104)` | Signal yellow. The one filled action per view, link blocks. |
| `--primary-fg` | `oklch(13% 0 0)` | `oklch(13% 0 0)` | Black text and icons on yellow, in both modes. |
| `--accent` | `oklch(50% 0.24 264)` | `oklch(70% 0.15 264)` | Electric blue. Selected rows, active tabs, tags, callouts. |
| `--accent-fg` | `oklch(100% 0 0)` | `oklch(13% 0 0)` | Text and icons on blue. |
| `--success` | `oklch(52% 0.16 145)` | `oklch(78% 0.18 145)` | Positive status fills, icons, borders. |
| `--warning` | `oklch(70% 0.17 55)` | `oklch(80% 0.13 60)` | Caution status fills, icons, borders. |
| `--danger` | `oklch(55% 0.22 28)` | `oklch(68% 0.2 28)` | Destructive actions, error fills, icons, borders. |
| `--ring` | `oklch(50% 0.24 264)` | `oklch(70% 0.15 264)` | Focus outline. Same blue as `--accent`. |

### Color rules

- Yellow `--primary` is light. Put only `--primary-fg` on it. Never use yellow as text on `--bg`. Links are `--fg` text with a thick underline or a yellow block.
- Status colors are for fills, icons and borders. Do not set small body text in `--success`, `--warning` or `--danger`. Pair every status color with a word or icon so color is never the only signal.
- Hover on primary: `color-mix(in oklab, var(--primary) 88%, var(--fg))`. Hover on a surface: `color-mix(in oklab, var(--surface) 92%, var(--fg))`.

## Typography Rules

- Display and body: `--font-display` and `--font-body` are both Archivo. Mono: `--font-mono` is Space Mono.
- Loaded weights: Archivo 400, 700, 900. Space Mono 400, 700. Use no other weights.
- Scale: base 1rem, ratio 1.5 (perfect fifth) upward, ratio 1.125 below base.

### Scale map (descending)

| Element | Token | Size | Weight | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|
| h1 / hero | `--text-4xl` | 7.594rem | 900 | 0.9 | -0.04em | Uppercase |
| h2 | `--text-3xl` | 5.063rem | 900 | 0.95 | -0.03em | Uppercase |
| h3 | `--text-2xl` | 3.375rem | 900 | 1.0 | -0.02em | Uppercase |
| h4 | `--text-xl` | 2.25rem | 700 | 1.05 | -0.01em | Uppercase |
| h5 | `--text-lg` | 1.5rem | 700 | 1.1 | 0 | Sentence |
| h6 | `--text-base` | 1rem | 700 | 1.2 | 0.08em | Uppercase |
| Body | `--text-base` | 1rem | 400 | 1.55 | 0 | Sentence |
| Caption | `--text-sm` | 0.889rem | 400 | 1.5 | 0 | Sentence |
| Label / eyebrow | `--text-xs` | 0.79rem | 700 mono | 1.3 | 0.1em | Uppercase |

### Rules

- Set display headlines huge and tight. Let them break the line in large blocks. Use `text-wrap: balance` on all headings.
- Use `text-wrap: pretty` on descriptions and lead paragraphs.
- Cap body text at a measure of 65ch. Never exceed 75ch.
- Body text is never smaller than 16px. Text below 18px uses weight 400 or more. Never use weight 900 below `--text-xl`.
- Use Space Mono for labels, eyebrows, table headers, metadata, code and numbers. Uppercase mono labels get positive letter spacing (0.08em to 0.12em).
- Use `font-variant-numeric: tabular-nums` on prices, counters, timers and any number that changes.

## Component Stylings

### Buttons

All buttons: `border: 3px solid var(--border)`, `border-radius: var(--radius-sm)` (0px), `font-family: var(--font-body)`, weight 700, uppercase, letter spacing 0.04em. Height 48px default, 40px small, 56px large. Padding `var(--space-3) var(--space-6)`. Transition only `transform` and `box-shadow`, 80ms, linear.

- **Primary**: background `var(--primary)`, text `var(--primary-fg)`, `box-shadow: var(--shadow-md)`. Hover: background `color-mix(in oklab, var(--primary) 88%, var(--fg))`. Pressed: `transform: translate(5px, 5px)` and `box-shadow: none`. Exactly one filled primary button per view.
- **Secondary**: background `var(--surface)`, text `var(--fg)`, `box-shadow: var(--shadow-sm)`. Hover: background `color-mix(in oklab, var(--surface) 90%, var(--fg))`. Pressed: `translate(3px, 3px)`, no shadow.
- **Ghost**: transparent background, no border, no shadow, text `var(--fg)`, underline 3px offset 4px. Hover: background `var(--primary)`, text `var(--primary-fg)`.
- **Destructive**: background `var(--danger)`, text `var(--surface)`, 3px ink border, `box-shadow: var(--shadow-sm)`.

### Inputs

- Height 48px. Padding `var(--space-3) var(--space-4)`. Background `var(--surface)`. Border `2px solid var(--border)`. Radius `var(--radius-sm)` (0px).
- Font `var(--font-body)`, `var(--text-base)`, weight 400. Font size is never under 16px on mobile, so the browser does not zoom.
- Labels sit above the field: mono, `var(--text-xs)`, weight 700, uppercase, letter spacing 0.1em, `margin-bottom: var(--space-2)`.
- Focus: `outline: 2px solid var(--ring)`, `outline-offset: 2px`. Also thicken the border to 3px.
- Error: border `var(--danger)` at 3px plus a message below with an icon and text in `var(--fg)`.

### Cards

- Background `var(--surface)`. Border `3px solid var(--border)`. Radius `var(--radius-md)` (0px). Padding `var(--space-6)`, or `var(--space-8)` for feature cards.
- Resting shadow `var(--shadow-md)`. Clickable cards press like buttons: translate by the offset and drop the shadow.

### Nav / top bar

- Height 64px. Background `var(--bg)`. Bottom border `3px solid var(--border)`. No shadow, no blur, not translucent.
- Nav links: weight 700, uppercase, `var(--text-sm)`. The current page gets a `var(--primary)` block behind the text with 3px ink border, not just a color change.

### Hero

- Full-width band with a 3px ink bottom border. Vertical padding `var(--space-24)` desktop, `var(--space-16)` mobile.
- Headline at `--text-4xl`, weight 900, uppercase, line height 0.9. It can run edge to edge in the container.
- A mono eyebrow label sits above. A lead paragraph at `--text-lg`, weight 400, max 40ch, sits below.
- One primary button and at most one secondary button.

### Tables

- Outer border `3px solid var(--border)`. Every cell has `1px solid var(--border)` grid lines. Keep the grid visible.
- Header row: background `var(--fg)`, text `var(--bg)`, mono, `var(--text-xs)`, weight 700, uppercase, letter spacing 0.1em.
- Cell padding `var(--space-3) var(--space-4)`. Number columns right-aligned with `tabular-nums` in mono.
- Selected row: background `var(--accent)`, text `var(--accent-fg)`. Hover row: `color-mix(in oklab, var(--surface) 92%, var(--fg))`.

### Badges / tags

- Height 24px. Padding `var(--space-1) var(--space-2)`. Border `2px solid var(--border)`. Radius `var(--radius-pill)` (0px, still square).
- Mono, `var(--text-xs)`, weight 700, uppercase, letter spacing 0.08em.
- Neutral: `var(--surface)` with `var(--fg)` text. Highlight: `var(--accent)` with `var(--accent-fg)`. Status: a square icon or dot in the status color plus the status word in `var(--fg)`.

## Layout Principles

- Container max width: 1280px (80rem) for app and marketing pages, 720px (45rem) for long reading.
- Side gutters: `var(--space-4)` mobile, `var(--space-8)` tablet, `var(--space-12)` desktop.
- Grid: 12 columns on desktop, 6 on tablet, 4 on mobile. Column gap `var(--space-6)` on desktop, `var(--space-4)` below.
- Section rhythm: `var(--space-24)` between major sections on desktop, `var(--space-16)` on mobile. Inside a section, `var(--space-8)` between blocks.
- Show the grid. Divide sections and columns with 3px ink rules. A bento layout of bordered cells with shared edges fits this style well.
- Left-align text. Use only the 4px grid space tokens.

## Depth & Elevation

- Radius is zero everywhere. All four radius tokens (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`) are 0px. Do not add your own radius.
- Shadows are hard offset blocks with no blur:
  - `--shadow-sm` (3px): buttons, badges that act as controls, small inputs on hover.
  - `--shadow-md` (5px): cards, primary buttons, dropdown menus.
  - `--shadow-lg` (8px): modals, popovers, the single hero feature card.
- In dark mode the shadow tokens switch to white offsets. Use the tokens; no extra code needed.
- Press state: translate the element by its shadow offset (3px, 5px or 8px) and set `box-shadow: none`. The element lands where its shadow was.
- Borders carry structure: 3px for containers and controls, 2px for inputs and badges, 1px for table cell grid lines. All use `var(--border)`.

## Do's and Don'ts

### Do

- Do set headlines huge, uppercase and weight 900.
- Do put a 2–3px ink border on every box, control and section edge.
- Do use one yellow primary block per view so the eye goes there first.
- Do use mono uppercase labels for metadata, tables and eyebrows.
- Do keep transitions at 100ms or less, on `transform` and `box-shadow` only.
- Do respect `prefers-reduced-motion`: remove the press translate and keep only the shadow change.

### Don't

- Don't round any corner. Not on buttons, avatars, inputs or images.
- Don't use gradients, blur, glass effects or soft drop shadows.
- Don't put white text on yellow or yellow text on white.
- Don't use more than one filled primary button in a view.
- Don't use status colors for small body text, and don't rely on color alone.
- Don't use fade, slide or bounce animations.

## Responsive Behavior

- **0–639px (mobile)**: 4 columns, gutters `var(--space-4)`. h1 drops to `--text-2xl`, h2 to `--text-xl`. Buttons go full width and stack with `var(--space-3)` gaps. Nav collapses into a "MENU" button that opens a full-screen ink panel. Tables scroll inside a bordered wrapper or turn into stacked bordered cards. Section padding `var(--space-16)`.
- **640–1023px (tablet)**: 6 columns, gutters `var(--space-8)`. h1 at `--text-3xl`. Cards in 2 columns. Nav links show if they fit; otherwise keep the menu button.
- **1024–1279px (small desktop)**: 12 columns. h1 at `--text-4xl`. Full top bar with ink rule separators.
- **1280px and up (desktop)**: container locks at 1280px. Gutters `var(--space-12)`.
- Tap targets are at least 44px by 44px at every size.

## Agent Prompt Guide

1. Use only the pack's color, text, space, radius and shadow tokens. Do not invent token names or hard-code colors.
2. Give every container and control a solid `var(--border)` border of 2px or 3px and zero radius.
3. Use `var(--shadow-sm|md|lg)` hard shadows only. On press, translate by the shadow offset and remove the shadow.
4. Set h1–h3 in Archivo weight 900, uppercase, tight line height (0.9–1.0), negative letter spacing and `text-wrap: balance`.
5. Put exactly one filled `var(--primary)` button in each view, with `var(--primary-fg)` text.
6. Use Space Mono uppercase with positive letter spacing for labels, table headers and metadata, and `tabular-nums` for changing numbers.
7. Show focus with `outline: 2px solid var(--ring)` and `outline-offset: 2px` on every interactive element.
8. Add no gradients, no blur, no soft shadows, no rounded corners and no transition longer than 100ms.

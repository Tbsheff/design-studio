# Classic Serif

## Visual Theme & Atmosphere

Classic Serif looks like a well-made printed book. The page is warm cream. Text is deep navy ink. Headings use a high-contrast display serif, and running text uses a sturdy text serif made for reading. A restrained gold appears only in small places: a rule, an ornament, a badge, a highlighted note.

The mood is traditional, calm and composed. Title pages are centered. Labels use small caps with open letter-spacing. Thin double rules divide sections. Corners are almost square.

The default is light. Dark mode is a navy night with cream text, and the gold stays the same warm tone.

## Color Palette & Roles

All values are OKLCH. The light value is the default. The dark value comes from the `studio.modes.dark` extension.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `oklch(96% 0.02 90)` | `oklch(17% 0.025 260)` | Page background: cream / navy night. |
| `--surface` | `oklch(98.5% 0.012 90)` | `oklch(21% 0.03 260)` | Cards, panels, inputs, dialogs. |
| `--fg` | `oklch(23% 0.06 262)` | `oklch(94% 0.018 90)` | Body text and headings: navy ink / cream. |
| `--fg-muted` | `oklch(45% 0.04 262)` | `oklch(76% 0.025 85)` | Captions, bylines, placeholders. |
| `--border` | `oklch(85% 0.025 85)` | `oklch(33% 0.03 260)` | Rules, dividers, input and card outlines. |
| `--primary` | `oklch(30% 0.085 262)` | `oklch(82% 0.05 260)` | Navy. One filled action per view, links. |
| `--primary-fg` | `oklch(97% 0.018 90)` | `oklch(20% 0.05 262)` | Text and icons on `--primary`. |
| `--accent` | `oklch(74% 0.105 82)` | `oklch(74% 0.1 82)` | Gold. Ornaments, rules, badges, callout fills. |
| `--accent-fg` | `oklch(23% 0.06 262)` | `oklch(18% 0.04 262)` | Navy text and icons on `--accent`. |
| `--success` | `oklch(48% 0.1 155)` | `oklch(75% 0.1 155)` | Positive status fills, icons, borders. |
| `--warning` | `oklch(58% 0.13 55)` | `oklch(76% 0.13 55)` | Caution status fills, icons, borders. |
| `--danger` | `oklch(48% 0.17 25)` | `oklch(70% 0.15 25)` | Destructive and error fills, icons, borders. |
| `--ring` | `oklch(30% 0.085 262)` | `oklch(82% 0.05 260)` | Focus outline. Matches primary. |

### Rules for color

- Gold is for small things only. Never fill a hero, a section or a large card with `--accent`.
- Never set text in gold on cream. Gold is too light to read there. Put `--accent-fg` text on a gold fill, or use gold only as a line or ornament.
- Status colors are for fills, icons and borders, not small body text. Pair each with an icon and a word.
- Soft status fill: `color-mix(in oklab, var(--warning) 14%, var(--surface))` with `--fg` text and a 1px border in the status color.
- Hover on primary: `color-mix(in oklab, var(--primary) 88%, var(--bg))`. Pressed: `color-mix(in oklab, var(--primary) 80%, var(--fg))`.

## Typography Rules

- Display: Libre Caslon Display, weight 400 only. Use it only at `--text-2xl` and above: h1, h2, h3, title pages, pull quotes.
- Text: Libre Caslon Text, 400, 400 italic and 700. Use it for h4 to h6, body, captions and labels.
- Mono: Courier Prime 400. Use it for code, reference numbers and typed notes.

The scale has a base of 1.0625rem (17px), a ratio of 1.25 (major third) upward, and 1.125 below base. The larger base suits long reading.

| Role | Token | Family / weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| h1 | `--text-4xl` | `--font-display` 400 | 1.1 | -0.015em |
| h2 | `--text-3xl` | `--font-display` 400 | 1.1 | -0.01em |
| h3 | `--text-2xl` | `--font-display` 400 | 1.15 | -0.005em |
| h4 | `--text-xl` | `--font-body` 700 | 1.2 | 0 |
| h5 | `--text-lg` | `--font-body` 400 italic | 1.3 | 0 |
| h6 | `--text-base` | `--font-body` 700, small caps | 1.35 | 0.06em |
| body | `--text-base` | `--font-body` 400 | 1.6 | 0 |
| lead | `--text-lg` | `--font-body` 400 | 1.5 | 0 |
| caption | `--text-sm` | `--font-body` 400 italic, `--fg-muted` | 1.45 | 0 |
| label | `--text-xs` | `--font-body` 400, small caps | 1.3 | 0.1em |

- Make small caps with `font-variant-caps: all-small-caps` where the font supports it, else `text-transform: uppercase` at `--text-xs` with 0.1em letter-spacing.
- Keep every weight at 400 or more below 18px. Do not fake bold on the display face. Do not use weights that are not loaded.
- Cap reading text at 66ch. Never pass 75ch.
- Set `text-wrap: balance` on headings and `text-wrap: pretty` on descriptions and paragraphs.
- Use `font-variant-numeric: oldstyle-nums` in prose. Use `font-variant-numeric: lining-nums tabular-nums` in tables, prices, dates in lists and any number that changes.
- Use a drop cap only on the first paragraph of a long article: `--font-display`, three lines tall, `--fg`.

## Component Stylings

### Buttons

All buttons use `--font-body` 400 at `--text-sm`, small caps, letter-spacing 0.08em, `--radius-sm` and a 1px border. Default height is 40px with padding `0 var(--space-5)`. Small is 32px with `0 var(--space-4)`. Large is 48px with `0 var(--space-6)` and `--text-base`.

- Primary: fill `--primary`, text `--primary-fg`, border `--primary`. Exactly one filled primary button per view.
- Secondary: no fill, text `--primary`, border `--primary`. Hover fill `color-mix(in oklab, var(--primary) 8%, var(--bg))`.
- Ghost: no fill, no border, text `--primary`, underline on hover with 1px thickness and 0.2em offset.
- Destructive: no fill, text `--fg`, 1px `--danger` border, with a warning icon. Use a solid `--danger` fill with `--primary-fg` text only in the final confirm dialog.
- Disabled: opacity 0.5, no hover change.
- Focus: `outline: 2px solid var(--ring); outline-offset: 2px`.

### Inputs

Height 44px, padding `0 var(--space-3)`, fill `--surface`, 1px `--border`, `--radius-sm`, text `--fg` in `--font-body` `--text-base` (never below 16px on mobile). Placeholder in `--fg-muted` italic. Labels sit above in small caps `--text-xs` with 0.1em spacing, gap `--space-2`. Focus: `outline: 2px solid var(--ring); outline-offset: 2px`. Error: border `--danger`, an icon, and a message in `--fg` below.

### Cards

Fill `--surface`, 1px `--border`, `--radius-md`, padding `--space-6` to `--space-8`. No shadow by default. A featured card adds a 2px `--accent` rule along the top edge. Card titles in `--font-body` 700 `--text-lg`; meta in small caps `--fg-muted`.

### Nav and top bar

Top bar 64px tall, fill `--bg`, bottom border a thin double rule: `border-bottom: 3px double var(--border)`. Wordmark text centered on title pages, left on app pages, in `--font-display` at `--text-2xl`. Nav links in small caps `--text-sm`, 0.08em spacing, `--fg`, gap `--space-6`. Active link: 1px `--accent` underline, 0.35em offset. Hover: text `--primary` with underline.

### Hero and title page

Centered column, max 40rem. Padding `var(--space-24) 0 var(--space-20)`. Order: small-caps kicker in `--fg-muted`, a short gold ornament rule (48px wide, 1px `--accent`), h1 in `--font-display` at `--text-4xl` scaled to `clamp(3.242rem, 6vw, 4.5rem)` on wide screens, an italic lead in `--text-lg`, then one primary and one secondary button. No images behind text.

### Tables

Top and bottom rules `3px double var(--border)`. Header in small caps `--text-xs`, `--fg-muted`. Rows 44px, padding `0 var(--space-3)`, 1px `--border` between rows. Numbers right-aligned with `lining-nums tabular-nums`. Selected row: fill `color-mix(in oklab, var(--accent) 18%, var(--surface))`. No zebra stripes.

### Badges, tags and callouts

Badge: height 22px, padding `0 var(--space-2)`, `--radius-sm`, small caps `--text-xs`. Gold badge: fill `--accent`, text `--accent-fg`. Neutral tag: no fill, 1px `--border`, text `--fg-muted`.
Callout: fill `color-mix(in oklab, var(--accent) 14%, var(--surface))`, 3px `--accent` left border, padding `--space-5`, `--radius-sm`.
Pull quote: `--font-display` `--text-2xl`, centered, thin `--accent` rules above and below.

### Ornaments

Section breaks use one centered fleuron in `--accent` or a 120px `3px double var(--border)` rule.

## Layout Principles

- Reading column: max 42rem (about 66ch at `--text-base`). Center it on article pages.
- Site container: max width 1120px, side gutters `--space-6` (desktop) and `--space-5` (mobile).
- Grid: 12 columns with `--space-8` gaps on desktop. Prefer asymmetric splits such as 7/5 or a 3-column side margin for notes.
- Section rhythm: `--space-20` between major sections, `--space-12` after a section heading, `--space-6` between paragraph groups.
- Paragraph spacing: `--space-4` between paragraphs. Do not indent and add space at once.
- Title pages, covers and empty states are centered. Forms, lists and tables are left-aligned.

## Depth & Elevation

This pack is mostly flat, like paper. Rules and borders do most of the work. Shadows are tinted navy, never pure black.

| Level | Treatment | Use |
|---|---|---|
| 0 | `--bg`, no border | Page, prose |
| 1 | `--surface`, 1px `--border` | Cards, inputs, panels |
| 2 | `--surface`, 1px `--border`, `--shadow-sm` | Hovered cards, sticky top bar |
| 3 | `--surface`, `--shadow-md` | Menus, popovers |
| 4 | `--surface`, `--shadow-lg` | Dialogs |

- Prefer a rule to a shadow. Use `3px double var(--border)` for major breaks and 1px `--border` for minor ones.
- Dialog scrim: `color-mix(in oklab, var(--fg) 40%, transparent)`.
- In dark mode the shadow tokens switch to deeper values. Keep the same levels.

## Do's and Don'ts

### Do

- Center title pages and section openers.
- Use small caps with 0.08em to 0.1em spacing for labels and nav.
- Use thin double rules to divide major sections.
- Use old-style figures in prose and tabular lining figures in tables.
- Keep gold small: rules, ornaments, badges, callout edges.
- Keep corners at `--radius-sm`, `--radius-md` or `--radius-lg` (2, 3, 4px).

### Don't

- Don't use Libre Caslon Display below `--text-2xl` or in bold.
- Don't fill large areas with gold, or set text in gold on cream.
- Don't use pill shapes for buttons or cards. Keep `--radius-pill` for small dots only.
- Don't use sans-serif type anywhere.
- Don't use heavy shadows, gradients or glass effects.
- Don't rely on status color alone.

## Responsive Behavior

| Breakpoint | Width | Changes |
|---|---|---|
| Mobile | < 640px | Single column. Gutters `--space-5`. Nav collapses to a centered wordmark and a "Menu" text button. Hero padding `var(--space-16) 0 var(--space-12)`. h1 stays at `--text-4xl`. Tables scroll on the x axis. Inputs use 16px text minimum. |
| Tablet | 640px to 1023px | Two-column grids. Side notes move below their paragraph. Section rhythm `--space-16`. |
| Desktop | 1024px to 1279px | 12-column grid, side notes in the margin, full nav. |
| Wide | >= 1280px | Container stays at 1120px and centers. Hero h1 scales up with `clamp()`. |

- Touch targets are at least 44px on mobile.
- Keep the reading column at 42rem max at every size.
- Respect `prefers-reduced-motion`. Transitions are opacity only, 200ms or less.

## Agent Prompt Guide

1. Set text in `var(--font-body)` and headings h1 to h3 in `var(--font-display)` at 400 weight, never below `var(--text-2xl)`. Use no sans-serif type.
2. Put navy `var(--fg)` text on cream `var(--bg)`. Use exactly one filled `var(--primary)` button per view.
3. Use gold `var(--accent)` only for rules, ornaments, badges and callout edges, with `var(--accent-fg)` for any text on it. Never use gold for large fills or for text on cream.
4. Use small caps with 0.08em to 0.1em letter-spacing for labels, nav and buttons. Use italic for captions and leads.
5. Divide major sections with `3px double var(--border)`. Prefer rules to shadows, and keep corners to `var(--radius-sm|md|lg)`.
6. Use `oldstyle-nums` in prose and `lining-nums tabular-nums` in tables and changing numbers.
7. Space only with `var(--space-N)` tokens, cap reading text at 66ch, and center title pages.
8. Support dark mode through the same tokens. Do not hard-code colors.

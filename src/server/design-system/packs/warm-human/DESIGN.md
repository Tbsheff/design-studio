# Warm Human

## Visual Theme & Atmosphere

Warm Human feels like a kind note from a person, not a message from a machine. Pages sit on soft oat paper. Text is a deep brown, not black. Actions glow in terracotta. Sage green marks the calm, good moments: a selected item, a tip, a tag.

Every shape is round: pill buttons, big card corners, circle avatars. Spacing is roomy. Use this pack for consumer, wellness, care and learning products where trust matters more than density.

- Copy tone: plain and warm. Speak to one person. "You're all set" beats "Operation completed successfully."
- Imagery: soft illustrations with round forms, warm photos, circle avatars.

## Color Palette & Roles

All values are OKLCH. The compiler emits each token as a CSS variable, for example `var(--primary)`. Dark values come from the token's dark mode.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `oklch(96.8% 0.016 75)` | `oklch(18% 0.012 50)` | Page background (oat). |
| `--surface` | `oklch(99% 0.008 75)` | `oklch(22.5% 0.014 50)` | Cards, panels, inputs, raised areas. |
| `--fg` | `oklch(24% 0.025 45)` | `oklch(94% 0.014 75)` | Body text and headings (warm brown). |
| `--fg-muted` | `oklch(47% 0.03 50)` | `oklch(74% 0.022 65)` | Secondary text, captions, placeholders. |
| `--border` | `oklch(88% 0.02 70)` | `oklch(33% 0.016 50)` | Dividers, input and card outlines. |
| `--primary` | `oklch(53% 0.135 40)` | `oklch(72% 0.12 42)` | Terracotta. One filled button per view, links. |
| `--primary-fg` | `oklch(99% 0.006 75)` | `oklch(19% 0.04 40)` | Text and icons on primary. |
| `--accent` | `oklch(89% 0.045 140)` | `oklch(32% 0.04 140)` | Sage fill: selected rows, tags, callouts. |
| `--accent-fg` | `oklch(33% 0.06 140)` | `oklch(88% 0.06 140)` | Text and icons on accent. |
| `--success` | `oklch(50% 0.11 155)` | `oklch(75% 0.11 155)` | Positive status icons, fills, borders. |
| `--warning` | `oklch(62% 0.13 75)` | `oklch(81% 0.12 80)` | Caution status icons, fills, borders. |
| `--danger` | `oklch(52% 0.17 18)` | `oklch(71% 0.15 18)` | Destructive and error icons, fills, borders. |
| `--ring` | `oklch(53% 0.135 40)` | `oklch(72% 0.12 42)` | Focus outline, 2px with 2px offset. |

### Usage rules

- Terracotta means action: the main button, links, the focus ring. Do not paint large areas with it.
- Sage `--accent` means calm: tags, selected states, tips. Always pair it with `--accent-fg`.
- Status colors (`--success`, `--warning`, `--danger`) are for fills, icons and borders, not small body text. Never rely on color alone: add an icon and a word ("Saved", "Check this", "Error").
- Soft tints: make light washes with mixes, for example `color-mix(in oklab, var(--primary) 10%, var(--surface))` for a terracotta-tinted panel, or `color-mix(in oklab, var(--danger) 12%, var(--surface))` for an error box.
- Hover on primary: `color-mix(in oklab, var(--primary) 88%, var(--fg))`. Pressed: `color-mix(in oklab, var(--primary) 78%, var(--fg))`.

## Typography Rules

- Display and body: **Nunito**, a rounded sans. Loaded weights: 400, 600, 800.
- Mono: **DM Mono** 400, for codes, order numbers and times that must align.
- Scale: base 1.0625rem (17px), ratio 1.25 (major third) upward, ratio 1.125 below base so small text stays easy to read.

| Role | Token | Size | Weight | Line height | Letter spacing |
|---|---|---|---|---|---|
| h1 | `--text-4xl` | 3.242rem | 800 | 1.1 | -0.02em |
| h2 | `--text-3xl` | 2.594rem | 800 | 1.1 | -0.015em |
| h3 | `--text-2xl` | 2.075rem | 800 | 1.15 | -0.01em |
| h4 | `--text-xl` | 1.66rem | 600 | 1.2 | -0.005em |
| h5 | `--text-lg` | 1.328rem | 600 | 1.3 | 0 |
| h6 | `--text-base` | 1.063rem | 600 | 1.4 | 0 |
| Body | `--text-base` | 1.063rem | 400 | 1.6 | 0 |
| Caption | `--text-sm` | 0.944rem | 400 | 1.5 | 0 |
| Label | `--text-sm` | 0.944rem | 600 | 1.4 | 0 |
| Overline | `--text-xs` | 0.84rem | 600 | 1.4 | +0.06em, uppercase |

- Use 800 only on display headings. Use 600 for labels, buttons and small headings. Below 18px, never go lighter than 400.
- Cap reading measure at 65ch (range 60–75ch).
- Headings get `text-wrap: balance`. Descriptions and intro paragraphs get `text-wrap: pretty`.
- Numbers that change (counts, prices, timers, progress) get `font-variant-numeric: tabular-nums`.
- Use sentence case for headings and buttons.

## Component Stylings

### Buttons

All buttons: `font-family: var(--font-body)`, weight 600, `--text-base`, height 48px (44px for compact), radius `var(--radius-pill)`, horizontal padding `var(--space-6)`, gap `var(--space-2)` between icon and label.

- **Primary**: fill `var(--primary)`, text `var(--primary-fg)`, `box-shadow: var(--shadow-sm)`. Hover: `color-mix(in oklab, var(--primary) 88%, var(--fg))` and `var(--shadow-md)`. Pressed: `color-mix(in oklab, var(--primary) 78%, var(--fg))`, no lift. Exactly one filled primary button per view.
- **Secondary**: fill `var(--surface)`, text `var(--fg)`, `1.5px solid var(--border)`. Hover: border `color-mix(in oklab, var(--primary) 40%, var(--border))`, fill `color-mix(in oklab, var(--primary) 6%, var(--surface))`.
- **Ghost**: no fill, no border, text `var(--primary)`, padding `var(--space-4)`. Hover: fill `color-mix(in oklab, var(--primary) 8%, transparent)`.
- **Destructive**: fill `var(--danger)`, text `var(--primary-fg)`. Use only in a confirm step. Label says what happens: "Delete journal", not "OK".
- Disabled: 50% opacity, no shadow.
- Icon-only buttons: 44px circle with an `aria-label`.

### Inputs

- Height 48px, padding `var(--space-3) var(--space-4)`, fill `var(--surface)`, `1.5px solid var(--border)`, radius `var(--radius-md)`.
- Font size `--text-base`. Never below 16px on mobile, so the browser does not zoom.
- Label above the field: `--text-sm`, weight 600, gap `var(--space-2)`. Helper text below in `--fg-muted`, `--text-sm`.
- Focus: `outline: 2px solid var(--ring); outline-offset: 2px`. Do not remove the outline.
- Error: border `var(--danger)`, an icon, and a helper line that says how to fix it.

### Cards

- Fill `var(--surface)`, radius `var(--radius-lg)`, padding `var(--space-6)` (mobile) to `var(--space-8)` (desktop).
- Rest state: `1px solid var(--border)` or `var(--shadow-sm)`.
- Clickable cards lift on hover: `var(--shadow-md)` and `translateY(-2px)` over 180ms ease-out.

### Nav / top bar

- Height 64px on desktop, 56px on mobile. Fill `var(--bg)` with a `1px solid var(--border)` bottom edge once the page scrolls.
- Links: `--text-base`, weight 600, `--fg`. The active link sits on a sage pill: `var(--accent)` fill, `var(--accent-fg)` text, padding `var(--space-2) var(--space-4)`.
- Avatar: 36px circle with a 2px `var(--surface)` ring.

### Hero

- Vertical padding `var(--space-20)` desktop, `var(--space-12)` mobile.
- h1 at `--text-4xl`, weight 800, max 18ch, balanced. Intro paragraph at `--text-lg`, `--fg-muted`, max 52ch.
- One primary button and one ghost or secondary button.
- Pair the text with a soft illustration or a photo in a `var(--radius-lg)` frame, on a sage `var(--accent)` blob.

### Tables

- Wrap tables in a card with `var(--radius-lg)` and `overflow: hidden`.
- Row height 56px, cell padding `var(--space-3) var(--space-4)`. Header row: `--text-sm`, weight 600, `--fg-muted`, fill `color-mix(in oklab, var(--accent) 35%, var(--surface))`.
- Rows divide with `1px solid var(--border)`. Selected row: `var(--accent)` fill.
- Numeric columns: right-aligned, `tabular-nums`.

### Badges & tags

- Pill shape, `var(--radius-pill)`, padding `var(--space-1) var(--space-3)`, `--text-sm`, weight 600.
- Default tag: `var(--accent)` fill, `var(--accent-fg)` text.
- Status badge: fill `color-mix(in oklab, var(--success) 15%, var(--surface))`, text `var(--fg)`, a dot or icon in `var(--success)`.
- Avatars: circles at 28, 36, 48 or 72px. Fallback: initials on `var(--accent)` with `var(--accent-fg)`.

## Layout Principles

- Spacing uses the 4px grid: `--space-1` to `--space-24`.
- Container max width: 1120px (70rem) for app pages, 720px (45rem) for reading pages and forms.
- Side gutters: `var(--space-5)` on mobile, `var(--space-8)` on tablet, `var(--space-12)` on desktop.
- Grid: 4 columns mobile, 8 tablet, 12 desktop. Column gap `var(--space-6)` desktop, `var(--space-4)` mobile.
- Section rhythm: `var(--space-20)` between major sections on desktop, `var(--space-12)` on mobile. Inside a section, `var(--space-8)` between groups and `var(--space-4)` between related items.
- Forms: one column, `var(--space-6)` between fields, max 480px.
- Group with space, not extra dividers.

## Depth & Elevation

Shadows are warm and tinted with the brown palette hue. They never use pure black. Dark mode uses deeper shadows from the token's dark value.

- `--shadow-sm`: resting cards, primary button, inputs on hover. A soft touch, not a lift.
- `--shadow-md`: hovered cards, dropdowns, popovers, sticky top bar after scroll.
- `--shadow-lg`: dialogs, sheets, toasts. Only one `--shadow-lg` layer on screen at a time.
- Borders: use `1px solid var(--border)` for dividers and quiet cards. In dark mode, shadows show less, so lean on borders and lighter `--surface`.
- A tinted panel (`color-mix(in oklab, var(--accent) 40%, var(--surface))`) can replace a shadow for callouts.
- Dialog backdrop: `color-mix(in oklab, var(--fg) 40%, transparent)`.

## Do's and Don'ts

### Do

- Use large radii everywhere: `--radius-lg` for cards and dialogs, `--radius-md` for inputs and media, pills for buttons and tags.
- Leave room. When in doubt, add one more space step.
- Give empty states an illustration, one kind sentence and one clear action.

### Don't

- Don't use pure black or pure white. Use `--fg`, `--bg` and `--surface`.
- Don't put two filled primary buttons in one view.
- Don't use square corners or 2px radii.
- Don't use cold gray or heavy black shadows.
- Don't set small text in status colors. Don't show status by color alone.
- Don't crowd the screen with dense tables or tiny text. This is not a pro data tool.

## Responsive Behavior

| Breakpoint | Width | Changes |
|---|---|---|
| Mobile | < 640px | 4-col grid, gutters `--space-5`. h1 drops to `--text-3xl`, h2 to `--text-2xl`. Buttons go full width in forms and dialogs. Nav collapses to a menu button. Card padding `--space-6`. |
| Tablet | 640–1023px | 8-col grid, gutters `--space-8`. Cards in 2 columns. Hero stacks art below text. |
| Desktop | 1024–1279px | 12-col grid, gutters `--space-12`. Full nav. Hero splits text and art 6/6. |
| Wide | ≥ 1280px | Container stops at 1120px and centers. Extra space goes to the margins. |

- Touch targets are at least 44×44px at every size.
- Inputs keep 16px or larger font on mobile.
- Dialogs become bottom sheets on mobile, with `--radius-lg` on the top corners only.
- Respect `prefers-reduced-motion`.

## Agent Prompt Guide

1. Use only pack tokens (`var(--bg)`, `var(--primary)`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`). Make hover and tint states with `color-mix(in oklab, ...)`. Do not invent tokens or hard-code colors.
2. Set Nunito for all text (400 body, 600 labels and buttons, 800 headings) and DM Mono only for codes and aligned numbers. Body text is `--text-base` with line-height 1.6.
3. Round everything: pill buttons and tags, `--radius-md` inputs, `--radius-lg` cards, circle avatars.
4. Put exactly one filled terracotta primary button in each view. Use secondary or ghost buttons for all other actions.
5. Use sage `--accent` with `--accent-fg` for tags, selected states and tips. Keep status colors for icons, fills and borders, and always add a label or icon.
6. Space generously: `--space-20` between sections, `--space-6` to `--space-8` inside cards, 65ch max line length.
7. Give every interactive element a visible focus ring (`2px solid var(--ring)`, 2px offset) and a 44px target.
8. Write warm, short, second-person copy. Fill empty screens with a soft illustration and one action.

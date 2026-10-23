# Tech Utility

## Visual Theme & Atmosphere

Tech Utility is a work tool. It shows a lot of data on one screen and gets out of the way. Surfaces are cool, quiet grays. Lines are thin and exact. One sharp azure color marks the main action, the current selection and focus. Everything else stays neutral, so the signal is easy to find.

Corners are small. Rows are compact. Monospace text carries IDs, numbers, code and timestamps, so columns line up. Use this pack for dashboards, admin consoles, developer tools, logs and monitoring.

- Copy tone: short and literal. "3 jobs failed" beats "Uh oh, something went wrong!"
- Imagery: none. Use charts, status icons and real data. Icons are 16px line icons, 1.5px stroke.

## Color Palette & Roles

All values are OKLCH. The compiler emits each token as a CSS variable, for example `var(--primary)`. Dark values come from the token's dark mode.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `oklch(97% 0.004 250)` | `oklch(17% 0.01 255)` | App background, sidebar, gutters. |
| `--surface` | `oklch(99.5% 0.002 250)` | `oklch(20.5% 0.012 255)` | Panels, tables, inputs, raised areas. |
| `--fg` | `oklch(20% 0.015 255)` | `oklch(94% 0.006 250)` | Body text, headings, data values. |
| `--fg-muted` | `oklch(46% 0.018 255)` | `oklch(72% 0.016 250)` | Column headers, metadata, placeholders. |
| `--border` | `oklch(88% 0.008 250)` | `oklch(31% 0.014 255)` | Dividers, table rules, input and panel outlines. |
| `--primary` | `oklch(52% 0.15 252)` | `oklch(72% 0.14 245)` | Azure signal. One filled button per view, links, active nav. |
| `--primary-fg` | `oklch(99% 0.003 250)` | `oklch(16% 0.04 255)` | Text and icons on primary. |
| `--accent` | `oklch(93% 0.03 245)` | `oklch(28% 0.06 252)` | Selected rows, active filters, callouts. |
| `--accent-fg` | `oklch(40% 0.115 252)` | `oklch(86% 0.07 245)` | Text and icons on accent. |
| `--success` | `oklch(52% 0.13 150)` | `oklch(76% 0.14 150)` | Healthy, passed, online: icons, fills, borders. |
| `--warning` | `oklch(68% 0.14 70)` | `oklch(80% 0.14 75)` | Degraded, pending: icons, fills, borders. |
| `--danger` | `oklch(54% 0.2 25)` | `oklch(70% 0.17 25)` | Failed, destructive: icons, fills, borders. |
| `--ring` | `oklch(52% 0.15 252)` | `oklch(72% 0.14 245)` | Focus outline, 2px with 2px offset. |

### Usage rules

- Gray carries structure. Azure carries meaning. Keep azure under about 5% of the screen.
- Status colors (`--success`, `--warning`, `--danger`) are for fills, icons, dots and borders, not small body text. Never rely on color alone: pair each with an icon shape and a word ("Passed", "Degraded", "Failed").
- Row hover: `color-mix(in oklab, var(--fg) 4%, var(--surface))`.
- Primary hover: `color-mix(in oklab, var(--primary) 88%, var(--fg))`. Pressed: `color-mix(in oklab, var(--primary) 78%, var(--fg))`.
- Status banner: `color-mix(in oklab, var(--danger) 12%, var(--surface))` fill.

## Typography Rules

- Display and body: **IBM Plex Sans**. Loaded weights: 400, 500, 600.
- Mono: **IBM Plex Mono**. Loaded weights: 400, 500.
- Scale: base 0.875rem (14px), ratio 1.125 (major second). The base is 14px because this is a dense pro tool. Headings stay small; weight and position carry hierarchy.

| Role | Token | Size | Weight | Line height | Letter spacing |
|---|---|---|---|---|---|
| h1 (page title) | `--text-4xl` | 1.577rem | 600 | 1.15 | -0.01em |
| h2 | `--text-3xl` | 1.402rem | 600 | 1.2 | -0.005em |
| h3 | `--text-2xl` | 1.246rem | 600 | 1.25 | 0 |
| h4 | `--text-xl` | 1.107rem | 600 | 1.3 | 0 |
| h5 (panel title) | `--text-lg` | 0.984rem | 600 | 1.35 | 0 |
| h6 | `--text-base` | 0.875rem | 600 | 1.4 | 0 |
| Body | `--text-base` | 0.875rem | 400 | 1.5 | 0 |
| Caption / meta | `--text-sm` | 0.778rem | 400 | 1.45 | 0 |
| Label / column header | `--text-xs` | 0.691rem | 500 | 1.4 | +0.06em, uppercase |
| Data / code (mono) | `--text-sm` | 0.778rem | 400 | 1.45 | 0 |

- Use `var(--font-mono)` for IDs, hashes, timestamps, code, paths and numeric columns.
- Numbers that change or sit in columns get `font-variant-numeric: tabular-nums`.
- Below 18px, use weight 400 or more. Use 500 for labels and buttons, 600 for titles. Do not use 300.
- Cap prose (docs, descriptions, empty states) at 72ch. Tables and logs can run wider.
- Headings get `text-wrap: balance`. Descriptions get `text-wrap: pretty`.
- Truncate long IDs in the middle (`a8f3…9c21`); show the full value in a tooltip.

## Component Stylings

### Buttons

All buttons: `var(--font-body)`, weight 500, `--text-base`, radius `var(--radius-md)`, gap `var(--space-2)`, 16px icons.

- Heights: 32px (padding `0 var(--space-3)`), compact 28px (`0 var(--space-2)`).
- **Primary**: fill `var(--primary)`, text `var(--primary-fg)`, no shadow. Hover `color-mix(in oklab, var(--primary) 88%, var(--fg))`. Pressed `color-mix(in oklab, var(--primary) 78%, var(--fg))`. Exactly one filled primary button per view.
- **Secondary**: fill `var(--surface)`, text `var(--fg)`, `1px solid var(--border)`. Hover fill `color-mix(in oklab, var(--fg) 5%, var(--surface))`.
- **Ghost**: no fill, no border, text `var(--fg-muted)`. Hover fill `color-mix(in oklab, var(--fg) 6%, transparent)`. For toolbars and rows.
- **Destructive**: fill `var(--danger)`, text `var(--primary-fg)`. Use in confirm dialogs only.
- Shortcut hint: `<kbd>` in mono `--text-xs`, `1px solid var(--border)`, `var(--radius-sm)`, `--fg-muted`.

### Inputs

- Height 32px (28px compact), padding `0 var(--space-2)`, fill `var(--surface)`, `1px solid var(--border)`, radius `var(--radius-md)`.
- Font `--text-base` on desktop. On mobile, inputs must be 16px or the browser zooms.
- Focus: `outline: 2px solid var(--ring); outline-offset: 2px`. Border stays.
- Labels sit above at `--text-sm`, weight 500. Search fields show a `/` hint as a `<kbd>`. ID, regex and JSON fields use `var(--font-mono)`.

### Cards / panels

- Panels, not floating cards. Fill `var(--surface)`, `1px solid var(--border)`, radius `var(--radius-lg)`, no shadow.
- Panel header: 40px, title `--text-lg` 600, ghost actions right, border below. Body padding `var(--space-3)`.
- Stat tiles: label style on top; value at `--text-3xl`, mono, `tabular-nums`; delta with an arrow icon.

### Sidebar & top bar

- Sidebar: 240px wide (56px when collapsed to icons), fill `var(--bg)`, `1px solid var(--border)` on the right.
- Sidebar items: 28px tall, padding `0 var(--space-2)`, radius `var(--radius-md)`, `--text-base`, 16px icon. Active item: `var(--accent)` fill, `var(--accent-fg)` text. Group labels in the label style.
- Top bar: 48px tall, fill `var(--surface)`, `1px solid var(--border)` below. Holds breadcrumbs, search and the user menu.

### Hero

- In the app, use a page header, not a hero: padding `var(--space-6) 0 var(--space-4)`, h1 at `--text-4xl`, one `--fg-muted` meta line, actions on the right.
- On a landing page: `var(--space-16)` vertical padding, h1 at `--text-4xl` weight 600, and a real product screenshot in a `1px solid var(--border)`, `var(--radius-lg)` frame.

### Data tables

- Row height 32px (28px compact, 40px comfortable). Cell padding `0 var(--space-3)`.
- Header row: 32px, label style (`--text-xs`, 500, uppercase, `--fg-muted`), fill `var(--bg)`, sticky on scroll.
- Rows divide with `1px solid var(--border)`. Hover `color-mix(in oklab, var(--fg) 4%, var(--surface))`. Selected `var(--accent)`.
- Numeric columns: right-aligned, `var(--font-mono)`, `tabular-nums`. IDs and timestamps: mono, left-aligned.
- First column: a 16px checkbox for bulk actions. Row actions show as ghost icons on hover and focus. Row counts ("1–50 of 2,341") use mono.

### Status pills & tags

- Status pill: height 20px, padding `0 var(--space-2)`, radius `var(--radius-pill)`, `--text-xs` weight 500, text `var(--fg)`, fill `color-mix(in oklab, var(--success) 14%, var(--surface))`, a 6px dot in `var(--success)`. Always include the word.
- Tags: radius `var(--radius-sm)`, fill `var(--accent)`, text `var(--accent-fg)`, `--text-xs`, mono for key:value tags (`env:prod`).
- Code blocks: fill `color-mix(in oklab, var(--fg) 4%, var(--surface))`, `1px solid var(--border)`, `var(--radius-md)`, padding `var(--space-3)`, mono `--text-sm`.

## Layout Principles

- Spacing uses the 4px grid. Dense screens stay in `--space-1` to `--space-6`.
- App shell: sidebar 240px + fluid main area. Main content max width 1440px (90rem). Settings and forms cap at 720px (45rem).
- Page gutters: `var(--space-4)` mobile, `var(--space-6)` desktop.
- Grid: 12 columns, `var(--space-4)` gap. Dashboards use 3- or 4-up stat tiles and 2-up chart panels.
- Vertical rhythm: `var(--space-6)` between page sections, `var(--space-4)` between panels, `var(--space-2)` between related controls.
- Put filters and bulk actions in a 40px toolbar above the table.

## Depth & Elevation

Borders do the work. Shadows are only for things that float.

- Flat layer: `--bg` for the shell, `--surface` for panels, `1px solid var(--border)` between them. No shadow.
- `--shadow-sm`: sticky headers and toolbars while content scrolls under them.
- `--shadow-md`: dropdowns, menus, popovers, tooltips, command palette.
- `--shadow-lg`: modal dialogs and side drawers only.
- In dark mode, shadows show less. Keep the `1px solid var(--border)` on every floating layer.
- Modal backdrop: `color-mix(in oklab, var(--bg) 70%, transparent)`.

## Do's and Don'ts

### Do

- Use monospace with `tabular-nums` for IDs, numbers, code, timestamps and numeric columns.
- Keep controls 28–32px tall and table rows 32px.
- Show keyboard shortcuts in `<kbd>` hints and support them.
- Use one azure signal and let grays do the rest.
- Pair every status color with an icon and a word.
- Show relative time with the exact time in a tooltip.

### Don't

- Don't use large radii, pill buttons or soft blobs. Max radius is `--radius-lg` (6px), except status pills.
- Don't add shadows to resting panels or cards.
- Don't use a second bright color for decoration.
- Don't set small text in `--success`, `--warning` or `--danger`.
- Don't use proportional figures in data columns.
- Don't hide values behind hover.
- Don't use playful copy or emoji.

## Responsive Behavior

| Breakpoint | Width | Changes |
|---|---|---|
| Mobile | < 640px | Sidebar becomes a drawer. Inputs 16px, touch targets 44px. Tables scroll sideways with a sticky first column. Stat tiles stack 1-up. |
| Tablet | 640–1023px | Sidebar collapses to the 56px icon rail. Stat tiles 2-up. Tables scroll sideways; hide low-value columns. |
| Desktop | 1024–1439px | Full 240px sidebar. Stat tiles 4-up. Controls 32px, rows 32px. |
| Wide | ≥ 1440px | Main area stops at 1440px. Offer a side detail panel (360–420px) next to the table. |

- Hide `<kbd>` hints on touch screens.
- Respect `prefers-reduced-motion`. Keep motion under 150ms.

## Agent Prompt Guide

1. Use only pack tokens (`var(--surface)`, `var(--border)`, `var(--primary)`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`). Make hover and tint states with `color-mix(in oklab, ...)`. Never hard-code colors or invent tokens.
2. Set IBM Plex Sans at `--text-base` (14px) for UI text and IBM Plex Mono with `tabular-nums` for IDs, numbers and code.
3. Build dense: 32px buttons and inputs (28px compact), 32px table rows, 28px sidebar items, `--space-2` to `--space-4` padding. On mobile, raise inputs to 16px and targets to 44px.
4. Separate areas with `1px solid var(--border)`, not shadows. Use shadows only for menus, popovers and dialogs.
5. Use azure `--primary` for exactly one filled button per view, links and active states. Keep everything else gray.
6. Show status with a pill: tinted fill, dot or icon, and a word. Never use status colors for small text.
7. Add `<kbd>` shortcut hints to search and primary actions, and wire up the keys.
8. Give every interactive element a visible focus ring: `outline: 2px solid var(--ring); outline-offset: 2px`.

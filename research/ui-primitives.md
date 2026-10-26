# UI primitives (Claude Design foundation)

Use these classes. Do not add raw colors. All are CSS only (no React components), so they cost no Home JS. You can see them in both themes at `scripts/ui-primitives.html?theme=dark|light`. Serve it with `npx vite --config vite.ui.config.ts --port <free> --strictPort` and open `/scripts/ui-primitives.html`.

Files: `src/ui/styles/tokens.css` (values), `fonts.css` (local fonts), `primitives.css` (new `ui-*` classes), `controls.css` (button families).

## Tokens

| Group | Tokens |
| --- | --- |
| Surfaces | `--bg`, `--surface`, `--surface-2`, `--surface-raised` (menus, cards, composer), `--surface-hover`, `--surface-active` (selected fill), `--surface-inset` (canvas card), `--line`, `--line-strong` |
| Text | `--text`, `--text-2` (muted), `--text-3` (labels, ≥ 4.5:1), `--text-faint` (placeholder, disabled only) |
| Send/run (coral) | `--brand`, `--brand-hover`, `--brand-press`, `--brand-soft`, `--on-brand`. Use ONLY for the primary send/run action. |
| Strong button | `--strong`, `--strong-hover`, `--on-strong` (white in dark, near-black in light) |
| Blue (links, focus, selection, info, toggled) | `--accent`, `--accent-hover`, `--accent-soft`, `--accent-line`, `--accent-text`, `--accent-tint`, `--on-accent` |
| Status | `--warn`, `--warn-soft`, `--warn-line` (amber notice), `--danger*`, `--ok*` |
| Type | `--font` (Inter), `--serif` (Source Serif 4), `--mono`; sizes `--t-xs` 12, `--t-sm` 13, `--t-md` 14, `--t-lg` 16, `--t-xl` 20, `--t-2xl` 28, `--t-display` 40; line heights `--lh-xs` 16, `--lh-sm` 18, `--lh-md` 20, `--lh-lg` 24, `--lh-xl` 28, `--lh-2xl` 34, `--lh-display` 46; weights `--w-regular` 400, `--w-medium` 500 (no other weights) |
| Shape | `--r-sm` 6, `--r-md` 8 (controls), `--r-lg` 12 (cards), `--r-xl` 16 (big composer) |
| Depth | `--shadow-inset` (1 px line ring), `--shadow-sm`, `--shadow-md`, `--shadow-pop` (menus, popovers), `--shadow-lg` (dialogs) |
| Motion | `--dur-fast` 120, `--dur` 140, `--dur-slow` 200 ms; `--ease` = `--ease-out`; `--ease-spring` has no overshoot |

## Buttons

| Class | Look |
| --- | --- |
| `.btn.send` | Coral fill, white text. Send, Create, Run. |
| `.btn.strong` (`.btn.primary` is the same) | White fill, dark text in dark theme ("Share", "Save", dialog confirm). |
| `.btn` | Secondary: page fill with a 1 px border. |
| `.btn.ghost` | No fill, muted text. |
| `.btn.small` / `.btn.large` | 28 / 36 px high (default 32). |
| `.icon-btn` / `.icon-btn.small` | 32 / 28 px square, no border. |
| `.icon-btn.bordered` | Square with a border (composer "+", "</>"). |
| `.icon-btn.send` | Square coral send. `disabled` dims it. |
| `.link` | Blue text link. |

## Controls

- Two-line pill select: `<button class="ui-pill-select"><span class="ui-pill-select-label">Model</span><span class="ui-pill-select-value">Opus 5.5</span><svg class="ui-pill-select-caret">…</svg></button>`. `aria-expanded="true"` keeps the hover fill.
- Segmented tool group: `<div class="ui-tools" role="group"><button aria-pressed="true">…</button><button aria-pressed="false">Comment</button>…</div>`. The pressed segment is raised. `.on` also works. For tabs use the existing `.segmented` with `button.on`.
- Zoom pill: `<div class="ui-zoom"><button>−</button><span class="ui-zoom-value">59%</span><button>+</button></div>`.
- Inspector field row: `<div class="ui-fields">` (2 columns; give a child `.wide` to span both) holding `<label class="ui-field"><span class="ui-field-label">Size</span><input /><span class="ui-field-unit">px</span></label>`. The value is right-aligned. Optional `<span class="ui-field-swatch" style="--swatch: …">`, a `select`, or a read-only `<span class="ui-field-value">`.

## Menus and surfaces

- `.ui-menu` > `.ui-menu-section` (sections get a divider) > `.ui-menu-label` (small muted caption) and `.ui-menu-item` (32 px, svg icon + label). Add `.ui-menu-meta` for right-side text. `aria-checked="true"` shows a blue dot. `disabled` / `aria-disabled` fades the item. `[data-highlighted]` gets the hover fill.
- `.ui-popover`: raised surface, 12 px radius, `--shadow-pop`.
- `.ui-card`: raised card with a 1 px ring. `.ui-composer`: 16 px radius composer card. `.ui-inset`: inset canvas card.
- `.ui-section-label`: small uppercase muted caption ("CHOOSE A TEMPLATE").

## Content

- `.ui-display` (serif 40, `.small` = 28) for the few big headlines. `.ui-prose` for serif body copy. Assistant chat messages (`.assistant-text` markdown) already use the serif.
- `.ui-chip` ("Hi-fi design"), `.ui-mention` (blue outline, "@Claude"), `.ui-file-chip` (bordered file button with an icon).
- `.ui-status` > `.ui-status-mark` + text: a live row with a turning coral mark. `.ui-status-mark.idle` stops it.
- `.ui-notice` (amber warning card) and `.ui-notice.info` (blue). Put an svg first for the icon.
- `.ui-tile-grid` > `button.ui-tile` > `.ui-tile-art` (icon illustration) + label. `aria-pressed="true"` or `.on` gives the raised selected fill.

## Rules

- Coral is for send/run only. Selection, focus, links and info use blue `--accent`.
- Weights are 400 and 500 only. `strong`, `h1`–`h4` and Tailwind `font-semibold`/`font-bold` all map to 500.
- The preview iframe keeps the authored look. Do not give `--frame-bg`, `--select*`, `--measure`, halo or pin tokens dark values.

# cycle 44, pick 5: dark-a11y

Branch `feat/dark-a11y`. No new action, no new tool name.

## Commits

- `80045ba0d` server: `accessibility.inspect` takes `colorScheme` (`"light" | "dark" | null`, default null). `runAccessibilityInspect` wraps the preview with `toSchemedPreview` (from `preview/page-capture/index.ts`). In dark, token entries use `darkValue`, so the suggested token is checked against the dark value. Description gets "Pass colorScheme dark to check the dark theme."
- `b43be4951` UI: "Theme" Light / Dark control in the Accessibility section (new `theme-choice.tsx`). Starts at Light, kept in component state only. In Dark, the Fix button is off with the tip "Set the dark value of this token in Tokens, or ask Claude."
- `56c61023b` UI: the Fix button goes on its own line. Before, a row with a Fix made the inspector scroll sideways (also on main for low light rows).

## Checked

- `call-action accessibility.inspect` on `dax-seed` (HTML, `.dark` tokens) and `dax-next` (Tailwind `dark:` classes): http, mcp and agent pass, 0 diffs each.
  - `dax-seed` dark: 1 low pair, `#6b7280` on `#111827`, 3.67:1; suggests `--fg-muted` (dark hex `#aea69d`, 7.41:1). Light (no `colorScheme`): 0 low pairs, as on main.
  - `dax-next` dark: 1 low pair, 2.35:1, no token. Light: 0 low pairs.
- UI (playwright, dark and light app theme): Light row 7.56:1 passes; Dark row 3.67:1 fails, Fix off with the tip; back to Light restores the row. No sideways overflow.
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass (59,576, baseline 89,733). `pnpm run build:ui`: pass. `check-bundle`: B1 271,703 B (delta 0). `check-actions --probes`: 278 hits (E1 25, E16 6, O11 1, O12 52, S11 194), same as main, none in accessibility.
- `get-screenshot.ts` and `artifacts/mcp-snapshots/*` unchanged: no snapshot diff.

## Screenshots

`cycle-44/dark-a11y/seed-dark-theme-{dark,light}.png` (Dark choice, app in dark and light), `seed-light-theme-{dark,light}.png` (Light choice).

## Files outside the spec list

`ui/features/accessibility/{accessibility-body.tsx,contrast-row.tsx,use-accessibility-info.ts,use-tab-order.ts,vision-lost.tsx}`: same feature folder, no other pick owns them.

## Left out

- A dark token write from Fix (runner-up in the spec).
- `accessibility-store.ts` and `review/accessibility/inspect.ts` needed no change; the command passes through.

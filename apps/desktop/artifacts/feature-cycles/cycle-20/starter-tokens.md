# Cycle 20 pick 2: starter-tokens

## What changed

- New engine `server/design-system/engine/to-starter-roles.ts`. It maps each starter role to a `var()` from the pack's own names. Order per role: shadcn name, then `--color-*`, then the studio name. Fonts keep `--font-body` and `--font-display` first. Bonaparte's `--font-sans` is a system stack, and the real app sets Inter with `next/font`. `radius-lg` takes `--radius` first. Spacing uses `--space-N`, else `calc(var(--spacing) * N)`.
- `to-starter-page.ts` writes `var(<name>)` with no fallback for a matched role. An unmatched role keeps today's name and fallback.
- `created-pack.ts` passes roles only for user packs (`pack.source === "user"`). Built-in packs get today's page, byte for byte.
- `extract/compose.ts` and one line in `extract/draft.ts`: while the scan runs, the description is "<name>: Reading sources…". DESIGN.md lists no fonts until the scan ends.

## Spec deviation

The spec puts the studio name first. Imported packs always have the studio aliases (`--bg`, `--fg`) next to the source names, so studio-first would give `var(--bg)` and never `var(--background)`. All `var()` calls already resolved to Bonaparte values before this change. The real gap was the names. Source names come first for user packs.

## Checked

- MCP (port 4962): `create_design_system` on a `git clone --local` copy of Bonaparte, `save_design_system`, then `create_project` with `user-bonaparte` and `modern-minimal`.
- Bonaparte starter: every `var()` names a token in its `tokens.css`. The page uses `--background`, `--card`, `--foreground`, `--muted-foreground`, `--primary-foreground`, `--radius` and `--space-*`, with 0 hex fallbacks.
- `modern-minimal` starter: `cmp` with the baseline from before the change passes (identical).
- First import response: "Bonaparte Two: Reading sources…", with no "no sources". After the scan: "from local folder, pasted DESIGN.md, brief".
- Bonaparte `git status --short`: same before and after.
- No new actions, so `call-action.ts` does not apply.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.
- Screenshots: `cycle-20/starter-tokens/{bonaparte,modern-minimal}-{light,dark}.png`. Bonaparte dark mode uses the `.dark` class, so the dark shot adds that class to the frame. The bridge theme control does the same in Play mode.
- MCP `get_screenshot` for both starters: `{bonaparte,modern-minimal}-mcp-light.png`. The tool has no dark option.
- Brief-only import: during the scan it says "Reading sources…". After the scan, DESIGN.md says "Draft made from: brief" and lists the fonts.

## Left out

- The first import response still lists Geist in `pack.fonts`, and the DESIGN.md token table still shows Geist. Both come from the base pack in `draft.ts` and the manifest schema, which this pick does not own. They change to Inter when the scan ends.
- Text sizes, `--radius-pill` and `--shadow-sm` keep their fallbacks. They are not starter roles.

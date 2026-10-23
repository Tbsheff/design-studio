# Design systems: external research (2026-10-22)

Labels: **[V]** = I read the primary source. **[S]** = secondary source only. **[U]** = from memory, not checked.

## 1. DESIGN.md

**Google Labs (Stitch) defined it.** The spec is in alpha, Apache-2.0, at [google-labs-code/design.md](https://github.com/google-labs-code/design.md) ([spec](https://raw.githubusercontent.com/google-labs-code/design.md/main/docs/spec.md)) [V]. VoltAgent's [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (MIT, about 84 files) and [getdesign.md](https://getdesign.md/) (also VoltAgent) are catalogs built on that format [V].

There are **two dialects**:

| | Google spec | VoltAgent |
|---|---|---|
| Tokens | YAML front matter: `name`, `colors`, `typography`, `rounded`, `spacing`, `components`, `omitted`. References use `{colors.primary}` | Prose and tables only |
| Sections | 8, in a fixed order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts | 9: Visual Theme, Color Palette & Roles, Typography, Component Stylings, Layout, Depth & Elevation, Do's/Don'ts, **Responsive Behavior**, **Agent Prompt Guide** |

CLI: `npx @google/design.md lint|diff|export --format dtcg`. Lint rules [V] include `broken-ref` (error), `contrast-ratio` (4.5:1), and `section-order`. The spec keeps unknown section headings, so the VoltAgent extras stay valid. **The front-matter schema has no light/dark modes.**

**open-design** ([repo](https://github.com/nexu-io/open-design), Apache-2.0, 151 packs) [V]: each pack is `design-systems/<slug>/{manifest.json, DESIGN.md, tokens.css}`. Manifest fields: `schemaVersion` (`od-design-system-project/v1`), `id`, `name`, `category`, `description`, `source`, `files`. `tokens.css` is the "canonical compiled semantic-token stylesheet". The active pack's DESIGN.md goes into every render ([pack README](https://github.com/nexu-io/open-design/blob/main/design-systems/README.md)).

## 2. Token standards and tools

**DTCG Format 2025.10 is stable** (Final Community Group Report, 28 Oct 2025). It is not on the W3C Standards Track [V] ([format](https://www.designtokens.org/tr/2025.10/format/), [announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)).
- Tokens have `$value` and optional `$type`, `$description`, `$deprecated`, `$extensions`. Groups pass `$type` down and support `$root` and `$extends`. Aliases: `{group.token}`.
- 7 simple types (`color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`) and 6 composite types (`shadow`, `typography`, `border`, …). Dimensions: `{"value":16,"unit":"px"}`, `px` or `rem` only.
- Color values look like `{"colorSpace":"oklch","components":[0.70,0.32,328],"alpha":1,"hex":"#ff00ff"}` and allow 14 color spaces ([color module](https://www.designtokens.org/tr/2025.10/color/)) [V].
- **The [Resolver module](https://www.designtokens.org/tr/2025.10/resolver/) handles modes.** It has `sets`, `modifiers` (for example `theme` with `light` and `dark` contexts), and `resolutionOrder`. Files use `.resolver.json` [V].

**Tiers** are primitive, then semantic, then component. Examples: Primer's `base-color-green-5`, then `bgColor-inset`, then `button-primary-bgColor-hover` ([naming](https://primer.style/product/primitives/token-names/)) [V]. Material 3: `md.ref` / `md.sys` / `md.comp` [S].

| Tool | Status | License |
|---|---|---|
| [Style Dictionary](https://github.com/style-dictionary/style-dictionary) v5.7 | DTCG first class since v4. Its docs call 2025.10 support "a work in progress"; v5.7 adds `duration` and `$root` naming [V]. Resolver support not confirmed | Apache-2.0 |
| [Terrazzo](https://terrazzo.app/docs/) (Cobalt) | CSS, Tailwind, Sass, and JS plugins. Lint rules include `a11y/min-contrast` and `core/required-modes` [V]. The docs disagree on whether resolver support has shipped | MIT |
| Tokens Studio ([sd-transforms](https://github.com/tokens-studio/sd-transforms)) | Figma plugin + SD transforms | sd-transforms MIT; plugin [U] |
| [Theo](https://github.com/salesforce-ux/theo) | Archived Jun 2025 | BSD-3 |

## 3. Reference systems (what an agent can follow)

| System | What an agent can copy |
|---|---|
| [shadcn/ui](https://ui.shadcn.com/docs/theming) [V] | Semantic pairs (`--primary` / `--primary-foreground`), OKLCH values, `.dark` overrides, `@theme inline` mapping to `--color-*`, radius steps derived from one `--radius`. The best small vocabulary for an LLM |
| [Tailwind v4 `@theme`](https://tailwindcss.com/docs/theme) [V] | Namespaces (`--color-*`, `--text-*`, `--spacing`, `--radius-*`, `--shadow-*`) create utilities and also emit `:root` variables. `--color-*: initial` removes the defaults, so the agent cannot fall back to `bg-blue-500` |
| [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) [V] | A 12-step scale where each step has one job: 1–2 backgrounds, 3–5 component states, 6–8 borders, 9–10 solid fills, 11–12 text. Steps 11 and 12 reach APCA Lc 60 and Lc 90 on step 2. Radix Themes adds alpha scales (`--accent-a1…a12`) [U] |
| [Open Props](https://open-props.style/) [V] | `--size-3`, `--gray-7`; MIT; ships DTCG 2025.10 JSON |
| [Carbon](https://carbondesignsystem.com/elements/color/tokens/) [V] | Layer model: `$background`, then `$layer-01…03` |
| Atlassian [V] | `token('color.text.danger')` and `space.100`. The ESLint rule `ensure-design-token-usage` blocks raw values ([rule](https://atlassian.design/components/eslint-plugin-design-system/ensure-design-token-usage/usage)) |

Lesson: role names with a fixed step meaning let an agent pick a token without seeing pixels.

## 4. Color and type generation

- **OKLCH ramps:** fixed hue, L on a curve, C tapered at the ends, gamut-clamped, steps mapped to Radix roles.
- **Contrast.** Use **WCAG 2.x as the baseline: 4.5:1 for text and 3:1 for large text and UI.** APCA is an advisory extra. [apca-w3](https://github.com/Myndex/apca-w3) has a custom license (GitHub reports NOASSERTION), so do not bundle it [V].
- Tools: [Leonardo](https://github.com/adobe/leonardo) makes colors from a target contrast ratio (Apache-2.0). [Culori](https://github.com/Evercoder/culori) handles OKLCH, gamut mapping, and ΔE (MIT). [Huetone](https://github.com/ardov/huetone): APCA palette editor (MIT, stale 2023) [V].
- **Type and space.** [Utopia](https://utopia.fyi/) interpolates two modular scales with `clamp()`. Output: `--step-n`, `--space-s` [U]. Spacing: a 4px base, or Tailwind's single `--spacing` multiplier.

## 5. Extraction

| Tool | Input, then output | License |
|---|---|---|
| [Dembrandt](https://github.com/dembrandt/dembrandt) [V] | URL in, via Playwright and computed styles. Output: `--dtcg`, `--design-md`, `--tailwind`, `--shadcn`. Also `--wcag`, `--tokens` (check against a token file), `--compare` (drift gate), and an MCP server | MIT |
| [Firecrawl `branding`](https://docs.firecrawl.dev/features/scrape) [V] | URL in, a BrandingProfile out (colors, fonts, typography, spacing, components, logo, personality) | **AGPL-3.0**: use the hosted API, do not embed |
| [Project Wallace](https://github.com/projectwallace/css-analyzer) / [CSS Stats](https://github.com/cssstats/cssstats) | CSS in, unique-value counts out (seed tokens). CSS Stats stale since 2023 | MIT |
| open-design `design-extract` skill [S] | Code, screenshots, or Figma in, `tokens.json` with sources out | Apache-2.0 |
| Figma native variables export | DTCG. Announced at Schema 2025. Users report missing `$description` and re-import failures [S] | n/a |

**Screenshots:** no reliable open tool found. Use the agent's vision to draft tokens, then snap them to a generated OKLCH ramp.

## 6. Enforcement

- **CSS:** [stylelint-declaration-strict-value](https://github.com/AndyOGo/stylelint-declaration-strict-value) (MIT) requires `var()` for properties such as `/color$/`, `fill`, and spacing. Autofix needs your own `autoFixFunc` [V]. It does **not** see JSX `style={{}}` objects. For HTML `style=""` attributes you need the `postcss-html` syntax [U].
- **Tailwind:** [eslint-plugin-better-tailwindcss](https://github.com/schoero/eslint-plugin-better-tailwindcss) (MIT) has `no-unknown-classes` and `no-restricted-classes` [V]. Restrict arbitrary values (`bg-[#123]`) with a regex in `no-restricted-classes` [U].
- **Tokens:** Terrazzo lint; `@google/design.md lint` and `diff`.
- **Visual:** run Dembrandt `--tokens` or `--compare` on the rendered page to find computed values that are not tokens.

## 7. Legal

- A site's "look and feel" can be trade dress if distinctive and not functional (*Ingrid & Isabel v. Baby Be Mine*, N.D. Cal.) [S: [AIPLA](https://www.aipla.org/innovate/does-this-web-dress-make-my-site-look-distinctive)]. Brand names and logos are trademarks. Copying a brand's whole look plus its name is the risk.
- What the projects say: awesome-design-md says only "We do not claim ownership of any site's visual identity" [V]. open-design's pack README calls brand packs "aesthetic inspirations, not official assets" [V]. getdesign.md has no disclaimer.
- **License traps:** `bergside/awesome-design-skills` has no license, so do not bundle it. Proprietary brand fonts cannot be redistributed. Firecrawl is AGPL. Check each open-design `manifest.source`.
- **Safe defaults:** use generic pack names ("Fintech Indigo", not "Stripe"), no logos, and no proprietary fonts (ship open fonts or system stacks). Label imports "inspired by". This is not legal advice.

## Recommended approach for our studio

**Source of truth: DTCG 2025.10 with a Resolver.** DESIGN.md front matter has no modes, so it cannot be the source. Everything else is generated.

```
design-system/
  tokens/primitives.tokens.json   # OKLCH ramps (12 steps), sizes, fonts
  tokens/semantic.tokens.json     # bg, fg, primary, primary-fg, border, ring … → {aliases}
  tokens/light.tokens.json, dark.tokens.json
  tokens.resolver.json            # theme modifier: light|dark
  tokens.css                      # GENERATED: :root{…} + .dark, [data-theme=dark]{…}
  tailwind-theme.css              # GENERATED (React/Vite): @theme inline { --color-primary: var(--primary) }
  manifest.json                   # open-design-compatible fields + provenance
DESIGN.md                         # Google order + front matter (GENERATED block) + VoltAgent "Responsive", "Agent Prompt Guide"; prose is hand-written
```

**Compile.** Write our own small compiler: walk the resolved tree, emit `--{path-kebab}`, and use culori to output `oklch()` with a hex fallback. Write it to disk on every token edit. Reason: resolver support in Style Dictionary and Terrazzo is uncertain, and HTML projects have no build step. Google's CLI only converts DESIGN.md to DTCG, not the other way. So we also generate the DESIGN.md front-matter block ourselves, between marker comments, and keep the prose untouched. Optional CI: Terrazzo lint (`a11y/min-contrast`, `core/required-modes`) and `@google/design.md lint`.

**Load.** `var()` works only when `tokens.css` is loaded. The studio must insert `<link rel="stylesheet" href="design-system/tokens.css">` (HTML) or `import "./design-system/tokens.css"` (Vite entry), and check that it is there before each preview.

**Agent.** Inject a short summary: the DESIGN.md prose, plus a table of semantic tokens with their values in the current mode. Rule: semantic tokens only; add a token rather than hard-code a value. Use shadcn-style names so they are easy to guess.

**Inspector (snap and write).**
- Colors: find the nearest semantic token by OKLCH ΔE. Within a threshold, write `var(--primary)`. Outside it, offer "create token".
- Dimensions: snap to the nearest spacing, radius, or type step.
- Write `style="color: var(--fg-muted)"` in HTML. In Tailwind projects, write the utility class (`text-fg-muted`) instead.
- Show a "raw" badge on values that are not tokens.

**Validate.** The strongest gate is our own write path: refuse or snap raw values before they reach disk, because linters miss JSX style objects. Then run the section 6 checks, plus contrast on every fg/bg pair in both modes. Emit `.dark` as well as `[data-theme=dark]` so Tailwind `dark:` utilities work.

# Add a design system: plan (2026-10-23)

Source: a read of nexu-io/open-design at commit e03d5c23, and a map of what Design Studio does today.

## How Open Design does it

1. One create page takes sources: website URLs, a brief, pasted DESIGN.md with a live preview, files (screenshots, logos, fonts), and local code or a GitHub repo.
2. A deterministic pass makes a usable draft in seconds. It harvests colors and fonts from HTML/CSS, or maps CSS variables from code to a fixed token contract with a confidence score.
3. An agent then improves the same system in place. It measures the site, writes the files, and refreshes a live kit page while the user watches.
4. The user reviews the kit page, edits DESIGN.md, colors, fonts and logo directly, and asks the agent for changes.
5. The system is saved in a user library (`<dataDir>/design-systems/<slug>`). A project stores only its id, and each run reads the files again. Switching changes the id.

## What Design Studio has

- 8 built-in packs (`src/server/design-system/packs/<id>/`: `pack.json`, `tokens.json` (DTCG, OKLCH), `DESIGN.md`).
- Pack picker at create time, Tokens panel, token snap and create in the inspector, DESIGN.md editor.
- No user library, no import, no create flow, no pack change after create.

## What we build

Phase A: library and deterministic import
- User pack library at `<dataDir>/packs/<slug>/`, same three files, ids `user-<slug>`. The registry merges built-in and user packs, validates at runtime, and reloads on change.
- A "Design systems" screen: built-in and user packs as preview cards, with Duplicate, Rename, Delete and Export (zip).
- A "New design system" page with sources: website URL, pasted DESIGN.md (live preview), brief, image files, a local folder, and a DTCG or Tokens Studio JSON file.
- Deterministic draft from each source: URL HTML/CSS harvest, CSS variables from a local folder, direct DTCG import. Map to our required tokens, fill gaps from a base pack, and show a coverage score.
- Apply or switch a pack on an existing project, as one version. Save a project's design system to the library.

Phase B: agent enrichment and review
- An "Improve with AI" run on a backing project that holds the draft pack and a kit page (colors, type, spacing, components) rendered from the tokens.
- The agent reads the sources (fetches the site, looks at screenshots), edits `tokens.json` and `DESIGN.md`, and checks the kit page with its screenshot tool. The user watches the kit page update.
- A check the run must pass: required tokens present, contrast pairs meet AA, DESIGN.md sections present.
- "Save to library" writes the result back to the user pack.

Better than Open Design: runtime manifest checks, re-import updates the same pack, a tokens-file importer, and version history for every pack change in a project.

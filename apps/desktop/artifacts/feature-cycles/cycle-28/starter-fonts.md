# Cycle 28 pick 2: starter-fonts

Branch `feat/starter-fonts`. Commits: `1655531c7` (engine, starter, radius), `653573021` (font link injection), plus this report.

## What changed

- `theme/engine/fonts.ts`: 14 Google Fonts pairs (serif 6, sans 4, rounded 2, mono 2), all OFL, each with a system fallback stack. Pairs are ordered once per call (brief mood first, then the rest), so the 3 Look options always get 3 different pairs. The theme name holds the display family ("Amber Fraunces").
- `theme/engine/brief.ts`: radius from the brief: 4px (editorial, finance, law, legal, bank, news, ...), 16px (playful, kids, toy, ...), 12px (cafe, coffee, bakery, friendly, ...). New mood words: bakery, pastry (serif); law, legal, attorney, magazine (serif).
- `theme/engine/build.ts`, `types.ts`: radius change, `fontLink` per draft (`string | null`), inputs `linkedFonts`, `radiusPath`, `radiusDefault`.
- `theme-starter.ts`: radius from the brief (else 8px); `pack.json` gets one `googleFontsUrl` that loads the families of all 3 Look options. So a Look apply is 1 version with token changes only, and Cmd+Z restores it.
- `theme-run.ts`: `create_theme` picks web pairs only from families that the pack link already loads; else system or project fonts as before. Radius from the brief on the found radius token.
- `design-system/html-link.ts`: inject the pack link unless that exact URL is in the page. A real agent linked a trimmed URL (Fraunces and Inter only), so the old "any fonts.googleapis.com" check blocked the other options.
- `agent/mock.ts`: the mock button reads `--radius-md`.
- `actions/src/theme/schema.ts`: `fontLink` description text only (was "Always null").

## Checked (mock agent, port 4730)

- "bakery landing page": Amber Fraunces, h1 computed Fraunces, body Inter, both loaded, `--radius-md` 12px, 1 font link.
- "law firm homepage": Libre Baskerville + Work Sans, 4px.
- Look row: 3 options with 3 pairs (Fraunces, Libre Baskerville, DM Serif Display). Pick option 2 in dark preview: 1 "Apply theme" version, heading changes, frame stays dark; Cmd+Z restores Fraunces.
- Fonts blocked (playwright route abort): fallback stack, no fonts loaded, no horizontal overflow.
- `call-action theme.create` on a starter project: pass, 3 surfaces, 0 diffs (3 serif pairs, 4px). `theme.apply`: HTTP ok; the MCP and agent repeats fail with "values already set" (expected for a repeated write).
- Dark bug: not reproduced. `modern-minimal`: UI dark preview, Live then Apply, frame stays dark; with `prefers-color-scheme: dark` body bg is 0.17 before and after apply. No change made. During the reload after apply the frame is white for about 3 to 5 s (frame reload, canvas code, not theme).
- Mock run time: 5.0 s.
- typecheck, lint:gate (59616, baseline 89733), build:ui: pass.

## Real model (2 runs, "bakery landing page", Sonnet 5.5)

| | main | branch |
|---|---|---|
| Display / body font (computed) | Helvetica Neue / ui-rounded | Fraunces / Inter |
| Fonts loaded | none | Fraunces, Inter |
| Radius | 10px | 12px |
| Font families outside tokens.css | 0 | 0 |
| Hard-coded colors in index.html | 4 `rgb(` | 3 `rgb(` |
| First draft (first Write) | 27.6 s | 22.1 s |
| Total | 75.8 s, $0.236 | 71.4 s, $0.231 |

The branch agent read `googleFontsUrl` and linked it itself (trimmed to the 2 families it used). After applying "Amber Libre Baskerville" on that page, Libre Baskerville and Work Sans load (fix in `html-link.ts`). `review_frame` type findings were not extracted from the run log.

## Screenshots (`cycle-28/starter-fonts/`)

`ui-look-menu-dark.jpg`, `ui-look-menu-light.jpg`, `ui-look-row-dark.jpg`, `ui-look-pick-dark-frame.jpg`, `mock-{bakery,law}-page-{light,dark}.png`, `real-{main,branch}-bakery-page-{light,dark}.png`.

## Left out

- Apply does not rewrite `pack.json` for a pair outside the starter link (only `create_theme` on a pack project could make one; it now picks only linked pairs, so this does not happen today). `pack.json` `fonts.display` and `fonts.body` keep the first option's names after a Look apply.
- The Studio UI theme cards do not load Google Fonts, so the "Aa" samples show the fallback; the option names show the pair.
- A page that hard-codes a trimmed link keeps it; the full pack link is added beside it (one extra stylesheet request).
- `.claude/goal/roadmap.md` is not in the worktree; no Appendix A change (no new file).

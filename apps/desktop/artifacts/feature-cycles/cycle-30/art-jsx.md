# Cycle 30 pick 2: art-jsx

Branch `feat/art-jsx`, cut from main `f224e3a68`.

## First check: the route copy form

A route copy is not JSX. `create_prototype_project` with `routePath` makes an `html` project, imports the route as `index.html` (`page-import`), and links `tokens.css` from the app tokens. The frame loads it from the studio HTML preview, so `assets/...` resolves next to the page. No file goes into the app. On main, cycle-29 art already paints route copies in light mode. The main real run got 7 art slots and a flat-box share of 0%.

The real defects were:
- A dark preview shows light art (main run, `real-main-dark.png`).
- A JSX or TSX prototype (a `react` project, `src/App.tsx` served by Vite) gets no art. The run step reads only top-level HTML files, and the rule says "the studio paints it" because the entry is `index.html`.

The spec check "seeded slots in `page.jsx` of a route copy" cannot run as written. I proved JSX on a `react` prototype. I proved the route copy path on HTML route copies of `ds-wt/rf-next-art` `/patients`.

## What changed

- **Stylesheet, not inline.** Art goes in a rule keyed on `data-photo-art="<slot key>"`. The key is a hash of the slot words, orientation and tag. A repaint therefore changes only the rules and the SVG files. On HTML, the rules go in one `<style data-photo-art-sheet>` block in the page head. On JSX and TSX, they go in `photo-art.css` beside the page, and the page imports it once. The rules use `!important`, so an inline gray `background:` on the slot loses. Old inline art still reads as an art slot. A repaint moves it to the stylesheet.
- **Dark variant.** `photo-art-dark.ts` reads `.dark`, `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` token blocks. The light read no longer takes `:root[data-theme="dark"]`. When the dark colors differ from the light colors, the studio writes a second SVG and dark rules. The rules use the forms that the tokens use. A div swaps `background-image`. An img swaps `content: url(...)`.
- **JSX and TSX slots.** `photo-art-jsx.ts` finds `data-photo` elements with the Babel parser. It skips elements inside `.map()`, `.flatMap()` and `Array.from()`, and writes the attributes with `setJsxAttrs`. A div gets `data-photo-art`, `role="img"` and an `aria-label` from its text, and the text goes. An img gets `src="/assets/photo-art-<hash>.svg"` and `alt`. This runs only in prototypes (`!project.app`), never in app source. The run step and the photo note read `src/` too.
- **Repaint.** `theme.apply` (the Look pick and `apply_theme`) repaints the art in the same version and the same undo step. The handler passes `toRepaintDeps`, which wraps `commitFile` and `history.record`. The art files join the token commit and its edit record. No file in `design-system/` changed.
- **Prompt.** The art rule and the art note apply to every prototype (HTML, JSX, TSX). The gray-box rule and note stay for the source of an attached app, which the studio never paints. `PHOTO_STEP` says that art paints missed slots on prototype pages.
- **`image-search.apply`.** The description changed one sentence. `gen-routes` wrote no change, and `--check` passes.
- **Bundled:** A `slots` call that misses again with no new art writes no version.

## Files outside the pick list

- New `share/image-search/photo-art-plan.ts` (the plan, moved from `photo-art.ts`, which would pass 500 lines), `photo-art-sheet.ts` (rule text and the HTML style block) and `photo-art-repaint.ts` (the theme hook).
- `share/image-search/photo-slots.ts`: exports `toOrientation`.
- `handlers/theme/apply.ts` (+2 lines): passes `toEditDeps: toRepaintDeps`. `style-scope` sits below `share` in `lint/boundaries.ts`, so `theme-run.ts` cannot import the art code. `ApplyThemeCommand` has a new `toEditDeps` field.
- `share/index.ts`: one export. `agent/run-level.ts`: one sentence of `PHOTO_STEP`.
- `photo-fill.ts`: 495 lines before, 473 after. The search-off fill moved to `photo-art.ts`.
- `.claude/goal/roadmap.md` is not in this worktree, so Appendix A did not change.

## Checks

Studio on port 5760, data in `ds-wt/art-jsx-data`. Fake app `ds-wt/rf-next-art` with a `.dark` token block. I started its Next dev server myself (`set_dev_server` url). `git status` in `rf-next-art` is empty after all runs.

| Check | Result |
|---|---|
| Mock run on a `react` prototype with 1 div slot, 1 img slot and 1 slot in `.map()` | Passes: div and img painted, the mapped slot skipped, `photo-art.css` imported once (`jsx-art-light.png`) |
| Dark preview, same page | Passes: dark art from the `.dark` tokens (`jsx-art-dark.png`) |
| One Cmd+Z in the app | Passes: plain slots and labels return; `photo-art.css` and the 4 SVGs go (`jsx-art-undo-light.png`) |
| HTML route copy, seeded div with inline gray box and img | Passes: light and dark art, the gray box is covered (`html-copy-art-light.png`, `html-copy-art-dark.png`) |
| `apply_theme` on the route copy | Passes: one "Apply theme" version holds `tokens.css`, `index.html` and 4 new SVGs. The art is red (`theme-repaint-light.png`). One Cmd+Z restores the tokens, the sheet and the img `src` together |
| `call-action.ts image-search.apply` on `src/App.tsx` | HTTP paints 1 slot. MCP and agent then find no plain slot (`call-action-jsx.txt`). A repeat call passes with 0 diffs (`call-action-jsx-repeat.txt`) |
| MCP `apply_image_search` on a fresh JSX slot | Passes: 1 slot painted (`mcp-apply-jsx.txt`) |
| Search on (project setting), route copy | Passes: Openverse photos replace both art slots, and `data-photo-art` goes |
| `pnpm run typecheck` | Passes |
| `pnpm run lint:gate` | Passes (59601 diagnostics, baseline 89733) |
| `pnpm run build:ui` | Passes |
| `gen-routes --check` | Passes |

## Real model (2 runs)

Route copy of `rf-next-art` `/patients`, prompt "Redesign this page as a clinic team page with a photo for each doctor and a hero image", search off. Scan: `ds-wt/aj-scan.mjs`, which is `pa-scan.mjs` with the studio dark toggle (`.dark` and `data-theme="dark"` on `<html>`) on the first 1280 x 900 screen.

| Run | Code | Flat-box light | Flat-box dark | Dark art colors | Time | First Write | Cost | Review |
|---|---|---|---|---|---|---|---|---|
| 1 | main | 0% | 0% | light tokens (cream panels on a dark page) | 74.8 s | 29.9 s | $0.222 | render_check x3, design_review x1 |
| 2 | branch | 0% | 0% | dark tokens | 75.0 s | 27.7 s | $0.258 | render_check x4, design_review x1 |

- The flat-box share was already 0% on main for route copies. The difference shows in dark mode, which the scan does not measure. Compare `real-main-dark.png` and `real-branch-dark.png`.
- Main: 7 slots, 7 SVGs. Branch: 6 slots, 12 SVGs (light and dark), one "Photo art" undo step after the run version. The first draft time did not change, because the art step runs after the run version.

## Left out

- **Old SVG removal when a photo replaces art.** The edit history cannot record a file delete. `resolveFiles` needs the file to exist on undo, so a delete makes the record stale. This needs a change in `direct-edit/commit/history.ts`.
- **Dead rules after a photo.** When a photo replaces art, the slot loses `data-photo-art`, so its rules match nothing. They stay in the sheet.
- **JSX div slots with search on.** A JSX `style` is an object, so the photo fill still fills only img slots on JSX pages. A missed JSX img gets art. A JSX div slot with search on stays plain.
- **Repaint in a `react` prototype** runs only when the prototype has a token file. `theme.apply` refuses a project without one.
- **Mock route copy run.** The mock agent writes no `data-photo` slot on a route copy, so I seeded the slots by hand and painted them with `apply_image_search`.

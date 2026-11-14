# Cycle 27 pick 1: port-assets

Branch `feat/port-assets`. Main at `f8dbc0c6d`.

## Built

- Added `server/agent/port-assets.ts` (copy, name clash, tag, note, rollback) and `server/agent/port-asset-scan.ts` (reference scan). The scan is a sibling file so that each file stays under 500 lines. `port-plan.ts` did not change, so `get_port_plan` has no output diff.
- Scans: `img src` and `srcset`, `source src` and `srcset`, `video poster`, CSS `url()` in `<style>` and in `style` attributes, `<link rel="stylesheet" href>`, and the `url()` files inside each linked CSS file.
- Skips: remote and `data:` references (not listed), a path that leaves the work tree, a missing file, a file over 10 MB (all three listed as skipped).
- Copies to `<app>/<appDir>/public/<slug>/<file name>`. The slug is `portPageSlug` (which uses `toCutSlug`) of the last route part. A flow uses the base route, and copies a shared file once.
- Rewrites the `url()` lines inside a copied CSS file to the new URLs (the copied `tokens.css` points at `/<slug>/brand.woff2`).
- Name clash: a file in `public/<slug>/` with other content gets `-2`. A file with the same content is reused and not counted. No app file is overwritten (`writeFile` with flag `wx`).
- `port-start.ts` (491 lines): `startPageRun` and `startFlowRun` copy before `startRun`, and add `<prototype-assets>` after `<port-plan>` (page) or `<port-flow>` (flow). If `startRun` throws, the copied files are deleted.
- The tag holds the read path line, one `old -> new` line per reference, the skipped lines, the URL rule and (only when a CSS file was copied) the token rule.
- Run note "Copied N prototype assets to public/<slug>/." (and a skipped count) through `toNotedOutcome` in `run-notes.ts`, and through `applyMockPort` for the mock.
- Mock port: the route maps every reference to its new URL and links the copied CSS.
- "Not saved yet": `toFirstPrototypeVersionText` in `app/first-version.ts` (the spec name `firstPrototypeVersionText` fails `studio/new-function-verb`), exported from `app/index.ts`.
  - `preview/frame-source.ts`: a prototype with no version now reads its work tree live, as an app does. So `inspect_port`, `get_screenshot` and frame reads give a result, not an error. The version label says "the prototype work tree (no saved version yet)".
  - `preview/file-read.ts` (`read_file`, `list_files`): keeps the throw, with the new text.

## Undo

- The copy runs before `startRun`, so before the run's start point. The run version stages the copied files (`git add -A` on commit).
- Completed run: the version lists the route file and the 6 copied files. One `restore_version` to the version before it removed the route and all 6 files.
- Stopped run (`[slow]` mock, canceled after 2 s): the cut-write guard restored the partial route. The canceled run still saved a version with the 5 copied files. One `restore_version` removed them. So no move into the run was needed.

## Checked

- `call-action.ts port.inspect` on a prototype with no version (`n2EKwEtsNu`, made with no pack, `headVersionId: null`): pass, 3 surfaces, 0 diffs; MCP gave score 12. Before: "The first version of this app is not saved yet. Try again in a few seconds."
- MCP `read_file` on the same prototype: the new text. MCP `get_screenshot` on it: an image and "1440 × 900 px of the prototype work tree (no saved version yet)."
- Mock `start_port` `/coffee-cart`: 5 files in `public/coffee-cart/`, a tag with 5 lines, note "Copied 5 prototype assets to public/coffee-cart/.", all 6 requests return 200 (playwright network log).
- Mock flow port (2 pages that share `assets/logo.svg`) to `/shop`: 6 files, `logo.svg` once.
- `../outside.png`: listed as skipped, not copied, note "Skipped 1 prototype asset".
- Name clash in `public/clash/`: `hero-2.png` written, the other `hero.png` kept, the identical `cup.png` reused.
- UI: Share, Move to app, route `/latte`, Start run. Files copied, the chat shows the note, and `/latte` loads all assets with 0 404s.
- Real model, 1 run (`start_port` coffee-cart to `/espresso`, Sonnet 5.5): 32.1 s wall time (273.6 s in report-3 run 2), 0 404s, no `find` (3 Bash calls, all `ls` or `cat` in the app or the named prototype folder), and the agent's own `inspect_port` returned scores (3, then 97 after its fix). It used the 3 image URLs and left out the font and `--ink` because the app has no token for them.
- `pnpm run typecheck`: 0 errors. `pnpm run lint:gate`: pass. `pnpm run build:ui`: pass.

## Screenshots

`cycle-27/port-assets/`: `run-note-{light,dark}.png` (the app chat with the note), `route-vs-prototype-{light,dark}.png` (the prototype next to the ported `/latte` route).

## Left out

- The prototype for the real run used local PNG files, not `apply_image_search` photos. The scan covers both photo forms by code: for an HTML page, `planAsset` (`direct-edit/commit/image.ts` lines 178 and 215) writes the photo to `assets/<name>` and sets a page-relative `src`, and a background slot gets `background-image: url(<src>)` in the `style` attribute (`share/image-search/photo-fill.ts` line 85). No live `apply_image_search` call was made (it needs Openverse).
- `get_port_plan` was not called on a Bonaparte clone. Instead `detectApp` ran read-only on Bonaparte: 6 Next candidates, so the attach asks to pick one, and `apps/dashboard` gives router `apps/dashboard/app` and public folder `apps/dashboard/public/<slug>/`. Bonaparte `git status --short` was the same before and after.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added (L6e).
- A canceled mock run does not show the copy note, because the mock note runs only after the mock port finishes.

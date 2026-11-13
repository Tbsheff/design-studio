# Cycle 19 pick 3: safe-matches

Branch `feat/safe-matches`. Shared layers no longer overwrite a page that changed after `page.inspectMatches`.

## Done

- Changed `page.inspectMatches`: each item has `markupHash`, the sha-256 of the normalized element (the same normalize step as the match rule).
- Changed `page.updateMatches`: each target takes `markupHash` (null by default, so an old caller gets no check). The handler checks the hash in the locked write step (`withDirection`, after `savesSettled`). A changed or missing element goes to `skipped: [{ file, reason: "changed" | "missing" }]`, and the other pages are written as one version. When every target is skipped, it fails with `Conflict`.
- Added a sentence about markupHash to both descriptions.
- Changed UI (inspector shared layers chip): "Apply to N pages" sends the hashes. After a skip, the chip reads "Applied to 3 pages. 1 changed since: pricing.html". On Conflict it says "Every page changed since the check. Look at the pages, then try again." and inspects again.

## Checked

- Ran call-action `page.inspectMatches` on http, mcp and agent: pass, the same hash for each page.
- Ran call-action `page.updateMatches` with hashes after a hand edit of pricing.html: http wrote about and contact and skipped pricing (`call-update-skip.txt`). Then mcp and agent got `Conflict`, because every target had changed since.
- Ran the all-changed case: `Conflict` on all 3 surfaces (`call-update-conflict.txt`). The diff shows only the error format of each surface.
- Ran the no-hash case: the page was written as before, with `skipped: []` (`call-update-no-hash.txt`).
- Tested in the UI with a 4-page HTML fixture: selected the nav, changed its direction, edited pricing.html by hand, then clicked Apply. 3 pages changed, pricing kept its edit, and the chip named it. Cmd+Z took back about and contact. Screenshots: `chip-skip-dark.jpg`, `chip-skip-dark-zoom.png`, `chip-skip-light.jpg`.
- Passed: `pnpm run typecheck`, `pnpm run lint:gate`, `pnpm run build:ui`.

## Left out and notes

- Changed the hash from sha-1 to sha-256: `sonarjs(hashing)` fails the commit hook on sha1.
- Did not change `artifacts/mcp-snapshots/*.json`. `inspect_matches_page` and `update_matches_page` change: approve the diff at merge.
- Did not edit `.claude/goal/roadmap.md` Appendix A. No active slice is set.

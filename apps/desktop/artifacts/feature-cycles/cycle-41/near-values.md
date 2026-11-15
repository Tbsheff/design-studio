# Cycle 41 pick 5: near-values

Branch `feat/near-values`. Review has a new kind, `near-value` ("Near-duplicate values"). When a project has no tokens, it finds a color or radius literal that is almost equal to a more common literal, and points at the common one.

## What changed

- **Added** `near-value` to `REVIEW_KINDS` (after `off-token`) and `REVIEW_KIND_LABEL` ("Near-duplicate values") in `contracts/src/review.ts`.
- **Added** the pure engine `review/engine/near-values.ts` (`toNearValueHits`), exported from `engine/index.ts`.
  - Families: `color`, `background-color` (inline `background` counts as `background-color`), `border-color`, `border-radius`.
  - Color: literals group by hex (`hexOf`). Two groups are near when the OKLab distance is 0.02 or less (`nearColor` from `shared/color-near.ts`). The group with fewer uses gets the hit and points at the near group with the most uses. Equal uses: no hit.
  - Radius: groups by tag and px (rem x 16). A value used 1 or 2 times that is 1 to 2 px from a value used 3 or more times on the same tag gets the hit. Two common values at the same distance: no hit.
  - Max 10 hits per frame. Severity low.
- **Added** `review/near-value-drafts.ts` (`toNearValueDrafts`): runs only when the project has no tokens, skips `via: "class"` hits (off-token covers them) and hits outside the project. A CSS rule hit counts as the number of elements that match its selector (1 `querySelectorAll` call in the page for all rules). An inline hit gets a style fix with the off-token guard shape (`literal`, `noArbitrary: false`). A rule hit gets `fix: null` and a hint that names the rule, plus a warning when other selectors share the rule.
- **Changed** `review/run.ts`: 1 spread line in the draft list (462 lines). `run.ts` had 20 imports (`import/max-dependencies` 20), so the 2 post-draft steps (`verifyFixes`, `markShared`) moved into 1 new `runFixChecks` in `review/fixes.ts`.
- **Not changed**: `checks.ts`, the `review_frame` description, the UI files. The Review panel builds the group from `REVIEW_KINDS` and `REVIEW_KIND_LABEL`, so `review-model.ts` and `copy.ts` need no change.

Files outside the pick list (no other pick owns them): `review/fixes.ts` (`runFixChecks`).

## Checked in the running app

Server on port 7470, `STUDIO_AGENT=mock`, data at `ds-wt/near-values-data`. Fixture `ds-wt/nv-seed`: 6 buttons `#2563eb` and 1 `#2463ea` (inline), 9 cards radius 8 px and 1 radius 10 px (inline), `.meta` gray `#64748b` on 4 elements, `.note, .caption` gray `#64748c` on 1 element, and a clean section.

| Check | Result |
|---|---|
| Review panel, "Near-duplicate values" group | Passes: 3 hits, 2 with Fix. "This color #2463ea is almost #2563eb, which 6 elements use. Use #2563eb." (Use #2563eb), "This radius 10 px is almost 8 px, which 9 elements use." (Use 8px), "This color #64748c is almost #64748b, which 4 elements use. Use #64748b." (Ask Claude) |
| Shared rule `.note, .caption` | Passes: `fix: null`, the hint names the rule and the shared selectors |
| Clean section | Passes: 0 hits |
| Fix on the button (UI click) | Passes: 1 version ("Edit button: background-color"), the button hit is gone on the re-run, 2 near-value hits left |
| `ds-wt/nv-tok` (`design-system/tokens.json` with `--primary: #2563eb`, and `:root`) | Passes: 0 near-value hits, the no-tokens note is gone, off-token flags the buttons |
| `call-action.ts direct-edit.runReview` | HTTP and MCP (`review_frame`) give the same near-value findings. The only diff is `ranAt`. The agent surface is skipped (`agent: { off: "legacy-agent" }`); `review/agent-tool.ts` passes `kind` through with no change |
| False hits on a copy of `pt-seed` (`ds-wt/nv-pt`, 4 pages) | 0 near-value hits (0 findings of any kind; the seed is small). The radius window stays at 2 px |
| Cost | Engine 2.4 ms at the probe cap (180 hits), plus 1 `page.evaluate` for the rule counts. Under 5 ms for the engine |

Screenshots: `cycle-41/near-values/review-near-review-{dark,light}.png`.

## Gates

`pnpm run typecheck` 0 errors. `pnpm run lint:gate` passes (59,587, baseline 89,733). `pnpm run build:ui` passes. `check-bundle` passes, B1 274,703 B, delta 0. `gen-routes.ts --check` passes. `check-actions.ts --probes`: 557 hits, the same as main; no hit in a changed file.

N12 union grep: `REVIEW_KIND_LABEL` (got the entry), `review-model.ts` line 39 and `run.ts` (both iterate `REVIEW_KINDS`), `checks.ts` (`ReviewKind` type only), `review-group.tsx` (reads the label). No `switch` over the kind and no hand-copied kind list in actions or the API.

## Snapshots

No action file changed, so no snapshot diff from this pick. Not run: `mcp-snapshot.ts`.

## Left out

- A fix for a CSS rule hit. The direct-edit path writes only to the element (inline style or classes); it has no CSS rule target. Rule hits get Ask Claude with a hint that names the rule and the value to use.
- A fix for an inline `background:` shorthand hit. The hit shows with Ask Claude; only `background-color`, `color`, `border-color` and `border-radius` inline hits get a fix.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A entry.

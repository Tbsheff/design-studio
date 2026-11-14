# Cycle 38, pick 3: frame-fit (Resize to fit)

## What shipped

- Action `canvas.setFrameHeights` (stamped with `new:action`, generated lists by `gen-routes`). Tool `set_frame_heights_canvas` on MCP and the agent (`core` set). `PUT /api/projects/:projectId/canvas/frames/heights`. Input: `projectId`, `directionId`, `frames` (1 to 20 ids or `@labels`). Output: each frame's `oldHeight`, `newHeight`, `warning`, plus `warnings` and `note`.
- Write service `FrameFitWriter` in `src/server/canvas/frame-fit/` (provided in `handlers/canvas/live.ts`). Pure engine `engine/to-fit-height.ts`. The measure renders through the preview `withPage` at the frame width and the device base height (desktop 900, tablet 1024, mobile 844, else 900), reads `document.documentElement.scrollHeight` after load and fonts, then renders once more at `H` to find `100vh` growth. Max 2 renders. One `canvas.update` = one layout history step. App route frames use the dev server URL (and the frame state host), as screenshots do.
- UI: "Resize to fit" in the frame menu (Arrange group) and in the multi-frame menu. A notice shows "Measuring the pages…", then the result and any warning.

## Checks (dev server, mock agent, `ds-wt/frame-fit-data`)

| Case | Result |
|---|---|
| `long.html` (3,200 px content) | 900 to 3,200 |
| `short.html` (400 px) | stays 900 |
| `short.html` in a 3,000 frame | 3,000 to 900 |
| `screen.html` (100vh hero + 600 px) | 900 to 1,500, with the 100vh warning; a second fit stays 1,500 |
| Frame menu > Arrange > Resize to fit | long 3,200 (screenshots `menu-*.png`, `fitted-*.png`) |
| Cmd+Z after a fit | old heights back |
| Marquee 3 frames > Resize to fit, then one Cmd+Z | 3 frames fit in one step; one Cmd+Z restores all 3 |
| `call-action.ts canvas.setFrameHeights` | pass, 3 surfaces, 0 diffs |
| http, mcp, agent with a canvas reset before each | same output on 3 surfaces (`ds-wt/fz-surfaces.mts`) |
| Fake Next 16 app `ds-wt/fz-next`, route `/long` (2,600 px) | route frame 900 to 2,600; share link shows 1440 x 2600 (`next-share-link.png`); Copy as PNG export is 2880 x 5200 at 2x (`next-copy-png.png`) |

`pnpm run typecheck` 0 errors, `pnpm run lint:gate` pass, `pnpm run build:ui` pass, `check-bundle` B1 274,703 B (delta 0), `gen-routes --check` pass. No real-model run.

## Left out and differences from the spec

- Max height is 4,000 px, not 20,000. `CANVAS_MAX_SIDE` in `packages/common/contracts/src/canvas-file.ts` is 4,000, and the canvas parser drops a frame that is taller. A taller page gets the warning "The page is taller than 4000 px. The frame stops at 4000 px." Raising the limit touches the parser, the resize UI and the frame schemas; it is a separate change.
- `check-actions` fails on main for 10 old items (O12, E16); none is from this pick.
- `.claude/goal/roadmap.md` is missing in the worktree, so Appendix A is not updated.

## Files outside the pick list

- `src/ui/features/canvas/canvas-body.tsx` (mounts `FrameFitHost`, 2 lines).
- `src/ui/features/canvas/use-frame-menu-rows.ts` (adds the menu entry).
- New `src/ui/features/canvas/{frame-fit-model.ts,use-frame-fit.ts,frame-fit-host.tsx}`.
- `src/server/canvas/index.ts` (exports `FrameFitWriter`).
- The multi-frame menu file is `src/ui/features/canvas/use-frame-select-menu.ts`.

# Pick 4: phone-play

Share Play on a phone now lays out an HTML page at the phone width, not as a 1440 px page at 27 percent.

## Change

- Added `toFittedSlot` in `ui/features/canvas/play-model.ts`. In full bleed, for a base slot whose frame is a page, it sets the frame size to the stage size: width = stage width, height = stage height - `FULL_BLEED_HEIGHT_CHROME`. `scaleFor` then returns 1.
- A frame is a page when its `path` is empty (the index page) or ends in `.html` or `.htm`. Other paths (for example `photo.png`) keep today's scale.
- Called `toFittedSlot` only in the plain path of `toSlotLayout` in `ui/features/canvas/device-frame-model.ts`. This path serves the slot view and the Play comment layer. Device layout and overlays (`drawer`, `modal`, `popover`) do not change.
- Left desktop share and in-app Play as they are: `isFullBleed` is false there.
- Added no new action or tool. Share links made over MCP (`create_share_link`) open the same viewer.

File outside the pick list: `ui/features/canvas/device-frame-model.ts` (one line; no pick owns it). Did not change `play-frame.tsx` or `share-viewer-model.ts`: the frame already has `path`, and `play-frame.tsx` reads the layout as it is.

## Hotspots

`LinkSource` has no stored rect, only `selector` and `text`, so drawn hotspots do not exist. Play reads link rects from the live page, so the rects follow the new layout.

## Verified (mock agent, data folder `ds-wt/phone-play-data`, port 5960, share port 5965)

- Seeded the 3-page flow (welcome `index.html`, `plan.html`, `done.html`, 1440 x 900 frames, linked with `<a href>`). Seeded a second project with one `photo.png` frame. Script: `ds-wt/ph-seed.mjs`.
- `share.create` through `scripts/call-action.ts` (`ds-wt/ph-call-flow.txt`, `ds-wt/ph-call-image.txt`): HTTP ok, MCP ok, outputs match except ids and times. The agent path returns "needs the user to allow it". This is the `confirm: "user"` gate for a caller that has no approval prompt, and main does the same.
- Phone, 390 x 844, touch (`ds-wt/ph-shots.mjs`):
  - main: iframe 1440 x 900 at `scale(0.270833)`, so the page shows 390 x 244.
  - branch: iframe 390 x 800 at `scale(1)`, and the page `innerWidth` is 390. Tap through welcome, plan picker, confirmation and back to start works, also after you scroll the page to the bottom first.
- Image frame at 390: `scale(0.270833)` on main and on the branch. No change, as the spec asks.
- Desktop, 1440 x 900, Play: `scale(0.866667)` on main and on the branch. No change.
- Screenshots in `cycle-35/phone-play/`: `side-by-side-light.png` and `side-by-side-dark.png` (main row above, branch row below), the separate screens of each, the image frame and desktop Play.
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass. `pnpm run build:ui`: pass.
- `check-bundle`: fails with 100 failures, all B1 Home preload (Home is 1,058,906 B against a 300,000 B limit, from chunks such as `router` and `ui-select-model`). This branch adds no import, so the failure is already on main.

## Left out

- The "View canvas" pill floats over the bottom 60 px of the page. On the welcome page it covers part of the button until you scroll. Moving it is share-viewer UI, outside this pick.
- `bridge/rect-tracker.ts` refreshes rects on resize only, not on scroll. Taps work after a scroll, because the page handles them. I did not check the hint flash or the popover anchor after a scroll. A fix belongs in `bridge/**`, which this pick must not touch.
- Not run: a real-model run. The spec asks for none.

# Cycle 28 pick 5: polish-28

Branch `feat/polish-28`. Mock agent, server on 49610 (preview 49611), data in `ds-wt/polish-28-data`. Fake Next 16.4.1 app: `ds-wt/polish-28-next` (`/` and `/patients`, layout with a Tailwind CDN `<script>` in `<head>`). No real-model run.

## Commits

| Commit | Change |
|---|---|
| `871047bbe` | Next hydration warning, fixed at the cause |
| `6555de72c` | Group rotate keeps a percent or z translate |
| `8be7c1434`, `0fb620db1` | Photo fill skips a slot that missed before |
| `03e6ca580` | Route copy saves `folder-context.md` in its first version |

## Items

- **Hydration warning.** Cause: React hydrates `<head>` children by position. The app's own head `<script src>` was matched against the injected bridge `<script>` first in `<head>`, so React logged "attributes didn't match" (src `/__studio/bridge.js` vs the app's src), once per viewport. A Next app with no head script had 0 errors also before. Fix: the bridge sets `async` on its own script tag when it runs (`src/bridge/app-source.ts`, `appSourceMode`). React skips an async script with a different src. The tag stays, so `script[data-studio-app="next"]` probes still work. The frame clock inline script removes itself (`src/server/app/frame-clock-script.ts`). `proxy.ts`, `render-playwright.ts` and `port-review-read.ts` did not change; no filter was needed.
  - Before: `POST /d/main/check` on `/`: 2 console errors (desktop and mobile, the hydration text). After: 0 and 0. Headless probe of the proxy URL: no hydration error.
- **Percent or z translate.** New `src/ui/features/canvas/rotate-translate-model.ts`. A px part adds the shift; another part becomes `calc(<part> + Npx)`; a z part stays. UI drag, CSS boxes `#c1 { translate: 50% 0 }`, `#c2 { translate: 4px 0 6px }`, group rotate 30°: `c1` got `translate: calc(50% + 6px) -21px`, `c2` got `translate: -2px 21px 6px`. The c1 center landed on the turned point (142,202). Screenshot `rotate-percent-translate-light.png`.
- **Missed slot searched again.** A slot with no result gets `data-photo-missed="<words>"` in the same version (title "Photo misses: N on <page>" when nothing filled). A later call skips a slot whose mark equals its words and says so in `note`. New words, or removing the mark, search again. A fill removes the mark. Tag helpers moved to new `src/server/share/image-search/photo-tag.ts` (photo-fill.ts stays under 500 lines).
  - First call: 3989 ms (Openverse search), `missed` 1. `call-action.ts image-search.apply`: http 5 ms, mcp 31 ms, agent 2 ms, `filled: []`, 0 diffs (`ds-wt/p28-call-action.txt`).
- **Unfinished changes on a new route copy.** `createPrototypeWith` commits `folder-context.md` (and `tokens.css`, `DESIGN.md` when written) as version "Folder context" before the page import, only for a route copy. A copy made before the fix shows "Unfinished changes in 1 file" (`route-copy-before-fix-light.png`); a copy after shows none (`route-copy-no-pill-*.png`). Undo on the new copy keeps `folder-context.md`.

## Screenshots

`cycle-28/polish-28/`: `render-check-clean-{light,dark}.png` (app canvas with Review open; no error section), `route-copy-no-pill-{light,dark}.png`, `route-copy-before-fix-light.png`, `rotate-percent-translate-light.png`.

## Gates

`pnpm run typecheck` pass, `pnpm run lint:gate` pass, `pnpm run build:ui` pass.

## Left out

- The "Check render" toolbar button is not shown in this canvas build, so the render check result was read from `POST /api/projects/:id/d/main/check` (the same `renderCheck` as `render_check`), not from its panel.
- No port probe run on a ported route (`port.inspect`); it uses the same page load, so the bridge fix covers it, but it was not measured.
- A network failure during a search also marks the slot missed; the note says how to retry.
- Not checked: a frame with a mock clock state in the canvas.

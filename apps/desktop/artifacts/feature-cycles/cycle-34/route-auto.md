# Cycle 34 pick 2: route-auto

Branch `feat/route-auto`, cut from main `d274c9cff`.

## What changed

- **Route copy keeps auto side margins** (`share/page-import/collect-script.ts`, the only code file). For each element with a non-zero `margin-left` or `margin-right`, the collector reads `el.computedStyleMap()`. When Chromium gives the keyword `auto`, the copy writes `auto` for that side instead of the used px value.
- When a non-replaced element gets an auto side, the copy also writes its specified `width` when it is not `auto` (`w-fit` gives `width: fit-content`). Without it, a `mx-auto w-fit` box grows to full width, because the copier writes width only for replaced elements.
- Cap: at most 2,000 elements are read (`MAX_AUTO_READS`). Other margins do not change. `styles.ts` keeps `auto` as it is, so it did not change.

## computedStyleMap check (Chrome, fixture `am-next` at 1440 px)

| Element | getComputedStyle | computedStyleMap |
|---|---|---|
| `main.mx-auto.max-w-5xl` | 208px / 208px | auto / auto |
| `button.ml-auto` in a flex row | 832.844px / 0px | auto / 0px |
| `div.mx-auto.w-fit` | 415.438px / 415.453px | auto / auto |

Step 1 of the spec works in Chromium. So I did not add the layout-test fallback (step 2): the copy always runs in Chrome.

## Checks

- Fixture `ds-wt/am-next`: Next 16.4.1, Tailwind 4.2.2. Its packages are a closure copy from the Bonaparte pnpm store (read only). It has the `/visits` route from the spec and a `/big` route with 1,503 nodes.
- `call-action.ts project.createPrototype` with `routePath: "/visits"`: pass on http, mcp and agent. The only diffs are ids and times, as for any create (`route-auto/logs/am-call-create.txt`). Each copy has 3 `margin-left:auto` and 2 `margin-right:auto` (main, button, empty state).
- UI: app project, then add the `/visits` frame, then the frame menu, then "Redesign as prototype", then Create. The new copy has the same 3 auto margins (`route-auto/ui-redesign-copy-light.png`).
- Layout of the copy in Chrome (left and right edges in px):

| Width | Branch: main / button / empty | main-style copy (px margins) |
|---|---|---|
| 1440 | 208-1232 / 1125-1208 / 647-793 | same |
| 1024 | 0-1024 / 917-1000 / 439-585 (centered) | 208-816 / 1125-1177 / 647-713, page scrolls to 1177 |
| 390 | 0-390 / 283-366 / 122-268 (centered) | 208-256, page scrolls to 1177 |

  The main-style copy is the branch copy with the px values that main's copier wrote. Main's collector gives 208px, 832.844px and 415px.
- `call-action.ts port.inspect` (app `/visits` against the copy): branch copy scores 100 at 1440 and 1024, with 0 margin pairs. The main-style copy scores 100 at 1440 and **11** at 1024, and its values pass lists a wrong `margin-top` pair. Pass on 3 surfaces (`logs/am-inspect-*.txt`).
- Collect time on the 1,503-node `/big` route (601 auto margins). Median of 7 runs, 2 rounds each: main 169 ms and 153 ms, branch 153 ms and 160 ms. There is no change beyond noise (`logs/am-time.txt`). A full route copy over HTTP took 3.5 to 4.7 s.
- Screenshots: `route-auto/copy-frames-{dark,light}.png` show the copy at 1440 (top) and at 390 and 1024 (bottom row). The content is centered and the button is at the right in each frame.
- Gates: `pnpm run typecheck` pass, `pnpm run lint:gate` pass (59608, baseline 89733), `pnpm run build:ui` pass. No action or schema changed, so `gen-routes` has no diff.

## Files outside the owned list

None.

## Left out

- Fixture A re-run with the mock `[port-bash]` driver: `ds-wt/rp-next-tw` and `rp-tools` are gone, so I could not re-run it. `am-next` takes its place: the `port.inspect` start score is 100 with no margin pair. No mock Move to app run was done.
- The layout-test fallback (spec step 2), because Chromium returns `auto` from `computedStyleMap`.
- A side margin whose used value is 0 (for example `mx-auto` on a box as wide as its parent) stays out of the copy, as on main. This gives the same layout at that width, but not at a wider width.

# Cycle 15 pick 5: scale tool

Branch `feat/scale-tool`.

## Works

- **Action** `layer-style.update` (`POST /api/projects/:projectId/layer-style/update`, MCP and agent `update_layer_style`, set `tweak`). Input: `projectId`, `directionId`, `layerId`, `factor` (0.25 to 4), `shouldKeepTokens` (default true). Output: `{ changed, skipped: [{ layerId, property, reason }], tokenCount, versionId }`.
- **Scales** the layer and every child with a source location: fixed width and height, font size, absolute line height, letter spacing in px, padding, margin, gap, radius, border width and shadow lengths. One batch gives one version and one undo step.
- **Writes only authored values.** Tailwind: base classes only (`hover:` and `md:` stay); `auto`, `full`, fractions and `mx-auto` stay. CSS: values with px or rem; `%`, `auto` and unitless line heights stay. The root also gets a scaled font size, so inherited text scales.
- **Snaps** Tailwind values to a class within 1 px (`p-6` to `p-3`, `rounded-xl` to `rounded-md`, `text-4xl` to `text-lg`, `w-80` to `w-40`), else an arbitrary value.
- **Keeps tokens** (`var(...)` values, `rounded-[var(--x)]`) when the toggle is on and reports them in `skipped`. Off: they get fixed values.
- **Skips** a child that also shows outside the scaled layer, a class list built in code, and a value over 200 chars, each with a reason.
- **UI**: Scale field (percent) under W and H in the Layout section, Enter applies, label drag scrubs, back to 100% after the write. K focuses it. "Keep tokens" checkbox. A note says "Scaled 5 layers. 1 value uses a token and stays."

## Checked

- **UI** (mock dev run, port 4182): pricing card at 50%: W 320 to 160, padding 24 to 12, gap 16 to 8, radius 12 to 6, title 20 to 10 px, 5 layers. Cmd+Z restored all 5 in one step. Token card: radius kept, note shown. Screenshots: `cycle-15/scale-tool/scale-dark.jpg`, `scale-light.jpg`.
- **Tailwind** (`@tailwindcss/browser@4` page): results above; no arbitrary value where a class is within 1 px.
- **JSX** (mock React project, CSS classes): card at 50% wrote `style={{ ... }}` on 4 elements; a `Badge` component span that also shows outside the card was skipped with a reason, and `Badge` was not changed.
- **call-action** `layer-style.update`: same `changed` list on HTTP, MCP and agent; only `versionId` differs (`cycle-15/scale-tool/call-action.txt`).
- **Factor 5** fails with BadRequest.
- `pnpm run typecheck` pass, `pnpm run lint:gate` pass, `pnpm run build:ui` pass. `check:scripts` fails on old files only (S11 in `events/event-file.ts`, O12, E16); no finding names a file, action or tool of this pick. The new tool `update_layer_style` is not in `artifacts/mcp-snapshots` yet: approve it at merge.

## Changed from the spec

- **Input** uses `layerId` (file:line:col or a get_layers id), the same as `layer-style.get` and `apply`, not `file` plus `selector`.
- **Mount** is in `inspector-layout.tsx` (one line), because `size-editor.tsx` renders only while an axis is in edit mode.
- **Output** adds `tokenCount`; `skipped` uses `layerId`.
- **Engine export** adds one line to `direct-edit/engine/index.ts` (W16a import rule).

## Left out

- **K with focus in the preview frame.** K works when focus is in the app shell (layers panel, inspector, canvas chrome). Frame focus needs a new bridge key message in contracts.
- **"N values use tokens" before the write.** The count shows after the write. A count before needs a read action.
- **Shadow snap on Tailwind.** Shadows become arbitrary `shadow-[...]` classes.
- **Responsive variants** (`md:p-8`) do not scale.
- **Components used on other pages.** A child is skipped when it also shows outside the scaled layer on the same page. A component used only on another route still changes there. `layer-style.apply` uses `usedBy` for this; the scale does not yet.
- **Canvas drag handles** (runner-up 3).

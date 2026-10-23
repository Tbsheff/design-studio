# open-pencil/open-pencil — what to learn

MIT (cloud packages Apache-2.0). About 9.2k stars, very active (last commit 2026-10-22, v0.16.0). Vue 3, CanvasKit (Skia WASM), Yoga WASM, Tauri, Yjs, Vercel AI SDK, MCP, Hono.

**What it is:** a Figma-style editor. Its scene graph is the source of truth; code is an import/export, not round-tripped. So its renderer and node tools do not fit our "filesystem owns the design" model. Its token, lint, tool-schema and self-check code does.

## Take (all MIT; keep the copyright notice)

| # | What | Path | Fit |
|---|---|---|---|
| 1 | Token model: modes with a CSS condition (`[data-theme="dark"]`, `@media`); emitter for `:root`, modes, `var()` aliases; smart CSS names | `packages/scene-graph/src/types.ts:955-1018`, `packages/dom-css/src/tokens/{stylesheet,names,values}.ts` | High: schema for our design-system packs |
| 2 | W3C DTCG reader/writer, one file per mode, `.resolver.json` | `packages/core/src/io/formats/design-tokens/` | High: port parsing only |
| 3 | Token lints: no-hardcoded-colors, consistent-spacing, consistent-radius, color-contrast | `packages/core/src/lint/rules/` | High as idea: rewrite over iframe computed styles + our source map |
| 4 | ToolDef pattern: one schema feeds MCP, chat, CLI; `mutation: none/view/document` | `packages/core/src/tools/schema.ts` | High: our studio MCP tools; mutation drives auto-approve and snapshots |
| 5 | Agent self-checks: pixel diff with changed region, issue report, change patch | `packages/core/src/tools/analyze/diff/visual.ts`, `describe/issues.ts` | Medium-high: rebuild on screenshots + git diff |
| 6 | Snap + redline geometry; preview handle with update/commit/cancel | `packages/scene-graph/src/snap.ts`, `packages/core/src/canvas/guides/redlines.ts`, `beginNodePreview` | Medium: feed bridge rects; inspector already does preview/commit/reset |

Also: `undo.ts` `coalesceKey` to merge a slider drag into one undo step.

## Avoid

- CanvasKit renderer, Yoga layout, the whole SceneGraph (our preview is the real DOM).
- "Design JSX" as an agent language (not real React).
- `.fig`/Kiwi stack, Yjs/WebRTC (shadow git covers versions).
- The ~130-tool node-editing MCP surface.
- Apache-2.0 `packages/cloud` code without its NOTICE.

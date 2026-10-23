# basta/frameground — what to learn

MIT. About 28 stars. Last commit 2026-07-20. Stack: React 19, React Flow 12, Vite 8, chokidar, Agent Client Protocol.

**What it is:** a local canvas of many standalone HTML frames, one iframe each, driven by any coding agent over ACP. No inspector, no versions, no Vite-app support.

## Take

1. **Live token swap with no reload.** DESIGN.md front-matter tokens compile to `:root{--x}`; `{a.b}` refs become `var(--a-b)`. Parent posts the CSS to every frame; a script replaces `<style id="od-tokens">`. Files: `src/shapes/HtmlFrameNode.tsx:29-36`, `server/design.ts` (`tokensToCss`). For us: a bridge message, so every visible direction updates at once.
2. **Try-before-commit overrides.** Token overrides stay in memory and apply to all frames until Commit writes a deep-merge PATCH to DESIGN.md. Files: `src/pages/Canvas.tsx` (`overrides`, `buildOverridesCss`, `applyVariant`).
3. **Content state apart from canvas state.** `frames.json` (identity) vs `.opendesign/layout.json` (positions), atomic writes. Keeps canvas moves out of version diffs.
4. **Approve-first alternatives prompt.** `.claude/skills/alternatives/SKILL.md` Steps 3, 7–9: propose N distinct seeds, user approves, then parallel subagents. Two modes: execution shopping (DESIGN.md set) vs direction shopping (empty).
5. **Snap guides when dragging frames.** `src/lib/helperLines.ts`, `components/HelperLines.tsx`. Only needed for free arrangement.

## Avoid

- One shared 80 ms debounce in `server/watcher.ts`: concurrent writes to two frames reload only the last.
- Every iframe stays mounted; no lazy mount, placeholders, or cap.
- Full reload via `?v=` loses scroll and state; keep our HMR.
- `allow-scripts allow-same-origin` on same origin, `postMessage(..., '*')`, no origin check.
- `.catch(() => {})` hides errors.
- React Flow is not needed for a grid of directions or viewports.

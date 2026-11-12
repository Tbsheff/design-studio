# Bonaparte benchmark

Run: 2026-11-12. Built UI (`pnpm run build:ui`), server with `STUDIO_AGENT=mock` and a temp `STUDIO_DATA_DIR`, browser at 1440x900.
Folder: `/Volumes/DevProjects/code/bonaparte` opened read-only as a folder workspace (Next.js monorepo, 6 apps, default `apps/dashboard`).

## Step timings

| Step | Time | How measured |
|---|---|---|
| Add folder (path + Return) to workspace shown | ~2 s | screenshot after Return |
| Home prompt (Return) to project route | 419 ms | keydown to `pushState` |
| Home prompt to preview frame mounted | 634 ms | keydown to stage `iframe` in DOM |
| Home prompt to design visible | ~985 ms | keydown to first bridge message (`bridge-hello`) and frame `load` |
| Open project (click in Home list) to route | 62 ms | click to `pushState` |
| Open project to design visible | 373 ms | click to first bridge message |
| Open project to canvas has keys | 840 ms | click to stage focus (after fix 1) |
| Select (ArrowDown) to inspector | 21 ms | keydown to `.inspector` in DOM |
| Edit text (double-click, type, Esc) | written at once | "Written" status in the inspector |
| Undo (Cmd+Z) to preview shows old text | 1.5 to 3.5 s | screenshots |
| Change color with a token | blocked | the project has no tokens (friction 9) |
| Play (Present menu, Play prototype) | 2 clicks | play layer shown |

## Friction

Each line: what I hit, then the cause. `Fixed` marks the ones this branch fixes (1 is the focus bug; 2 to 6 are the 5 picked fixes). "Likely cause" marks a cause I did not trace in the code.

1. **Fixed** - Reopening a project by its URL left focus on the page body, so Esc and the arrow keys did nothing until a click. Cause: the open-project stage focus ran once, before the lazy canvas mounted; the arrow first-select also needed focus on the stage itself.
2. **Fixed** - Every Home visit for bonaparte opened the app picker over the page, and the first click on a project went to closing it. Cause: `needsPick` ignored the default app (`apps/dashboard`) that the folder inspection already chose.
3. **Fixed** - After "Add folder", focus went back to the rail button, so you clicked the composer before you could type. Cause: the path popover closed with refocus on its trigger, over the prompt focus request.
4. **Fixed** - The inspector put Effect layers, Scroll and stacking and Accessibility above Layout, Text and Appearance, so each text or color edit started with a scroll. Cause: those rare sections shared the type-specific slot at the top of the editor.
5. **Fixed** - The inspector Values block listed the same sizes (`32px`, `12px`) under Colors, Font sizes, Radii and Spacing. Cause: `KindGroup` drew all rows for each kind and never filtered by `row.kind`.
6. **Fixed** - Home showed "Prompts make a prototype. The folder does not change." under the New prototype card that already says it. Cause: the mode line showed in prototype mode as well as Edit app mode.
7. Open folder in the rail does nothing while the bonaparte workspace (with its app chip) is selected; it works from Prototypes. Likely cause: the folder path popover toggles only when no chip is attached.
8. The status bar says "no git" for bonaparte, which is a git repo. Likely cause: the git status reads the studio project, not the attached folder.
9. The New prototype card says "with its tokens", but the project had no tokens, and the Tokens panel says "This project has no tokens yet" with no way to add one. The token step could not run. Likely cause: a folder prototype does not import tokens from the app (`apps/dashboard`).
10. The project name and the h1 stop mid-phrase ("A patient intake summary card with"). Likely cause: the title is cut at a word count, not at a clause.
11. Each new project shows three times on Home: rail Recent, Recent in bonaparte cards, and Activity Recent runs. Likely cause: three lists read the same recent set.
12. Play needs two clicks: Present opens a menu, and Play prototype is the 4th item. Likely cause: Present has no direct play default.
13. Undo takes 1.5 to 3.5 s to show in the preview, while the toast shows at once. Likely cause: the preview reloads after the file write, not on the patch.
14. The text color swatch shows empty (white) for `oklch(0.15 0 0)`, and its label truncates to "Color o...". Likely cause: the swatch parses only hex and rgb; the Size and Color fields share one row.
15. The canvas tool rail covers the left edge of the design at 100% zoom. Likely cause: the rail floats over the stage with no left inset for the frame.

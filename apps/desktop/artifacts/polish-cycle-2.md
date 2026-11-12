# Polish cycle 2

Goal: same as cycle 1. A faster, simpler Open Design with the canvas-first look of doop. No new panel or feature. Every action, MCP tool and shortcut stays.

## Fixes asked for

1. **Tool keys work on open.** A project now opens with the canvas stage focused. The composer keeps focus only after a Home prompt (⌘I still focuses it from the editor, ⌘N still focuses the Home prompt). V, H, F, R, O, P, T, C, L and Shift+P work when focus is on any control that is not a text field (input, textarea, contenteditable, combobox, the composer).
2. **New project thumbnail shows at once.** After the server captures the head thumbnail, it announces `project.list` on the `action.done` stream. Home refetches the list and shows the image. The 500 ms "thumbnail pending" poll is gone.

## The 3 picks (found while clicking Home and the editor)

1. **Next steps align with the chat.** The suggestion block had its own 12 px side padding, so its cards started 12 px right of every other chat row, and each suggestion text started at a different x after a "Refine", "States" or "Responsive" label. Fix: no side padding, and one fixed label width.
2. **Recent runs do not repeat the project name.** Each row read "Menu for a bakery" over "Menu for a bakery · chat · 2m", because a first run takes the project name as its title. Fix: the meta line drops the project name when it equals the title.
3. **No "Design Studio" line on default-location projects.** Every library row and card showed a mono "Design Studio" line under the name. It is the same for every prototype, so it says nothing. Fix: the place line shows only for projects in their own folder, where the path is real information.

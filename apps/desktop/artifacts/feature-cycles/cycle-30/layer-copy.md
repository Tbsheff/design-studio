# Cycle 30 pick 3: layer-copy

Branch `feat/layer-copy`. No new action, no description change, no MCP snapshot change. MCP and the agent copy with `move_element` (`copy: true`) and `insert_jsx`, as before. So no `call-action.ts` proof applies.

## What works

- **Mod+C** on 1 or more selected layers records the targets and the head version, reads each layer's source with the existing `/source` route, and writes the markup to the system clipboard. Toast: "Copied 1 layer. ⌘V pastes it into the selection."
- **Mod+V order:** cut layers waiting (move), then copied layers, then clipboard JSX or HTML (`pasteJsx`), then the "cut first" notice. One waiting state (`kind: "cut" | "copy"`), so a new copy clears a cut and a new cut clears a copy.
- **Same file, same head:** `duplicate` with `into` the last selected layer, or `after` it for `img`, `input`, text tags and other leaf tags. One version, one undo step.
- **Another file, a changed head, or a clipboard that no longer holds the copy:** paste goes through `pasteJsx` (`insert_jsx`) with the clipboard markup. When the clipboard holds other text, the copy is cleared.
- **Text copy kept:** Mod+C with a text selection in the frame, in text edit, in the chat or in an input copies text, with no toast.
- **Menus:** "Copy" item in the structure menu; the paste item is now "Paste here" and works for copies too. Key "Copy layers" (Mod+C) in the shortcut sheet and Cmd+K.

## Checked in the running app (mock agent, Tailwind 4 HTML project and Vite React project)

- Copy card, select column, Mod+V: copy is the last child; one Mod+Z removes it.
- Paste with an `img` selected: the copy goes after it.
- Copy then cut, Mod+V: the cut moves. Cut then copy, Mod+V: the copy pastes (`duplicate`).
- index.html card pasted into about.html: markup lands in about.html (`insert_jsx`).
- React: `<p>` from `src/Panel.tsx` pasted into `src/App.tsx`. Copying the root of `<Button>` copies its inner markup (`{children}`); `insert_jsx` refuses and the notice says "The snippet refers to children, which src/Panel.tsx does not have." Nothing changes.
- Text selection in the frame, text edit and chat: text copies, no toast.
- `pnpm run typecheck`, `pnpm run lint:gate`, `pnpm run build:ui`: pass.

Screenshots (dark and light): `cycle-30/layer-copy/{toast-copied,pasted,shortcut-sheet}-{dark,light}.png`.

## Left out

- **Component usages in Vite prototypes.** The bridge sets `usedAt` and `usedBy` only in Next app mode. The copy uses the usage location when it has them (`toCopyTargets`), but this path is not checked; no Next app was run.
- **Second Mod+V with the pasted copy still selected** pastes inside the copy when it can hold children (selection moves to the copy after a paste). Select the column again for a sibling.
- **Focus:** after a click on a parent button (for example the page menu), the button keeps focus and canvas keys (cut, copy, paste) do not fire until focus leaves it. This is older behaviour, not changed here.

## Files outside the listed set

- `versions-layers-tokens/use-layer-shortcuts.ts` (text-selection guard in the parent window).
- `versions-layers-tokens/use-layer-edits.ts` (`readSource` dependency).
- New `versions-layers-tokens/use-copy-layers.ts` (copy hook, split out for the 80-line limit).
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A is not changed.

# Voice guide

Design Studio talks like a calm designer who sits next to you. Short, warm, plain, the same everywhere. This guide applies to every string a person sees: feature `copy.ts` files, `src/ui/app` copy, `packages/ui` copy, and server error `message` text that the UI shows.

## 1. Tone

- Write short sentences. One idea in each.
- Use plain words. Write "use", not "utilize". Write "cannot", not "is unable to".
- Talk to the person: "your design", "you can undo this".
- Be warm, but do not praise or joke. Never "Oops", "Uh oh", "Awesome".
- Use the active voice. "Claude changed 3 files", not "3 files were changed".
- Do not use contractions. Write "Could not", "do not", "cannot".

## 2. Case and punctuation

- Use sentence case for every label, button, title, tab and menu item: "Save version", not "Save Version".
- Keep product and file names as they are: DESIGN.md, Tailwind, Figma, Cloudflare, MCP.
- End a full sentence with a period. Do not end a label, button or title with a period.
- Put "…" on a menu item or button that opens a dialog or needs more input: "Rename…", "Export…".
- Put "…" on text that shows work in progress: "Saving…", "Checking…".
- Use curly quotes in copy: “card-title”.

## 3. Buttons

- Start a button with a verb: "Add padding", "Create key", "Save version". Never "Fix", "OK", "Submit" alone.
- Use "Create" for a new thing, never "Make" or "New" on a button. "New" is fine in a title: "New screen".
- Use "Try again" to repeat a failed step. Do not use "Retry".
- Use "Delete" for a permanent removal, and "Remove" when the thing stays somewhere else (a file on disk, a tag on a layer).
- Name the result on a confirm button: "Delete forever", "Empty trash", not "Yes".

## 4. One word for each thing

| Word | Means | Never |
|---|---|---|
| project | a folder that Design Studio works in | workspace, repo (in the UI) |
| design | what a project shows on the canvas | artboard, mock |
| direction | one branch of a design that you can compare and switch to | fork, variation id, direction id |
| frame | one page or screen on the canvas | artboard, cell |
| layer | one part of a frame that you can select | element, node, selector |
| version | one saved state you can restore | commit, snapshot, checkpoint |
| design system | tokens, fonts, components and DESIGN.md that a project builds with | kit, pack, theme pack |
| token | one named design value, such as a color or a spacing step | variable, var |
| component | a reusable part from the project code | kit component, instance |
| Claude | the AI that edits the design | the agent, the AI, the model, the AI step |
| chat | the panel on the left where you talk to Claude | prompt box, composer (in copy) |
| run | one turn of work by Claude | job, task, session |

- Never show internal words: action, handler, selector, probe, proxy, direction id, source location, kit drift, principal, payload.
- "Element" is fine only in accessibility text, where it is the web term. Everywhere else, write "layer".
- When the code cannot find a layer, say so plainly: "Design Studio cannot find this layer in the code."

## 5. Empty states

- Say what the area is for, then the one next step.
- Pattern: "No <things> yet. <Do this> to <get that>."
- Example: "No dev notes yet. Add one to tell the developer what this frame does."

## 6. Errors

- Say what happened, then what to do. Pattern: "Could not <do the thing>. <Next step>."
- Never show a stack, a status code, an error code (`run_in_progress`), an id or a file path that the person did not type.
- Do not blame the person. "This URL does not start with https://", not "You entered a bad URL".
- Use "Could not copy", not "Copy failed". Use "Could not publish", not "Publish failed".
- Server messages that MCP callers read may name a tool ("Call canvas_list for the frame ids."). That text is for the caller, so keep it.

## 7. Numbers, units and counts

- Write numbers as digits: "3 layers", "1 file".
- Put a space between a number and its unit: "16 px", "200 ms", "5 s".
- Timers are compact: "1m 4s".
- Write sizes with a spaced times sign: "64 × 21 px".
- Make the noun agree with the count: "1 file", "2 files". Never "file(s)".
- Write keys as symbols on macOS: ⌘Z, ⇧⌘H, ↵, Esc.
- Tooltips put two spaces before a shortcut ("Hide  ⇧⌘H"). The two spaces are a visual gap. Keep them.

## 8. Count strings and fragments

The lint rule `react/jsx-no-literals` moves JSX text into `copy.ts`, so many strings are fragments that join around a number or a name. A join with a missing or extra space is a bug.

- Read the JSX that joins a fragment before you change it.
- JSX drops white space at a line break. `{copy.a}` on one line and `{count}` on the next have no space between them, so the fragment must carry the space: `of: " of "`.
- A literal space in JSX (`{count} {copy.files}`) already gives the space, so the fragment must not start with one.
- After a change, read the whole sentence out loud with 0, 1 and 2 as the count.

## 9. Examples

| Before | After |
|---|---|
| This target is 64x21 px; tap targets need at least 24x24 px. | This target is 64 × 21 px. Make it at least 24 × 24 px so it is easy to tap. |
| No animations yet. Select a layer and press New animation. | No animations yet. Select a layer, then choose New animation. |
| Make key | Create key |
| Copy failed | Could not copy |
| This element has no source location | Design Studio cannot find this layer in the code |
| run_finished | The run already finished. |

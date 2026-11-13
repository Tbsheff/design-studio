# User journeys to test

Each journey has a goal, an in-app path, an MCP path, and what must be true at the end. Run the in-app path in the installed app, in dark and light. Run the MCP path as an outside agent (Claude Code or a script) connected through Connect AI, with no clicks in the app. Both paths must end in the same result. Note every slow step, extra click, wrong default, clipped item and error.

Bonaparte (`/Volumes/DevProjects/code/bonaparte`) stays read-only in every journey. Check `git status` there before and after.

## A. First run and quick prototypes

### 1. First prompt to a design
- **Goal:** a new user gets a design from one prompt.
- **In the app:** open the app. On Home, type "A pricing page for a coffee subscription". Press Enter.
- **Pass:** the editor opens with no questions step. The design shows in under 2 s after the run ends. The chat shows the run, its time and its cost. The new project has a thumbnail on Home.
- **MCP:** `create_project`, then `start_run` with the same prompt, `get_run` until the status is not running, then `get_screenshot`.

### 2. Three drafts at once
- **Goal:** compare options side by side.
- **In the app:** on Home, set drafts to 3. Prompt "A login screen for a bank app". Pick the best draft and delete the other two.
- **Pass:** 3 frames show side by side. Delete asks once, and Undo brings a frame back.
- **MCP:** `start_variation` with count 3.

### 3. Iterate with chat
- **Goal:** refine a design in a few messages.
- **In the app:** from journey 1, ask "Make the hero darker and add a FAQ section". Then ask "Shorten the FAQ answers".
- **Pass:** each run edits the same frame. Versions lists each run. Undo steps back one run at a time. "Next steps" chips show and fill the composer when clicked.
- **MCP:** `start_run` twice on the same project (wait with `get_run`), then `list_versions` and `run_suggestion` (with `directionId` and `runId`). Undo with `undo`, or `restore_version`.

### 4. Style from a web page or image
- **Goal:** match an outside look.
- **In the app:** in the chat + menu, choose "Attach web page" and enter https://linear.app. Ask "Restyle this page to match the reference".
- **Pass:** a reference chip shows. The run uses the reference's colors and fonts. Nothing on the reference site changes.
- **MCP:** `import_reference` with a `url`, then `start_run` with the restyle prompt and `get_run`.

## B. Real apps (Bonaparte benchmark)

### 5. Import the Bonaparte design system
- **Goal:** a design system that matches the real app.
- **In the app:** Home, "Open folder…", pick Bonaparte. Make a design system from it.
- **Pass:** colors, fonts, radii and spacing match Bonaparte's `globals.css`. No variable names are dropped. DESIGN.md loads with no forced save. Button, card, badge and input styles come in. Bonaparte has no new files.
- **MCP:** `create_design_system` with `folderPath`, then `get_tokens`.

### 6. HTML prototype of a new Bonaparte screen
- **Goal:** mock up a screen that does not exist yet.
- **In the app:** in the Bonaparte workspace, prompt "A team caseload page with clinician load and recerts due".
- **Pass:** the prototype is in Design Studio's own folder, not in Bonaparte. It uses Bonaparte tokens through `var(--…)` with no hard-coded colors. It looks like Bonaparte in light and dark.
- **MCP:** the outside-agent test in `artifacts/mcp-bonaparte-test-2/`.

### 7. Edit the real app (opt-in)
- **Goal:** change real app code on purpose.
- **In the app:** in the Bonaparte workspace, choose "Edit app" on a copy of the repo. Ask "Change the empty state copy on the dashboard".
- **Pass:** only the copy changes. Undo restores the file. The dev server starts only now and stops after 10 idle minutes. The real Bonaparte repo is untouched.
- **MCP:** `attach_app` on the app copy, `start_run` with the copy change, `get_run`, then `undo` (or `restore_version`).

### 8. Move a prototype into the app
- **Goal:** turn an approved prototype into app code.
- **In the app:** from journey 6, use "Move to app" on a repo copy.
- **Pass:** the target defaults to Bonaparte. The new route uses Bonaparte components and tokens, with no copied raw HTML.
- **MCP:** `get_port_plan` with the prototype id and `targetProjectId`. No MCP tool writes the route yet; Move to app runs only from the app.

## C. Manual editing (Figma-level)

### 9. Edit by hand
- **Goal:** fine-tune without the AI.
- **In the app:** select a heading. Change its text inline, then its size, weight and color from a token. Nudge it with the arrow keys. Undo each step.
- **Pass:** each change is one undo step. Tool keys work right after the project opens. The inspector opens on select and closes on Esc.
- **MCP:** `get_layers`, then `edit_element` for text, size, weight and token color, then the undo tool.

### 10. Layout and shapes
- **Goal:** build a section by hand.
- **In the app:** draw a rectangle, an ellipse and a text box. Group them, set auto layout with a gap, and turn on aspect lock. Tidy the frames.
- **Pass:** every tool works by key and from the strip. The code updates for each change. Tidy lines up frames with even gaps.
- **MCP:** `insert_jsx` for the shapes, `edit_element` for layout and `aspect-*` classes, then `canvas_place` or `arrange` to tidy.

### 11. Tokens
- **Goal:** manage design tokens.
- **In the app:** open Tokens (⌥5). Rename a used color token. Filter Unused, delete one unused token, and export the tokens.
- **Pass:** rename changes every use. Delete asks first. Nothing clips at 1000 px. Tooltips stay inside the window.
- **MCP:** `list_usage_token`, `rename_token`, `delete_token` (approval card) and `export_token`.

### 12. Find and inspect
- **Goal:** move around a large design fast.
- **In the app:** ⌘P to open a file, ⌘K to run a command, search Layers for "Button", right-click and use "Select layer", then press ⇧O for outline view.
- **Pass:** each one opens in under 200 ms. Every popover and menu shows in full.
- **MCP:** `get_layers`, `canvas_list` and `read_file`. Outline view is UI-only.

## D. Prototype, review and share

### 13. Clickable prototype
- **Goal:** a flow that clicks through.
- **In the app:** link 3 frames with Prototype links, including one popover and one swipe. Press Play on an iPhone frame, rotate it, and switch to dark.
- **Pass:** links, popovers and swipes work. Hotspot hints flash on a missed click. Present opens full screen.
- **MCP:** `set_link_interaction` for the links, popover and swipe, then `list_links`. Play is UI-only; check the links with `get_screenshot` per frame.

### 14. Review and fix
- **Goal:** find and fix quality issues.
- **In the app:** open Review. Check accessibility, spelling and speed. Apply one suggested fix. Use "Remember as rule" on a chat correction.
- **Pass:** each finding links to its layer. A fix is one undo step. The new rule shows in Review rules.
- **MCP:** `inspect_spelling`, `run_speed`, `inspect_accessibility` and `run_vision_accessibility`, then `create_design_rule`.

### 15. Comment and share
- **Goal:** get feedback.
- **In the app:** drop 2 comment pins, one in Play. Share a link and scan the QR code on a phone. Copy a frame as PNG.
- **Pass:** pins anchor to layers. The phone opens the prototype. The PNG pastes into Slack.
- **MCP:** `create_comment`, `list_comments`, `create_share_link`, and `export` with format png.

## E. Agents and MCP

### 16. Connect an outside agent
- **Goal:** set up Claude Code or Cursor fast.
- **In the app:** click "Connect AI". Copy the Claude Code snippet. In Claude Code, ask it to add a hero section to the open project.
- **Pass:** setup takes under 1 minute. The frame shows "Claude Code is editing…" while it works. The token never shows in any screen except this dialog.
- **MCP:** read the setup from the local setup file, connect, call `tools/list` and `get_activity_studio`, then `edit_element`.

### 17. Agent and human at the same time
- **Goal:** no conflict when both edit.
- **In the app:** while an MCP agent runs, edit a different layer by hand. Lock a file with File lock, then ask the agent to edit it.
- **Pass:** both edits survive. The locked file is refused with a clear message. Versions shows who changed what.
- **MCP:** `set_file_lock`, then `write_file` on the locked file (must fail with Forbidden), while a person edits in the app.

## F. Health

### 18. Long session
- **Goal:** the app stays fast and light.
- **In the app:** use journeys 1 to 15 over 1 hour, then leave the app on Home for 10 minutes.
- **Pass:** idle CPU stays under 0.5 CPU-seconds per minute. Memory stays under about 500 MB. No spinner runs while idle.
- **MCP:** run journeys 1, 5, 6 and 9 over MCP in a loop for 30 minutes, then measure the app at idle.

### 19. Restart and recovery
- **Goal:** nothing is lost.
- **In the app:** quit the app during a run. Reopen it.
- **Pass:** the app opens in about 2 s with no Keychain block. The stopped run shows as failed, not running. The last project reopens with the canvas focused.
- **MCP:** start a run with `start_run`, quit the app, reopen it, then `get_run` must report failed, not running.

### 20. Clipping sweep
- **Goal:** no cut-off UI anywhere.
- **In the app:** run the clipping check.

```bash
cd /Volumes/DevProjects/code/design-studio/apps/desktop && pnpm run check:clip
```

- **Pass:** no new findings over the baseline.
- **MCP:** not needed. This is a UI-only check.

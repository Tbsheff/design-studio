import {
  listBreakpointsDescription,
  setBreakpointStyleDescription,
} from "./breakpoints-tool.js";
import {
  CREATE_COMPONENT_AGENT_DESCRIPTION,
  SWAP_INSTANCE_AGENT_DESCRIPTION,
} from "./component-create-tool.js";
import { FIGMA_IMPORT_TOOL_DESCRIPTION } from "./figma-import-tool.js";
import { SET_IMAGE_AGENT_DESCRIPTION } from "./image-tool.js";
import { SELECT_MATCHING_DESCRIPTION } from "./select-tool.js";
import {
  VECTOR_BOOLEAN_SHORT,
  VECTOR_DRAW_SHORT,
  VECTOR_PAINT_SHORT,
} from "./vector-tool.js";

export const TOOL_SHORT = {
  arrange:
    "Align, distribute or tidy sibling elements by writing the parent auto layout. Pass one of align, distribute or tidy.",
  boolean_shapes: VECTOR_BOOLEAN_SHORT,
  create_component:
    "Turn one element into a reusable React component file with inferred props and cva variants, and use it at the old place.",
  define_tweaks:
    "Save the Tweaks panel controls (replaces the list). Each control sets one CSS custom property that is declared in :root and used with var().",
  design_review:
    "Prototype and polish runs. A separate critic reviews fresh desktop and mobile shots of every screen. Returns JSON issues with severity and fix.",
  design_system_check:
    'Design-system projects only. Checks tokens, AA contrast, DESIGN.md sections and the kit page. Returns "passed" or problems.',
  draw_vector: VECTOR_DRAW_SHORT,
  edit_element:
    "Change one element by CSS selector or layer id: style, leaf text, Tailwind classes {add, remove}, or op (delete, duplicate, wrap, group, unwrap, move). Patches only that element. Elements made by .map(), a condition or a call are refused.",
  find_styles:
    "Read only. Colors, font sizes, radii and spacing on the page with counts and token/raw status; with value, the elements that use it.",
  get_layers:
    "Read only. The rendered page as a tree of layer ids with tag, component and source line. Layer ids work as selectors in the edit tools.",
  import_figma_frame:
    "Turn a Figma nodes JSON file (exported by the user) into flex markup with token colors and kit components, as one version.",
  insert_component:
    "Insert one library component inside or after a target, with required props and the import line. .map() and condition targets are refused.",
  list_breakpoints:
    "Read only. Project breakpoints, the active one for a frame width, and the values each breakpoint overrides on a layer.",
  list_locked_layers: "List the locked layers of the design with their page.",
  measure:
    "Read only. Distance, gaps and insets between two elements on the live page.",
  paint_shape: VECTOR_PAINT_SHORT,
  render_check:
    "Render one page at the run level sizes. JSON: console and page errors, overflow, `layout` findings and `quality` findings with severity and source.",
  replace_style:
    "Replace one raw style value with a token on every element of the page that uses it. Skips .map() elements and computed classNames.",
  review_frame:
    "Read only. Review panel checks on one frame: contrast, tap targets, axe, tokens, clipping, type, hover and focus, broken images. Findings have a fix or null.",
  screenshot:
    "PNG screenshots of one page (default: the <canvas-context> frame), up to four images from y offset `from`. The text says if more of the page is below.",
  select_matching:
    "Read only. Find elements that match one element (same component, classes or style). Returns ids for edit_element `also`.",
  set_breakpoint_style:
    "Set or reset one style property of one layer at base or one breakpoint: md:/lg: classes in Tailwind, @media rules in HTML.",
  set_image:
    "Place or replace an image (project file, attached image or https url) with src, alt, fit and focal point; copies the file into the project assets.",
  set_layer_state:
    "Lock or unlock, hide or show, or rename one layer. Locks live in the studio; hide and rename change the source.",
  set_props:
    "Change props of one React component instance (by selector or source file:line:col), such as variant or size.",
  studio_help:
    "Full description of one studio tool: when to use it, what it refuses, and the fields of its result.",
  swap_instance:
    "Replace one component instance with another library component, keeping matching props.",
} as const;

export type StudioToolName = keyof typeof TOOL_SHORT;

export const TOOL_HELP: Record<
  Exclude<StudioToolName, "studio_help">,
  string
> = {
  arrange:
    "Align, distribute or tidy up sibling elements like Figma, with the same code as the studio arrange bar. In a flex parent it writes the parent layout (align-items, justify-content, gap) or align-self on some children; in a grid justify-items or align-items; absolute children move by left/top. align and distribute in a parent with no auto layout are refused; tidy adds auto layout (flex, gap) to it. Tailwind projects get classes. Pass one of align, distribute or tidy.",
  boolean_shapes: VECTOR_BOOLEAN_SHORT,
  create_component: CREATE_COMPONENT_AGENT_DESCRIPTION,
  define_tweaks:
    "Save the Tweaks panel controls for this design (replaces the whole list). Each control sets one CSS custom property: range {min, max, step?, unit?, default: number}, color {default}, toggle {on, off, default: boolean}, select {options: [{label, value}], default}. The user drags them for a live preview with no model call, and Commit writes the values into the :root declaration. Every cssVar must be declared in a top-level :root rule of the page CSS with the default value (a design-system token from tokens.css is already declared; Commit then updates tokens.json) and used with var() in the rules it changes. The result lists any var that is not declared or not used.",
  design_review:
    "Prototype and polish runs. A separate critic model that has not seen your work reviews fresh desktop and mobile screenshots of every screen (the frame from <canvas-context> first, then each view of a multi-view page, each canvas frame, each changed app route; pass frame or path to review only that page), the latest render_check findings, the taste rules and the request. Returns JSON issues [{severity, area, screen, where, problem, fix}]. Prototype: one quick call. Polish: at most 2 calls; the second also compares desktop with the first call and files regressions.",
  design_system_check:
    'Design-system projects only. Checks the design system files and returns "passed" or a list of problems: required tokens present and valid (DTCG, OKLCH, dark values), WCAG AA contrast (4.5:1) for fg and fg-muted on bg, fg on surface and each X-fg on X in light and dark, the 9 DESIGN.md sections with no "_To do:" lines, no raw colors in the kit page index.html, and font tokens that match the Google Fonts link and pack.json.',
  draw_vector: VECTOR_DRAW_SHORT,
  edit_element:
    "Change one element found by CSS selector on the live page, with the same code as the studio inspector: style (CSS properties, null removes; in a Tailwind project they become theme classes such as p-6, bg-primary, rounded-lg, and an arbitrary value only when no theme step fits), the text of a leaf element, or Tailwind classes {add, remove} on a plain className string or the string arguments of cn(), clsx() or twMerge(). Or pass op alone: delete, duplicate, wrap (in a flex column frame), unwrap, or move into targetSelector. It patches only that element in the source file (HTML, JSX or TSX) and leaves every other byte as it was. Elements made by .map(), a condition or a function call are refused; edit the file for those. Use it for small, exact changes to one element; use Edit or Write for new markup, new rules in a stylesheet, or many changes at once.",
  find_styles:
    "Read only. List the colors, font sizes, radii and spacing used on the page (or one canvas frame) with element counts and whether each value is a token, raw or mixed, like the inspector Selection colors panel. With value (and property) it lists the elements that use that computed value; inherited values count only on the element that sets them.",
  get_layers:
    'Read only. List the elements of the rendered page (or one canvas frame) as a compact tree with the same server code as the MCP get_layers tool: one line per element with a layer id, tag, <Component> when the element is the root of a component use, source file:line, a text preview and "+N inside" when deeper levels are cut. A layer id (such as "e0k3pz") works in place of a CSS selector in selector or targetSelector of edit_element, set_props, insert_component, insert_jsx, clear_text and review_frame; the page of the id is used when you leave out path. Ids come from the source location, so they stay the same after edits while that JSX stays on the same line. Use root to list one part of the page.',
  import_figma_frame: FIGMA_IMPORT_TOOL_DESCRIPTION,
  insert_component:
    "Insert one instance of a React component from the project library with the same code as the studio Components panel: it writes <Name …>Text</Name> inside (as the last child) or after the target element, fills required props from the props type, and adds or extends the import line with the path the project uses (workspace package such as @workspace/ui/components/button, tsconfig path, or relative). Find the target by targetSelector on the live page or targetSource (file:line:col). Targets made by .map() or shown by a condition, and the top element of a component, are refused. Use it to add a library component; use Edit for other new markup.",
  list_breakpoints: listBreakpointsDescription,
  list_locked_layers:
    "List the locked layers of the design, with the page of each and whether it is on the page now. Changes nothing.",
  measure:
    "Read only. Measure the distance between two elements on the live page, like holding Alt in the studio: boxes, relation, horizontal and vertical gap, inset when one is inside the other, center offset and guide lines.",
  paint_shape: VECTOR_PAINT_SHORT,
  render_check:
    "Render one page of the current design at the sizes this run level uses. With no frame or path it checks the frame from <canvas-context> (its page and frame state), or the entry page. Returns JSON: `page`, then per viewport console errors, page errors, page-level horizontal overflow and `layout` findings (clipped, scrolls-sideways, past-viewport); then `quality` findings with severity high/medium/low (a11y from axe-core, tap-target, placeholder text, tokens, nav-mobile, visual-diff), selectors and source locations; then timings and the budget used.",
  replace_style:
    'Replace one style value with a token on every element of the page (or frame) that uses it, with the same code as "Replace with token…" in the studio inspector. token is a CSS variable or, in a Tailwind project, a theme class; Tailwind projects get classes, not inline style. Elements made by .map(), elements with a className built in code, and shared elements where only some copies use the value are skipped and counted. Use it to move raw values such as #1c1f23 or p-[13px] to tokens.',
  review_frame:
    "Run the studio Review panel checks on one canvas frame of the live page: color contrast with the nearest passing color token, tap target size, missing alt text and other axe-core rules, off-token values (raw colors or spacing that are not project tokens, Tailwind arbitrary values), clipped or overflowing content, type (type scale, line length, line height and spacing steps), interaction (no hover style, focus ring removed, emoji used as icons) and broken-image (an img or background image that did not load). Returns JSON findings with severity, element, selector, source, message and directFix (the exact style for edit_element) or null when the fix needs judgment. Read only.",
  screenshot:
    "Take PNG screenshots of one page of the live preview. With no frame or path it shows the frame from <canvas-context> (its page, size and frame state), or the entry page. Returns up to four images, top to bottom, starting at the y offset `from`. The text names the page and says whether more of it is below.",
  select_matching: SELECT_MATCHING_DESCRIPTION,
  set_breakpoint_style: setBreakpointStyleDescription,
  set_image: SET_IMAGE_AGENT_DESCRIPTION,
  set_layer_state:
    "Lock or unlock, hide or show, or rename one layer, like the lock, eye and name in the Layers panel. A locked layer ignores canvas clicks. Locks are stored in the studio data folder, not in the source; hide writes display:none and rename writes data-name in the source as one version.",
  set_props:
    'Change the props of one React component instance with the same code as the studio inspector Component section: it adds, replaces or removes JSX attributes at the use site, such as <Button variant="outline"> to variant="destructive" or size="sm", and leaves every other byte as it was. Find the instance by selector (an element inside it on the live page) or source (file:line:col of the JSX tag). Use it for a variant, size or flag change on a component; use Edit for new markup.',
  swap_instance: SWAP_INSTANCE_AGENT_DESCRIPTION,
};

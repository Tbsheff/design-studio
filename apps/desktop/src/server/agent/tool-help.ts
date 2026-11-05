import { FLOW_NOTE, FRAME_STATES_NOTE } from "../canvas/app-flow/index.js";
import {
  listBreakpointsDescription,
  setBreakpointStyleDescription,
} from "./breakpoints-tool.js";
import {
  CREATE_COMPONENT_AGENT_DESCRIPTION,
  SWAP_INSTANCE_AGENT_DESCRIPTION,
} from "./component-create-tool.js";
import { COPY_CODE_AGENT_DESCRIPTION } from "./copy-code-tool.js";
import { APP_DOCTOR_DESCRIPTION } from "./doctor-tool.js";
import { EXPORT_FRAME_AGENT_DESCRIPTION } from "./export-tool.js";
import { FIGMA_IMPORT_TOOL_DESCRIPTION } from "./figma-import-tool.js";
import {
  placeImageDescription,
  searchImagesDescription,
} from "./image-search-tool.js";
import { SET_IMAGE_AGENT_DESCRIPTION } from "./image-tool.js";
import { importPageDescription } from "./page-import-tool.js";
import { COMPARE_REFERENCE_DESCRIPTION } from "./reference-tool.js";
import { SELECT_MATCHING_DESCRIPTION } from "./select-tool.js";
import {
  VECTOR_BOOLEAN_SHORT,
  VECTOR_DRAW_SHORT,
  VECTOR_PAINT_SHORT,
} from "./vector-tool.js";
import { DIFF_VERSIONS_DESCRIPTION } from "./version-diff-tool.js";

export const TOOL_SHORT = {
  add_flow:
    "Attached apps only. Lay out route frames left to right and link them from the links in their source.",
  app_doctor:
    "Read only. Diagnose why the attached app dev server or a route does not render.",
  apply_text_style:
    "Apply a text style to an element: Tailwind classes that replace text size, font, leading and tracking classes, or CSS var references.",
  arrange:
    "Align, distribute or tidy sibling elements by writing the parent auto layout. Pass one of align, distribute or tidy.",
  boolean_shapes: VECTOR_BOOLEAN_SHORT,
  canvas_list:
    "Read only. Canvas frames (id, label, page, size, position), the selection, the live frame and frames in view.",
  canvas_place:
    "Add or move canvas frames: { frames: [...] } in order, placed below / rightOf / leftOf / above a frame id or @label. Returns overlap warnings.",
  canvas_point:
    "Show the user one frame, and select an element in it when you pass a selector.",
  clear_text:
    "Remove the plain text inside an element and keep its child elements.",
  compare_to_reference:
    "Score a frame against the reference picture the user attached (0-100) and get a diff image. Changes nothing.",
  component_preview:
    "Read only. Render one library component alone with default props, as an image.",
  copy_code:
    "Read only. Copy one element as html, tailwind or a react JSX component with kit components and import lines.",
  create_component:
    "Turn one element into a reusable React component file with inferred props and cva variants, and use it at the old place.",
  create_component_variant:
    "Add a value (or a new key) to the cva variants map of one kit component, with classes or a copy of a value; returns a preview.",
  create_text_style:
    "Add the computed text props of an element as a new text style token in the project token source.",
  detach_text_style:
    "Detach an element from its text style: write its computed text props as literal values on the element.",
  define_tweaks:
    "Save the Tweaks panel controls (replaces the list). Each control sets one CSS custom property that is declared in :root and used with var().",
  design_review:
    "Prototype and polish runs. A separate critic reviews fresh desktop and mobile shots of every screen. Returns JSON issues with severity and fix.",
  design_system_check:
    'Design-system projects only. Checks tokens, AA contrast, DESIGN.md sections and the kit page. Returns "passed" or problems.',
  diff_versions:
    "Read only. Compare two saved versions of this direction: changed files and lines.",
  draw_vector: VECTOR_DRAW_SHORT,
  edit_element:
    "Change one element by CSS selector or layer id: style, leaf text, Tailwind classes {add, remove}, or op (delete, duplicate, wrap, group, unwrap, move). Patches only that element. Elements made by .map(), a condition or a call are refused.",
  edit_links:
    "Add, replace or remove prototype links and set the Play start frame. Links live in the studio, not in page code.",
  export_frame:
    "Export canvas frames as SVG or PPTX into the studio data folder. Changes no design file. Only when the user asks for an SVG or a deck.",
  find_styles:
    "Read only. Colors, font sizes, radii and spacing on the page with counts and token/raw status; with value, the elements that use it.",
  get_layers:
    "Read only. The rendered page as a tree of layer ids with tag, component and source line. Layer ids work as selectors in the edit tools.",
  get_run_context:
    "Read only. The repo context (AGENTS.md, CLAUDE.md, DESIGN.md, PRODUCT.md) again. The message already has it as <repo_context>.",
  import_figma_frame:
    "Turn a Figma nodes JSON file (exported by the user) into flex markup with token colors and kit components, as one version.",
  import_page:
    "Copy a live page (https or localhost URL) into a new static HTML page and canvas frame: a copy for redesign, not a live link.",
  insert_component:
    "Insert one library component inside or after a target, with required props and the import line. .map() and condition targets are refused.",
  insert_jsx:
    "Insert a JSX snippet (HTML in an HTML project) inside, before, after or in place of a target; adds kit imports. Markup only: no functions, hooks, conditions, .map() or spreads.",
  list_breakpoints:
    "Read only. Project breakpoints, the active one for a frame width, and the values each breakpoint overrides on a layer.",
  list_comments:
    "Read only. Comments pinned on this direction: number, author, text, element, frame, status.",
  list_components:
    "Read only. Project components, the shared kit first, with import line, JSX example, parts and cva variants. Use query; pages of 20.",
  list_frame_states:
    "Attached apps only. Read only. Frame preview states, which frame shows which, and the session in use.",
  list_link_interactions:
    "Read only. Saved prototype links with trigger (click, hover, press, delay, key), action and target (frame, selector or url).",
  list_links:
    "Read only. Prototype links of Play mode: id, frame, selector, target, transition, broken, startFrame.",
  list_locked_layers: "List the locked layers of the design with their page.",
  list_route_links:
    "Attached apps only. Read only. Links in the source of one app route.",
  list_text_styles:
    "Read only. The project type scale: Tailwind @theme, tokens.json, CSS vars, DESIGN.md. Name, size, weight, line-height, letter-spacing, family, source.",
  measure:
    "Read only. Distance, gaps and insets between two elements on the live page.",
  paint_shape: VECTOR_PAINT_SHORT,
  place_image:
    "Download one search_images result into the project assets, set it on an <img> or background with alt text, and credit it in ASSETS.md.",
  prepare_ship:
    "Attached apps only. Read only. Files changed since the last ship and the draft PR text. Only the user can ship.",
  render_check:
    "Render one page at the run level sizes. JSON: console and page errors, overflow, `layout` findings and `quality` findings with severity and source.",
  replace_style:
    "Replace one raw style value with a token on every element of the page that uses it. Skips .map() elements and computed classNames.",
  resolve_comment: "Mark one pinned comment resolved. Only when the user asks.",
  review_frame:
    "Read only. Review panel checks on one frame: contrast, tap targets, axe rules, off-token values, clipping. Findings have a directFix for edit_element or null.",
  screenshot:
    "PNG screenshots of one page (default: the <canvas-context> frame), up to four images from y offset `from`. The text says if more of the page is below.",
  search_images:
    "Read only. Search free Creative Commons stock photos by words, orientation and limit; returns thumbnail, full url, size, author and license.",
  select_matching:
    "Read only. Find elements that match one element (same component, classes or style). Returns ids for edit_element `also`.",
  set_breakpoint_style:
    "Set or reset one style property of one layer at base or one breakpoint: md:/lg: classes in Tailwind, @media rules in HTML.",
  set_frame_session:
    "Attached apps only. Change the mock user of signed-in frame states, or forget app cookies. Changes no file.",
  set_frame_state:
    "Attached apps only. Show one frame in a preview state (default, session, empty, loading, error, mock). Changes no file.",
  set_image:
    "Place or replace an image (project file, attached image or https url) with src, alt, fit and focal point; copies the file into the project assets.",
  set_layer_state:
    "Lock or unlock, hide or show, or rename one layer. Locks live in the studio; hide and rename change the source.",
  set_link_interaction:
    "Set the trigger, action and target of one link, or make one from an element: scroll-to, open-url, close-overlay, toggle.",
  set_props:
    "Change props of one React component instance (by selector or source file:line:col), such as variant or size.",
  set_token:
    "Change one design token value (tokens.json, or the app token CSS declaration). theme dark changes the dark value.",
  studio_help:
    "Full description of one studio tool: when to use it, what it refuses, and the fields of its result.",
  swap_instance:
    "Replace one component instance with another library component, keeping matching props.",
  update_component_variant:
    "Rename a cva variant value of one kit component, replace its classes, or make it the default; returns a preview.",
} as const;

export type StudioToolName = keyof typeof TOOL_SHORT;

export const TOOL_HELP: Record<
  Exclude<StudioToolName, "studio_help">,
  string
> = {
  add_flow: `Attached apps only. Lay out route frames left to right with the same code as Flow in the studio, and make prototype links from the links in their source. routes: routes in order; or from: a route or frame id/@label, with depth (default 1) to add the routes it links to. params: sample values for dynamic segments. ${FLOW_NOTE}`,
  app_doctor: APP_DOCTOR_DESCRIPTION,
  apply_text_style:
    "Apply one text style from list_text_styles to the target with the same server code as the MCP apply_text_style tool. In a Tailwind file it adds the style classes (text-xl, font-semibold, leading-[..], tracking-[..]) and removes the text size, font weight, font family, leading and tracking classes they replace; text colors and alignment stay. Elsewhere it writes font-size, font-weight, line-height, letter-spacing and font-family with var(--token) references in the rule or inline style.",
  arrange:
    "Align, distribute or tidy up sibling elements like Figma, with the same code as the studio arrange bar. In a flex parent it writes the parent layout (align-items, justify-content, gap) or align-self on some children; in a grid justify-items or align-items; absolute children move by left/top. align and distribute in a parent with no auto layout are refused; tidy adds auto layout (flex, gap) to it. Tailwind projects get classes. Pass one of align, distribute or tidy.",
  boolean_shapes: VECTOR_BOOLEAN_SHORT,
  canvas_list:
    "List the frames on the studio canvas: id, label, page, size and position of each frame, which directions use the lo-fi look, what the user has selected, which frame is live and which frames are in view. Call it before you place or point at frames.",
  canvas_place:
    "Add or move frames on the studio canvas. Pass { frames: [...] }, applied in order, so a later frame can use the @label of an earlier one. Each item: frame (id or @label to move; leave out to add), label, path (the page it shows), viewport or width/height, and one of below / rightOf / leftOf / above (another frame id or @label) with gap (default 80), or absolute x/y. With no placement a new frame goes to the right of all frames. Returns the placed frames and a warnings list when frames overlap.",
  canvas_point:
    'Show the user one frame: the studio makes the frame live, selects the element when you pass a CSS selector for an element inside that frame, and scrolls and zooms the canvas to it. Use it to say "this one" at the end of a reply.',
  clear_text:
    "Remove the plain text inside an element and keep its child elements, such as placeholder text next to children you inserted. On a library component it clears the text where the page uses it. Text from a prop or a { } expression stays.",
  compare_to_reference: COMPARE_REFERENCE_DESCRIPTION,
  component_preview:
    "Read only. Render one component of the project library alone with its default props, with the same server code as the studio Components panel tiles and the MCP component_preview tool, and see it as an image. Use it to check what a kit component looks like before you use it. Components that need data, server code or an open state return the reason.",
  copy_code: COPY_CODE_AGENT_DESCRIPTION,
  create_component: CREATE_COMPONENT_AGENT_DESCRIPTION,
  create_component_variant:
    "Add a value to the cva() variants map of one kit component with the same server code as the MCP create_component_variant tool. Pass name (from list_components) or file, key (variant, size or another key), value, and classes; copyFrom starts from an existing value of the key, and classes then replace the ones of the same utility. newKey: true adds a key that does not exist, with this value as its default. setDefault: true also sets defaultVariants. Only the cva() call changes. It refuses a component with no cva(). You get the value list and a preview image of the new value.",
  create_text_style:
    "Read the computed font size, weight, line-height, letter-spacing and family of the target on the live page and add them as a new text style named name: --text-<name> with pairs in the Tailwind @theme block, a tokens.json typography entry, or :root CSS vars. Refuses a name that exists.",
  detach_text_style:
    "Read the computed font size, weight, line-height, letter-spacing and family of the target on the live page and write them as literal values on the element, with the same server code as the MCP detach_text_style tool. A later change to the text style no longer reaches the element.",
  define_tweaks:
    "Save the Tweaks panel controls for this design (replaces the whole list). Each control sets one CSS custom property: range {min, max, step?, unit?, default: number}, color {default}, toggle {on, off, default: boolean}, select {options: [{label, value}], default}. The user drags them for a live preview with no model call, and Commit writes the values into the :root declaration. Every cssVar must be declared in a top-level :root rule of the page CSS with the default value (a design-system token from tokens.css is already declared; Commit then updates tokens.json) and used with var() in the rules it changes. The result lists any var that is not declared or not used.",
  design_review:
    "Prototype and polish runs. A separate critic model that has not seen your work reviews fresh desktop and mobile screenshots of every screen (the frame from <canvas-context> first, then each view of a multi-view page, each canvas frame, each changed app route; pass frame or path to review only that page), the latest render_check findings, the taste rules and the request. Returns JSON issues [{severity, area, screen, where, problem, fix}]. Prototype: one quick call. Polish: at most 2 calls; the second also compares desktop with the first call and files regressions.",
  design_system_check:
    'Design-system projects only. Checks the design system files and returns "passed" or a list of problems: required tokens present and valid (DTCG, OKLCH, dark values), WCAG AA contrast (4.5:1) for fg and fg-muted on bg, fg on surface and each X-fg on X in light and dark, the 9 DESIGN.md sections with no "_To do:" lines, no raw colors in the kit page index.html, and font tokens that match the Google Fonts link and pack.json.',
  diff_versions: DIFF_VERSIONS_DESCRIPTION,
  draw_vector: VECTOR_DRAW_SHORT,
  edit_element:
    "Change one element found by CSS selector on the live page, with the same code as the studio inspector: style (CSS properties, null removes; in a Tailwind project they become theme classes such as p-6, bg-primary, rounded-lg, and an arbitrary value only when no theme step fits), the text of a leaf element, or Tailwind classes {add, remove} on a plain className string or the string arguments of cn(), clsx() or twMerge(). Or pass op alone: delete, duplicate, wrap (in a flex column frame), unwrap, or move into targetSelector. It patches only that element in the source file (HTML, JSX or TSX) and leaves every other byte as it was. Elements made by .map(), a condition or a function call are refused; edit the file for those. Use it for small, exact changes to one element; use Edit or Write for new markup, new rules in a stylesheet, or many changes at once.",
  edit_links:
    'Add, replace or remove prototype links and set the Play start frame. add: [{fromFrame, selector, toFrame, transition?}] links the element (CSS selector on the page of fromFrame, which must exist on the rendered page) to toFrame (frame id or @label, or "back"); transition is instant, dissolve, slide-left or slide-right. A new link on the same element replaces the old one. remove: link ids. startFrame: frame id or @label. Links live in the studio, not in the page code.',
  export_frame: EXPORT_FRAME_AGENT_DESCRIPTION,
  find_styles:
    "Read only. List the colors, font sizes, radii and spacing used on the page (or one canvas frame) with element counts and whether each value is a token, raw or mixed, like the inspector Selection colors panel. With value (and property) it lists the elements that use that computed value; inherited values count only on the element that sets them.",
  get_layers:
    'Read only. List the elements of the rendered page (or one canvas frame) as a compact tree with the same server code as the MCP get_layers tool: one line per element with a layer id, tag, <Component> when the element is the root of a component use, source file:line, a text preview and "+N inside" when deeper levels are cut. A layer id (such as "e0k3pz") works in place of a CSS selector in selector or targetSelector of edit_element, set_props, insert_component, insert_jsx, clear_text and review_frame; the page of the id is used when you leave out path. Ids come from the source location, so they stay the same after edits while that JSX stays on the same line. Use root to list one part of the page.',
  get_run_context:
    "Read only. Read the repo context of this run again with the same server code as the MCP get_run_context tool: the app folder and workspace root AGENTS.md, CLAUDE.md, DESIGN.md and PRODUCT.md, cut to about 8 KB, secret-looking lines left out. The run message already has it as <repo_context>; call this only when you need the file list or a fresh copy.",
  import_figma_frame: FIGMA_IMPORT_TOOL_DESCRIPTION,
  import_page: importPageDescription,
  insert_component:
    "Insert one instance of a React component from the project library with the same code as the studio Components panel: it writes <Name …>Text</Name> inside (as the last child) or after the target element, fills required props from the props type, and adds or extends the import line with the path the project uses (workspace package such as @workspace/ui/components/button, tsconfig path, or relative). Find the target by targetSelector on the live page or targetSource (file:line:col). Targets made by .map() or shown by a condition, and the top element of a component, are refused. Use it to add a library component; use Edit for other new markup.",
  insert_jsx:
    "Insert a group of elements in one step with the same server code as the MCP insert_jsx tool and the studio Paste JSX menu: a JSX snippet (HTML in an HTML project) inside, before, after or in place of the target. Component tags that the file does not import are found in the project library and their import lines are added or extended. The snippet keeps its line breaks and gets the file indent. Markup only: text, string props, numbers, style objects and references to names the file has; functions, calls (hooks), conditions, .map() and spreads are refused. Targets made by .map() are refused; before or after the one element of a ? : or && branch wraps the branch in a <> fragment. Use it to build a card, row or section from library components; clear_text removes stray text next to child elements.",
  list_breakpoints: listBreakpointsDescription,
  list_comments:
    "Read only. List the comments pinned on this direction with the same server code as the studio Comments pane and the MCP list_comments tool: number, author (an outside agent or the user), text, replies, element (selector, source file:line, component), frame and status. status: open (default), all or one status; frame: frame id, @label or page path.",
  list_components:
    "Read only. Find the React components of the project with the same server code as the MCP list_components tool and the studio Components panel: shared workspace packages (the kit, such as packages/ui) first, then app components by use count. Each item has source (package or app), file, folder, parts (other components of the same file, such as CardHeader for Card), a ready import line, a minimal JSX example, the use count and the props schema with cva variants and their options. query searches names, then folders and files, then props and variants. Pages hold 20 items; pass nextCursor as cursor for the next page. Use the names in insert_jsx or insert_component and the variant options in set_props.",
  list_frame_states: `Attached apps only. Read only. List the frame preview states (signed in, empty, loading, error, mock), which frame shows which, and the session in use. ${FRAME_STATES_NOTE}`,
  list_link_interactions:
    "Read only. List the saved prototype links with the same server code as the MCP list_link_interactions tool: id, frame, selector, trigger (shown only when it is not click: hover, press, delay with delayMs, key with key), action (navigate, modal, drawer, scroll-to, open-url, close-overlay, toggle), target (toFrame, target selector with visibility, or url), transition and broken. fromFrame limits the list to one frame.",
  list_links:
    'List the prototype links (on click of an element, go to a frame) used by Play mode: id, frame, selector, target frame or "back", transition, broken (null or why the link no longer works) and startFrame. Each page with links is rendered to check the elements.',
  list_locked_layers:
    "List the locked layers of the design, with the page of each and whether it is on the page now. Changes nothing.",
  list_route_links: `Attached apps only. Read only. List the links found in the source of one app route (route pattern or concrete path): kind, href, target route, element and file:line. ${FLOW_NOTE}`,
  list_text_styles:
    "Read only. List the text styles that apply_text_style can use, with the same server code as the MCP list_text_styles tool. It reads Tailwind v4 @theme --text-* vars with their --line-height, --font-weight and --letter-spacing pairs and --font-* families, then tokens.json typography, then size, weight and line-height vars in :root, then the DESIGN.md typography section; the first source wins for a name. Returns name, size, weight, lineHeight, letterSpacing, family, source and file.",
  measure:
    "Read only. Measure the distance between two elements on the live page, like holding Alt in the studio: boxes, relation, horizontal and vertical gap, inset when one is inside the other, center offset and guide lines.",
  paint_shape: VECTOR_PAINT_SHORT,
  place_image: placeImageDescription,
  prepare_ship:
    "Attached app projects only. Read only. Lists the files the studio changed since the last ship (or since the app was attached), the files that cannot ship (secrets, .env, conflicts with the user's own changes) and the default branch name and pull request text. You cannot ship; only the user can, with the Ship button.",
  render_check:
    "Render one page of the current design at the sizes this run level uses. With no frame or path it checks the frame from <canvas-context> (its page and frame state), or the entry page. Returns JSON: `page`, then per viewport console errors, page errors, page-level horizontal overflow and `layout` findings (clipped, scrolls-sideways, past-viewport); then `quality` findings with severity high/medium/low (a11y from axe-core, tap-target, placeholder text, tokens, nav-mobile, visual-diff), selectors and source locations; then timings and the budget used.",
  replace_style:
    'Replace one style value with a token on every element of the page (or frame) that uses it, with the same code as "Replace with token…" in the studio inspector. token is a CSS variable or, in a Tailwind project, a theme class; Tailwind projects get classes, not inline style. Elements made by .map(), elements with a className built in code, and shared elements where only some copies use the value are skipped and counted. Use it to move raw values such as #1c1f23 or p-[13px] to tokens.',
  resolve_comment:
    "Mark one pinned comment resolved, with the same code as Resolve in the studio Comments pane. Use it only when the user asks you to resolve a comment; after a run the user resolves the comments you fixed with the Resolve button. comment: id or number.",
  review_frame:
    "Run the studio Review panel checks on one canvas frame of the live page: color contrast with the nearest passing color token, tap target size, missing alt text and other axe-core rules, off-token values (raw colors or spacing that are not project tokens, Tailwind arbitrary values) and clipped or overflowing content. Returns JSON findings with severity, element, selector, source, message and directFix (the exact style for edit_element) or null when the fix needs judgment. Read only.",
  screenshot:
    "Take PNG screenshots of one page of the live preview. With no frame or path it shows the frame from <canvas-context> (its page, size and frame state), or the entry page. Returns up to four images, top to bottom, starting at the y offset `from`. The text names the page and says whether more of it is below.",
  search_images: searchImagesDescription,
  select_matching: SELECT_MATCHING_DESCRIPTION,
  set_breakpoint_style: setBreakpointStyleDescription,
  set_frame_session: `Attached apps only. Change the session that signed-in frame states use, with the same code as the frame state menu: user {name, email} sets the mock user; forgetCookies drops the cookies the app set in signed-in frames. Changes no file. ${FRAME_STATES_NOTE}`,
  set_frame_state: `Attached apps only. Show one canvas frame in a preview state with the same code as the frame state menu: state is default, session, empty, loading, error, a mock state id, or mock with mock {name?, rules: [{path, method?, status?, body?, delayMs?}], signedIn?} to make one. Changes no file. ${FRAME_STATES_NOTE}`,
  set_image: SET_IMAGE_AGENT_DESCRIPTION,
  set_layer_state:
    "Lock or unlock, hide or show, or rename one layer, like the lock, eye and name in the Layers panel. A locked layer ignores canvas clicks. Locks are stored in the studio data folder, not in the source; hide writes display:none and rename writes data-name in the source as one version.",
  set_link_interaction:
    'Set the trigger, action and target of one prototype link with the same server code as the MCP set_link_interaction tool. Pass linkId to change a saved link, or fromFrame and selector to make one (the element must exist on the rendered page; use "body" for a delay trigger). trigger: click (default), hover, press, delay (delayMs) or key (key, for example "Escape" or "k"). action: navigate, modal or drawer with toFrame ("back" for navigate), scroll-to with target (a CSS selector in the same frame), open-url with url (https only), close-overlay, or toggle with target and visibility (toggle, show or hide). One element has one link per trigger. Each change is one undo step.',
  set_props:
    'Change the props of one React component instance with the same code as the studio inspector Component section: it adds, replaces or removes JSX attributes at the use site, such as <Button variant="outline"> to variant="destructive" or size="sm", and leaves every other byte as it was. Find the instance by selector (an element inside it on the live page) or source (file:line:col of the JSX tag). Use it for a variant, size or flag change on a component; use Edit for new markup.',
  set_token:
    "Change one design token value with the same code as the studio Tokens panel: design-system/tokens.json (tokens.css is rebuilt) in a studio design system, or only that declaration in the app token CSS file of an imported app (Tailwind @theme, :root or .dark). theme dark changes the dark value. Use it instead of editing tokens.json or the token CSS by hand when you change a token value.",
  swap_instance: SWAP_INSTANCE_AGENT_DESCRIPTION,
  update_component_variant:
    "Change one value of the cva() variants map of one kit component with the same server code as the MCP update_component_variant tool. rename gives the value a new name (defaultVariants and compoundVariants follow; page uses of the old name do not), classes replaces all of its classes, and setDefault: true makes it the default. Only the cva() call changes. You get the value list and a preview image.",
};

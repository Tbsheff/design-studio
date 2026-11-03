import { randomBytes } from "node:crypto";

import { Effect } from "effect";
import { Hono } from "hono";

import type { McpStatus } from "../../shared/export.js";
import { firstVersionBlock } from "../app/first-version.js";
import { takeSaveFailures } from "../direct-edit/save-queue.js";
import { withMcpOrigin } from "../edit-origin.js";
import type { ExportDeps } from "../export/source.js";
import type { WireArgs } from "../handlers/_core/run-action.js";
import type { McpListenerRunnerApi } from "../mcp-life/index.js";
import { isKnownError } from "../platform/errors/index.js";
import {
  renderedSince,
  renderPending,
  renderSettled,
} from "../preview/render-wait.js";
import { toLegacyPrincipal } from "../store/principal.js";
import { EditError } from "./edit-deps.js";
import type { EditDeps } from "./edit-deps.js";
import {
  callEditTool,
  EDIT_NAMES,
  EDIT_TOOLS,
  RENDER_WAIT_TOOLS,
} from "./edit-tools.js";
import { createKeyResolver, offlineRefusal } from "./key-auth.js";
import type { Introspect, Resolved } from "./key-auth.js";
import { withLayerSelectors } from "./layer-tools.js";
import { getFreePort, isPortFree, isSameText } from "./port-probe.js";
import { ActionTools } from "./registry.js";
import type { McpCaller } from "./registry.js";
import { newToken, readMcpSettings, writeMcpSettings } from "./settings.js";
import type { McpSettings } from "./settings.js";

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_BODY = 1024 * 1024;
const SERVER_NAME = "design-studio";
const READ_INSTRUCTIONS =
  "Design Studio is a local design tool. These tools read its projects: list_projects (or search_projects with a query) first, then get_tokens, get_design_md, get_frame_html, get_screenshot, list_files and read_file with a projectId. For an attached app, list_routes lists its routes. list_found_apps lists the app folders found in the home folder.";
const READ_ONLY_NOTE =
  " All tools are read-only. The user can turn on Allow edits in Design Studio to add tools that edit the design and the canvas.";
const EDITS_NOTE =
  " Allow edits is on: canvas_list, get_layers, canvas_place, canvas_point, add_frame, remove_frame, write_file, edit_element, batch_edit, arrange, measure, find_styles, replace_style, list_components, set_props, insert_component, insert_jsx, clear_text, review_frame, apply_fix, get_design_rules, set_design_rules, test_design_rules, undo, redo, edit_history, revert_hunk, list_route_links, add_flow, add_comment, list_comments, reply_comment, resolve_comment, create_project, open_folder, restore_version, apply_design_system, set_token, create_design_system, design_system_status, save_design_system, list_design_systems, attach_app, add_route_frame, list_links, add_link, remove_link, set_start_frame, list_link_interactions, set_link_interaction, import_page, search_text, update_text, list_breakpoints, set_breakpoint_style, list_state_styles, set_state_style, set_forced_state, get_stacking, set_stacking, search_images, place_image, inspect_accessibility, set_accessibility, list_frame_states, set_frame_state, set_frame_session, keep_variant, export, prepare_ship, ship, app_doctor and apply_app_fix. Each design edit is saved as a version the user can undo; prototype link and canvas frame changes are undo steps of their own and save with the next version, and undo or restore of a version keeps the current links and frames; edit_element and batch_edit take variant ('md:', 'hover:', 'md:hover:', 'dark:') to style one breakpoint or state; in an attached app they edit a shared component use (<Button>, <CardTitle>) in the page file where it is used, unless target is 'component'; list_comments {status, frame} lists pinned comments with their element, frame and author; add_flow lays out attached app route frames left to right and turns the <Link href>, router.push and form-action links in their source into prototype links for Play; list_route_links reads those links for one route; set_frame_state shows an attached app frame signed in, empty, loading, with errors or with mock data (it changes no file and makes no version); edit_element and batch_edit text on text from a prop, a literal array, a constant or a messages key changes that literal at its source; use insert_jsx to build a group of elements (a Card with its header, rows, badges and buttons) in one call with its imports, and clear_text (or edit_element op 'clear') to remove placeholder text next to child elements; get_layers lists the page as a tree of short layer ids (e0k3pz) that every selector or targetSelector input and get_screenshot element accept in place of a CSS selector, with file:line:col that targetSource and source accept (file:line works when one tag starts on that line); ids stay the same when studio edits move lines; edit tools return when the file is written and saved, and get_screenshot, get_layers and review_frame wait for the dev server rebuild (pass wait: 'render' to an edit to wait in that call); list_components {query} finds kit components with an import line and a JSX example; arrange aligns, distributes or tidies up sibling elements by writing their auto layout (or left/top for absolute children) as one version, and measure gives the distance between two elements; use batch_edit to make several edits one version, review_frame to list review findings for a frame (selector limits them to one element subtree) and apply_fix to apply the fixes that need no judgment (a fix in a file outside the page's own route folder needs allowShared: true), get_design_rules, set_design_rules and test_design_rules to read, save and try the project's design rules (review_frame lists their breaks as kind rule), and undo or redo to step the same edit history as the studio's Cmd+Z. These tools never start, steer or stop the studio agent (Improve with AI on a design system draft runs only from the app), and design edits are refused while a studio run edits that direction. app_doctor names why an attached app dev server fails or a frame shows an error overlay (env validation, missing .env, port in use, install, sign-in redirect), and apply_app_fix applies its one-click fix (env keys from the app env schema or .env.example only, never secret values) and restarts the dev server. get_run_context reads the repo context (AGENTS.md, CLAUDE.md, DESIGN.md, PRODUCT.md) that studio runs get. component_preview {name} returns a PNG of one library component rendered alone with default props. create_share_link (the user must click Allow), list_share_links and revoke_share_link manage read-only snapshot links that let other people view frames and add comments. publish_design (the user must click Allow on a prompt with the pages, file count, size, URL, password, end date and comment setting), list_publications (with view counts and published versions), rollback_publication (Allow) and unpublish_design (Allow) put a saved version on a public URL of the user's one publish Worker (Cloudflare R2 and D1, set up in Settings > Publishing): HTML prototypes as their static pages, attached apps and React projects as frame PNGs, never source code; republish uploads only changed files. list_links also returns implicit links (implicit: true) read from <a href> between pages, and keep_links saves them; add_link takes action (navigate, modal, drawer), transition (with push, move-in, move-out, smart-animate), duration and easing. set_link_interaction {linkId | fromFrame and selector, trigger: click | hover | press | delay (delayMs) | key (key), action: navigate | modal | drawer (toFrame) | scroll-to (target) | open-url (https url) | close-overlay | toggle (target, visibility)} sets the trigger, action and target of one link as one undo step, and list_link_interactions lists them. search_text {query, caseSensitive?, wholeWord?, regex?, glob?} finds visible text (text nodes, alt, placeholder, title, aria-label and rendered string literals) in HTML and JSX pages with file:line:col, the layer source, a snippet and the frame; in an attached app only the files the canvas frames use, plus glob; update_text {same query, replace, ids?} changes the chosen hits (or all) in every file as one version and one undo step, keeps entities and escaping, and never changes a dynamic expression. list_breakpoints {frame? | width?, targetSelector? | targetSource?} reads the project breakpoints (Tailwind --breakpoint-* or sm 640, md 768, lg 1024, xl 1280), the active one for a frame width and the values each breakpoint overrides on a layer, and set_breakpoint_style {targetSelector | targetSource, breakpoint: base | md | lg ..., property, value | reset} writes one property at one breakpoint as md:/lg: classes that replace only the same utility at that prefix, or as an @media (min-width) rule in the page stylesheet of an HTML page; one version and one undo step. import_page {url, width?, selector?, name?} copies a live page (https, or localhost for an attached app dev server; private network addresses are refused) into an HTML project as a new static page <slug>.html with a class stylesheet (token colors and fonts when near), local copies of its images and fonts, and a canvas frame, as one version and one undo step; the page is a copy for redesign, not a live link, and has no scripts, iframes, form actions or trackers. create_component turns one element or several look-alike elements into a component file with props and cva variants and uses it in their place, and swap_instance changes one component use to another library component (leave out name to list the ones that fit). create_component_variant {name | file, key, value, classes, copyFrom?, newKey?, setDefault?} adds a value (or a new key with a default) to the cva() variants map of a kit component, and update_component_variant {name | file, key, value, rename?, classes?, setDefault?} renames a value or replaces its classes; only the cva() call changes, each is one version, and both return the value list and a preview PNG. select_matching {selector, by: component | classes | text-style} returns the layer ids of every element that matches one element, like Select matching in the studio. diff_versions {from, to} returns the changed files of two versions with unified diffs and the paths of a screenshot of each, like Compare in the Versions panel. revert_hunk {versionId, file, hunk, from?} undoes one diff hunk on the head as one version that undo takes back, like Undo this change in Compare > Code. list_tweaks lists the tweak controls the studio agent made (define_tweaks) with their current values, and set_tweak {id, value} sets one with the same code path as the Tweaks panel as one version; it is a direct edit, not an AI run. copy_code {targetSelector, format: html | tailwind | react} returns one element as code (react: a JSX component named after the layer with className or style objects and kit components such as <Button> with import lines); it changes no file. export_frame {format: svg | pptx} writes canvas frames as an SVG vector file or a PPTX deck with editable text into the Design Studio data folder and returns the file path. set_image {selector, path | url, fit, focal, alt} replaces the image of an <img> or a background image, or inserts an <img> into another element; it copies the file into the project assets folder with a content-hashed name (url: https, 10 MB, image types only), and its page input is the page path. search_images {query, orientation, limit} finds Creative Commons stock photos (Openverse, search words only) and place_image {imageId, targetSelector | targetSource, alt} downloads one into the project assets, sets it with the set_image code and credits it in ASSETS.md as one version; both are off until STUDIO_IMAGE_SEARCH=on or the project setting imageSearch is true. inspect_accessibility {frame?, targetSelector?} reads the role and accessible name of a layer, the tab order, the focusable elements with no name, the images with no alt and the low text contrast pairs with the WCAG ratio and the nearest token that passes (send its fix to replace_style), and set_accessibility {targetSelector | targetSource, ariaLabel, role, alt, tabIndex} writes those attributes, as a prop at the call site of a kit component, as one version. draw_vector draws a rectangle, ellipse or pen path as an inline <svg>, boolean_shapes joins two SVG shapes (union, subtract, intersect, exclude) into one <path>, and paint_shape sets the fill, stroke or stroke width of an SVG shape; each is one version. set_layer_state locks, hides or renames a layer (locks live in the studio data folder; hide and rename change the source), list_locked_layers lists locks, and list_page_variations, keep_page_variation and discard_page_variation manage page variations without starting a run. move_element moves one element before or after a sibling (before / after: CSS selector or layer id) or to a left/top point in an absolute parent, as one version, like a drag on the canvas. compare_to_reference {frame | path, image} scores a frame against a reference picture (0-100) and returns a side-by-side diff PNG path; it changes no file. get_port_plan {projectId, path, targetProjectId, route} reads an HTML prototype page and plans it as one route in an attached app: sections, steps, repeated cards, tokens mapped to app tokens and the kit components that fit (Card, Badge, Button) with import lines; it never starts a run. list_icons {query, library} searches the icons of the project icon library (lucide-react, @heroicons/react, @tabler/icons-react) or a bundled lucide set, and insert_icon {name, targetSelector, position, size, color} writes one as <SearchIcon className='size-4' /> with its import, or as an inline <svg> in HTML projects and projects with no icon library; on an icon target it swaps the icon in place; one version. list_text_styles {query} reads the project type scale (Tailwind @theme --text-* and --font-*, tokens.json typography, :root CSS vars, then DESIGN.md), apply_text_style {style, targetSelector | targetSource} writes one style on an element (Tailwind classes that replace text-*, font-*, leading-* and tracking-* size classes, or CSS var references in the rule or inline style), and create_text_style {name, targetSelector} adds the computed text props of an element as a new token in the project token source; each edit is one version. list_motion {targetSelector | targetSource} reads the transitions and entrance animations of an element, and set_motion {kind: transition | entrance | none, targetSelector | targetSource} writes a transition (properties, durationMs, easing, delayMs, state hover | focus | active with end values) or an entrance (preset fade, slide-up, slide-down, scale-in, blur-in, durationMs, delayMs, staggerMs) as Tailwind motion-safe classes or as @keyframes and rules written once in a studio motion style block or the app CSS entry, always guarded by prefers-reduced-motion; one version. get_fill {targetSelector | targetSource} reads the fill of an element as a solid color or gradient stops with its blend modes, and set_fill {type: solid | linear | radial, color | token, angle, form, at, stops [{color | token, position}], blendMode, blendProperty} writes it as Tailwind bg-linear-<angle> or bg-radial with from-*, via-* and to-* classes (token names when a stop matches a token) or as background-image linear-gradient() or radial-gradient() with var() for token stops; one version. get_spacing {targetSelector | targetSource} reads the box model of an element (padding and margin per side, row and column gap, each with css, px, token and class, and the rect), and set_spacing {property: padding | margin | gap | row-gap | column-gap, side: all | x | y | top | right | bottom | left, value px | token, snap} writes one spacing value as Tailwind scale classes (p-4, px-6, gap-3, -mt-2; arbitrary only when no step matches) or as CSS with var() for tokens; one version. import_figma_frame {nodesFile, nodeId, targetSelector} turns a Figma nodes JSON frame into flex markup with token colors and kit components as one version; dryRun returns the markup; it never calls Figma. get_component_usage {projectId, file, usedAt?, route?} lists the app routes that render a source file through a page, a layout or an import chain, and with usedAt or route its callSite (kind page, component or layout; routeLocal false when the use sits in a layout that several routes share, so the change cannot stay on one route); with more than one route, ask or decide this use (change the call site) or all uses (change the file and name the routes).";
const EDITS_OFF =
  "Allow edits is off in Design Studio, so this tool is not available. The user can turn it on in Export > Connect to Claude Code. Then reconnect the MCP server.";
const DEFAULT_CLIENT = "MCP client";
const MAX_SESSIONS = 200;

interface RpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

type RpcReply =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | {
      jsonrpc: "2.0";
      id: string | number | null;
      error: { code: number; message: string };
    };

interface Dispatch {
  deps: ExportDeps;
  edits: EditDeps | null;
  client: string;
  key: Resolved | null;
  startSession: (client: string) => void;
}

function callerOf(ctx: Dispatch, edits: EditDeps | null): McpCaller {
  return {
    client: ctx.client,
    edits,
    principal: ctx.key?.principal ?? toLegacyPrincipal(),
  };
}

function offlineReply(ctx: Dispatch, name: string): unknown {
  const isRead = ActionTools.isAction(name)
    ? ActionTools.isRead(name)
    : !EDIT_NAMES.has(name);
  const text = offlineRefusal(
    name,
    isRead,
    ctx.key?.offlineSince ?? null,
    Date.now()
  );
  return text === null
    ? null
    : { content: [{ type: "text", text }], isError: true };
}

function argsOf(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

const TAKES_PATH = new Set(
  EDIT_TOOLS.filter(
    (tool) =>
      "path" in
      ((tool.inputSchema as { properties?: Record<string, unknown> })
        .properties ?? {})
  ).map((tool) => tool.name)
);

function splitWait(
  name: string,
  raw: unknown
): { args: Record<string, unknown>; wait: boolean } {
  const { wait, ...args } = argsOf(raw);
  if (!RENDER_WAIT_TOOLS.has(name) || wait === undefined)
    return { args: argsOf(raw), wait: false };
  if (wait !== "render")
    throw new EditError('wait must be "render" or left out.');
  return { args, wait: true };
}

async function withRender(
  result: unknown,
  projectId: unknown,
  started: number
): Promise<unknown> {
  const id = typeof projectId === "string" ? projectId : undefined;
  const waited =
    id !== undefined && (renderPending(id) || renderedSince(id, started));
  const settled = await renderSettled(id);
  const content = (result as { content?: unknown[] }).content;
  if (!Array.isArray(content)) return result;
  const note = waited
    ? settled
      ? `The dev server rebuilt the page ${Date.now() - started} ms after the call started.`
      : "The dev server did not finish the rebuild within 60 s."
    : "No page of this app was rendered yet, so there was no rebuild to wait for.";
  return {
    ...(result as object),
    content: [...content, { type: "text", text: note }],
  };
}

const FIRST_VERSION_WAIT_MS = 20_000;

function withSaveFailures(result: unknown, projectId: unknown): unknown {
  const notes =
    typeof projectId === "string" ? takeSaveFailures(projectId) : [];
  const content = (result as { content?: unknown[] }).content;
  if (notes.length === 0 || !Array.isArray(content)) return result;
  return {
    ...(result as object),
    content: [
      ...content,
      {
        type: "text",
        text: `Error: an earlier edit could not be saved as a version. ${notes.join(" ")}`,
      },
    ],
  };
}

async function firstVersionRefusal(
  edits: EditDeps,
  name: string,
  projectId: unknown
): Promise<string | null> {
  if (!RENDER_WAIT_TOOLS.has(name) || typeof projectId !== "string")
    return null;
  const project = await edits.projects.get(projectId).catch(() => null);
  return project ? firstVersionBlock(project, FIRST_VERSION_WAIT_MS) : null;
}

function lockOnly(name: string, args: Record<string, unknown>): boolean {
  return (
    name === "set_layer_state" &&
    args.hidden === undefined &&
    args.name === undefined
  );
}

async function runEdit(
  edits: EditDeps,
  name: string,
  raw: unknown,
  client: string
): Promise<unknown> {
  try {
    const started = Date.now();
    const { args, wait } = splitWait(name, raw);
    const blocked = await firstVersionRefusal(edits, name, args.projectId);
    if (blocked)
      return { content: [{ type: "text", text: blocked }], isError: true };
    const result = await withMcpOrigin(client, async () =>
      callEditTool(
        edits,
        name,
        await withLayerSelectors(
          edits,
          args,
          TAKES_PATH.has(name),
          lockOnly(name, args)
        ),
        client
      )
    );
    const failed = (result as { isError?: boolean }).isError === true;
    const done =
      wait && !failed
        ? await withRender(result, args.projectId, started)
        : result;
    return withSaveFailures(done, args.projectId);
  } catch (error) {
    const known = error instanceof EditError || isKnownError(error);
    if (!known) console.error("[mcp] edit tool failed", name, error);
    return {
      content: [
        {
          type: "text",
          text: known
            ? (error as Error).message
            : "The tool failed. See the Design Studio log.",
        },
      ],
      isError: true,
    };
  }
}

async function callAny(
  ctx: Dispatch,
  edits: EditDeps | null,
  name: string,
  args: unknown
): Promise<unknown> {
  const offline = offlineReply(ctx, name);
  if (offline !== null) return offline;
  if (ActionTools.isAction(name))
    return ActionTools.call(
      ctx.deps,
      name,
      argsOf(args) as WireArgs,
      callerOf(ctx, edits)
    );
  if (!EDIT_NAMES.has(name))
    return {
      content: [{ type: "text", text: `unknown tool ${name}` }],
      isError: true,
    };
  if (!edits)
    return { content: [{ type: "text", text: EDITS_OFF }], isError: true };
  return runEdit(edits, name, args, ctx.client);
}

export function clientName(
  params: Record<string, unknown> | undefined
): string {
  const info = argsOf(params?.clientInfo);
  const raw =
    typeof info.title === "string" && info.title.trim()
      ? info.title
      : typeof info.name === "string"
        ? info.name
        : "";
  const clean = raw
    .replaceAll(/[^\p{L}\p{N} ._@()-]/gu, "")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return clean || DEFAULT_CLIENT;
}

async function dispatch(
  ctx: Dispatch,
  message: RpcMessage
): Promise<RpcReply | null> {
  const { edits } = ctx;
  const id = message.id ?? null;
  const isNotification = message.id === undefined;
  const reply = (result: unknown): RpcReply | null =>
    isNotification ? null : { jsonrpc: "2.0", id, result };
  const fail = (code: number, text: string): RpcReply | null =>
    isNotification
      ? null
      : { jsonrpc: "2.0", id, error: { code, message: text } };
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string")
    return fail(-32_600, "invalid request");
  switch (message.method) {
    case "initialize": {
      const asked =
        typeof message.params?.protocolVersion === "string"
          ? message.params.protocolVersion
          : "";
      ctx.startSession(clientName(message.params));
      return reply({
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: SERVER_NAME,
          title: "Design Studio",
          version: "0.1.0",
        },
        instructions: READ_INSTRUCTIONS + (edits ? EDITS_NOTE : READ_ONLY_NOTE),
      });
    }
    case "ping": {
      return reply({});
    }
    case "tools/list": {
      return reply({
        tools: ActionTools.list([], EDIT_TOOLS, edits),
      });
    }
    case "tools/call": {
      const name =
        typeof message.params?.name === "string" ? message.params.name : "";
      if (!EDIT_NAMES.has(name) && !ActionTools.isKnown([], name))
        return fail(-32_602, `unknown tool ${name}`);
      return reply(await callAny(ctx, edits, name, message.params?.arguments));
    }
    default: {
      if (message.method.startsWith("notifications/")) return null;
      return fail(-32_601, `method ${message.method} is not supported`);
    }
  }
}

function createMcpApp(
  deps: ExportDeps,
  editDeps: EditDeps | null,
  settings: () => McpSettings,
  introspect: Introspect
): Hono {
  const app = new Hono<{ Variables: { key: Resolved | null } }>();
  const clients = new Map<string, string>();
  const keys = createKeyResolver(introspect);
  app.use("*", async (c, next) => {
    const { port, token } = settings();
    const host = c.req.header("host") ?? "";
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`)
      return c.json({ error: "forbidden" }, 403);
    if (c.req.header("origin") !== undefined)
      return c.json({ error: "forbidden" }, 403);
    const auth = c.req.header("authorization") ?? "";
    const unauthorized = (): Response =>
      c.json({ error: "unauthorized" }, 401, {
        "www-authenticate": "Bearer",
      });
    if (!auth.startsWith("Bearer ")) return unauthorized();
    const bearer = auth.slice(7);
    if (isSameText(bearer, token)) {
      c.set("key", null);
      return next();
    }
    const resolution = await keys.resolve(bearer);
    if (resolution.kind === "denied") return unauthorized();
    if (resolution.kind === "offline") return c.json({ error: "offline" }, 503);
    c.set("key", resolution.resolved);
    return next();
  });
  app.post("/mcp", async (c) => {
    const length = Number(c.req.header("content-length") ?? "0");
    if (length > MAX_BODY) return c.json({ error: "too large" }, 413);
    const raw = await c.req.text();
    if (raw.length > MAX_BODY) return c.json({ error: "too large" }, 413);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32_700, message: "parse error" },
        },
        400
      );
    }
    const batch = Array.isArray(parsed);
    const messages = (batch ? parsed : [parsed]) as RpcMessage[];
    let session: string | null = null;
    const key = c.get("key");
    const ctx: Dispatch = {
      deps,
      edits: settings().edits ? editDeps : null,
      client:
        key?.client ??
        clients.get(c.req.header("mcp-session-id") ?? "") ??
        DEFAULT_CLIENT,
      key,
      startSession: (named) => {
        const client = key?.client ?? named;
        session = randomBytes(16).toString("hex");
        clients.set(session, client);
        if (clients.size > MAX_SESSIONS)
          clients.delete(clients.keys().next().value as string);
      },
    };
    const replies = (
      await Promise.all(
        messages.map((m) =>
          dispatch(ctx, typeof m === "object" && m !== null ? m : {})
        )
      )
    ).filter((r): r is RpcReply => r !== null);
    const headers: Record<string, string> = session
      ? { "mcp-session-id": session }
      : {};
    if (replies.length === 0) return c.body(null, 202, headers);
    return c.json(batch ? replies : replies[0], 200, headers);
  });
  app.all("/mcp", (c) => c.body(null, 405, { allow: "POST" }));
  app.notFound((c) => c.json({ error: "not found" }, 404));
  return app;
}

export interface McpWiring {
  edits: EditDeps | null;
  introspect: Introspect;
  listener: McpListenerRunnerApi | null;
}

export interface McpService {
  status(): Promise<McpStatus>;
  setEnabled(enabled: boolean): Promise<McpStatus>;
  setEdits(edits: boolean): Promise<McpStatus>;
  editsOn(): Promise<boolean>;
  rotate(): Promise<McpStatus>;
  boot(): Promise<void>;
  stop(): Promise<void>;
}

export function createMcpService(
  dataDir: string,
  deps: ExportDeps,
  wiring: McpWiring
): McpService {
  const { edits, introspect, listener } = wiring;
  let current: McpSettings | null = null;
  let lastError: string | null = null;
  const app = createMcpApp(
    deps,
    edits,
    () => current as McpSettings,
    introspect
  );

  const load = async (): Promise<McpSettings> => {
    current ??= await readMcpSettings(dataDir);
    return current;
  };

  const isListening = async (): Promise<boolean> => {
    if (listener === null) return false;
    return Effect.runPromise(listener.isListening());
  };

  const stop = async (): Promise<void> => {
    if (listener !== null) await Effect.runPromise(listener.close());
  };

  const start = async (): Promise<void> => {
    if (listener === null) throw new Error("The MCP listener is not ready.");
    const settings = await load();
    if (await isListening()) return;
    if (!(await isPortFree(settings.port))) {
      settings.port = await getFreePort();
      await writeMcpSettings(dataDir, settings);
    }
    await Effect.runPromise(listener.listen(settings.port, app.fetch));
  };

  const status = async (): Promise<McpStatus> => {
    const settings = await load();
    const url = `http://127.0.0.1:${settings.port}/mcp`;
    const command = `claude mcp add --scope user --transport http ${SERVER_NAME} ${url} --header "Authorization: Bearer ${settings.token}"`;
    return {
      enabled: settings.enabled,
      edits: settings.edits,
      running: await isListening(),
      url: settings.enabled ? url : null,
      command: settings.enabled ? command : null,
      error: lastError,
    };
  };

  return {
    status,
    async setEnabled(enabled) {
      const settings = await load();
      settings.enabled = enabled;
      await writeMcpSettings(dataDir, settings);
      lastError = null;
      try {
        if (enabled) await start();
        else await stop();
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      return status();
    },
    async setEdits(on) {
      const settings = await load();
      settings.edits = on;
      await writeMcpSettings(dataDir, settings);
      return status();
    },
    async editsOn() {
      const settings = await load();
      return settings.enabled && settings.edits;
    },
    async rotate() {
      const settings = await load();
      settings.token = newToken();
      await writeMcpSettings(dataDir, settings);
      return status();
    },
    async boot() {
      const settings = await load();
      if (!settings.enabled) return;
      await start().catch((error: unknown) => {
        lastError = error instanceof Error ? error.message : String(error);
        console.error("[mcp] could not start", error);
      });
    },
    stop,
  };
}

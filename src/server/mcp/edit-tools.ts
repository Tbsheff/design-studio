import { FLOW_TOOLS } from './flow-tools.js';
import { FRAME_STATE_TOOLS } from './frame-state-tools.js';
import { COMMENT_TOOLS } from './comment-tools.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { STRUCTURE_OPS, TOKENS_FILE, type AppServerStatus, type CompiledTokenEntry, type SelectionContext, type DesignComment, type DesignSystemState, type DirectEditResult, type PackSummary, type SourceLoc, type Project, type StructureEditResult, type UpdateTokensResult, type Version } from '../../shared/contracts.js';
import { COMMENT_TEXT_MAX, targetFromSelection } from '../../shared/comments.js';
import { EXPORT_FRAME_MAX_SIDE, EXPORT_MAX_FRAMES, type HandoffResult } from '../../shared/export.js';
import { canvasList, canvasPlace, findFrame, frameRef, placeSchema, type CanvasToolContext, type PlaceSpec } from '../canvas/tools.js';
import { publishVersion } from '../direct-edit/index.js';
import type { ActivityDraft } from './activity.js';
import { editSummary, frameName, placedFrames, placeSummary, versionName } from './activity-text.js';
import { approve, EditError, loadTarget, oneLine, outputFolder, refuseWhileRunning, short, studioCall, studioFile, writeUnique, type EditDeps } from './edit-deps.js';
import { base, checkWritePath, classes, variant, directionId, hasClasses, id, ok, packId, pagePath, pageUrl, parseInput, PATH_MAX, plain, projectId, selector, sourceElement, style, versionActivity, writeText, type Done, type Meta, type ToolSpec } from './edit-kit.js';
import { describeElement, textHintsOf } from './element.js';
import { PENDING_VERSION, savedVersionId, savesSettled } from '../direct-edit/save-queue.js';
import { mcpErrorText } from './error-copy.js';
import { FolderError, safeFolder } from './folders.js';
import { HISTORY_TOOLS } from './history-tools.js';
import { LIBRARY_TOOLS } from './library-tools.js';
import { LINK_TOOLS } from './link-tools.js';
import { SHIP_TOOLS } from './ship-tools.js';
import { VARIANT_TOOLS } from './variant-tools.js';
import { PROPS_TOOLS } from './props-tools.js';
import { STYLE_TOOLS } from './style-tools.js';
import { REVIEW_TOOLS } from './review-tools.js';
import { RULES_TOOLS } from './rules-tools.js';
import { INSERT_TOOLS } from './insert-tools.js';
import { JSX_INSERT_TOOLS } from './jsx-insert-tools.js';
import { LAYER_TOOLS } from './layer-tools.js';
import { ARRANGE_TOOLS } from './arrange-tools.js';
import { CONTEXT_TOOLS } from './context-tools.js';
import { DOCTOR_TOOLS } from './doctor-tools.js';
import { COMPONENT_PREVIEW_TOOLS } from './component-preview-tools.js';
import { SHARE_TOOLS } from './share-tools.js';
import { cleanRoute, routeLabel, sharedSourceOf } from '../../shared/app.js';
import { chooseEditSite, EDIT_TARGETS, editedAtLabel, locText, siteNote, siteRequest, textComesFromData, type EditSite } from '../direct-edit/edit-site.js';
import type { ToolDef, ToolResult } from './tools.js';
import { attachReadiness, firstVersionBlock, type AttachResponse } from '../app/first-version.js';
import { sameFolderOrRoot, workspaceFields, workspaceOf } from './workspace-tools.js';
import { COMPONENT_CREATE_TOOLS } from './component-create-tools.js';
import { SELECT_TOOLS } from './select-tools.js';

const FILE_MAX = 512 * 1024;
const viewport = z.enum(['desktop', 'tablet', 'mobile']);

const schemas = {
  canvas_list: z.object({ projectId, directionId }).strict(),
  canvas_place: z.object({ projectId, directionId, frames: z.array(placeSchema).min(1).max(12) }).strict(),
  canvas_point: z.object({ projectId, directionId, frame: frameRef.describe('Frame id or @label.'), selector: z.string().max(400).optional() }).strict(),
  add_frame: z
    .object({
      projectId,
      directionId,
      path: pagePath,
      viewport: viewport.optional().describe('desktop 1440x900, tablet 768x1024 or mobile 390x844. Default desktop.'),
      width: z.number().int().min(200).max(4000).optional(),
      height: z.number().int().min(200).max(4000).optional(),
      label: z.string().max(40).optional().describe('Short frame name, for example "Empty state".'),
      rightOf: frameRef.optional().describe('Put the new frame to the right of this frame (id or @label).'),
      below: frameRef.optional().describe('Put the new frame under this frame (id or @label).'),
    })
    .strict(),
  remove_frame: z.object({ projectId, frame: frameRef.describe('Frame id or @label.') }).strict(),
  write_file: z
    .object({
      projectId,
      directionId,
      path: z.string().trim().min(1).max(PATH_MAX).describe('File path relative to the project folder, for example "index.html" or "styles/site.css".'),
      content: z.string().max(FILE_MAX).describe('The full new text of the file.'),
    })
    .strict(),
  edit_element: z
    .object({
      projectId,
      directionId,
      path: pagePath,
      selector: selector.describe('CSS selector of one element on the page.'),
      style: style.optional().describe('CSS properties to set, as kebab-case (margin-left) or camelCase (marginLeft) keys. null removes the property. In a Tailwind project the server writes theme classes (p-6, bg-primary, rounded-lg) instead of inline style, and an arbitrary value only when no theme step fits.'),
      text: z.string().max(5000).optional().describe('New text content of the element.'),
      classes: classes.optional(),
      target: z.enum(EDIT_TARGETS).optional().describe('Attached apps only. Leave out: an element that is the outer element of a shared component use (such as <Button> or <CardTitle> from packages/ui) is edited where it is used (its className prop and text in the page file), so only this use changes; other elements are edited in their own file. "component" edits the element in the shared component file, which changes every use ("element" is the same). "use" asks for the use site and fails when there is none.'),
      variant: variant.optional(),
      op: z.enum(STRUCTURE_OPS).optional().describe('Structure edit instead of style/text: delete, duplicate, wrap (in a flex column frame), group (in a plain <div data-name="Group"> with no layout, like Cmd+G), unwrap (keep the children, drop the element; also ungroups) or move (into targetSelector, as its last child).'),
      targetSelector: selector.optional().describe('For op move: CSS selector of the new parent element.'),
      also: z.array(z.object({ selector: selector.describe('CSS selector or layer id.') }).strict()).min(1).max(49).optional().describe('With op: more elements to change in the same edit, like a multi-select in the studio. For group and wrap they must be siblings in one file. Layer ids from select_matching work here.'),
    })
    .strict()
    .refine((input) => input.also === undefined || input.op !== undefined, 'also needs op')
    .refine((input) => (input.op === undefined ? input.text !== undefined || hasClasses(input) || Object.keys(input.style ?? {}).length > 0 : input.text === undefined && input.style === undefined && input.classes === undefined && input.variant === undefined), 'pass style, text or classes, or op alone')
    .refine((input) => (input.op === 'move') === (input.targetSelector !== undefined), 'op move needs targetSelector; other ops take none')
    .refine((input) => input.target !== 'use' || input.op === undefined, 'target use takes style, classes or text, not op'),
  add_comment: z
    .object({
      projectId,
      directionId,
      path: pagePath,
      selector: selector.optional().describe('CSS selector of the element. Leave out for a comment on the whole frame.'),
      text: z.string().trim().min(1).max(COMMENT_TEXT_MAX),
    })
    .strict(),
  reply_comment: z.object({ projectId, directionId, commentId: id('Comment id from add_comment.'), text: z.string().trim().min(1).max(COMMENT_TEXT_MAX) }).strict(),
  resolve_comment: z.object({ projectId, directionId, commentId: id('Comment id from add_comment.') }).strict(),
  create_project: z
    .object({
      name: z.string().trim().min(1).max(120).describe('Project name.'),
      kind: z.enum(['html', 'react']).default('html').describe('html (static pages) or react (Vite + React). Default html.'),
      designSystemId: packId.optional().describe('Design system (pack) id to apply. Leave out for none.'),
    })
    .strict(),
  restore_version: z.object({ projectId, directionId, versionId: id('Version id from list_versions.') }).strict(),
  attach_app: z
    .object({
      folder: z.string().trim().min(1).max(4096).describe('Absolute path of the app folder or the monorepo root, for example "~/code/my-app".'),
      url: z.string().trim().max(300).optional().describe('URL of a dev server you already run, for example "http://localhost:3000". Leave out and the studio starts next dev itself.'),
      appDir: z.string().trim().max(300).optional().describe('App folder inside a monorepo, for example "apps/dashboard". Needed when the folder has more than one Next.js app.'),
      name: z.string().trim().min(1).max(120).optional(),
    })
    .strict(),
  add_route_frame: z
    .object({
      projectId,
      route: z.string().trim().min(1).max(PATH_MAX).describe('App route from list_routes with the dynamic segments filled in, for example "/design-system" or "/patients/123".'),
      viewport: viewport.optional().describe('desktop 1440x900, tablet 768x1024 or mobile 390x844. Default desktop.'),
      label: z.string().max(40).optional(),
      rightOf: frameRef.optional(),
      below: frameRef.optional(),
    })
    .strict(),
  apply_design_system: z.object({ projectId, directionId, packId: packId.describe('Design system (pack) id.') }).strict(),
  set_token: z
    .object({
      projectId,
      directionId,
      name: z.string().trim().min(3).max(120).describe('Token CSS variable from get_tokens, for example "--primary", or its path, for example "color.primary".'),
      value: z.string().trim().min(1).max(400).describe('New value, for example "#015A5D" or "var(--color-brand-teal-500)".'),
      theme: z.enum(['light', 'dark']).default('light').describe('light changes the main declaration. dark changes (or adds) the dark declaration. Default light.'),
    })
    .strict(),
  export: z
    .object({
      projectId,
      directionId,
      versionId: id('Version id. Leave out for the newest version of the direction.').optional(),
      format: z.enum(['png', 'html', 'pdf', 'handoff', 'zip']).describe('png, html, pdf, handoff (folder for a coding agent, as a zip) or zip (source files).'),
      scale: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1).describe('PNG pixel scale.'),
      frames: z
        .array(z.object({ name: z.string().max(60).optional(), width: z.number().int().min(1).max(EXPORT_FRAME_MAX_SIDE), height: z.number().int().min(1).max(EXPORT_FRAME_MAX_SIDE), path: z.string().max(200).optional() }).strict())
        .min(1)
        .max(EXPORT_MAX_FRAMES)
        .optional()
        .describe('Frames to capture. Default one 1440x900 frame (handoff: desktop and mobile).'),
      folder: z.string().min(1).max(4096).optional().describe('Absolute path of an existing folder. Leave out for ~/Downloads. Another folder outside the projects folder waits for the user to approve it in Design Studio.'),
    })
    .strict(),
};

type Name = keyof typeof schemas;
type Input<N extends Name> = z.output<(typeof schemas)[N]>;

const META: Record<Name, Meta> = {
  canvas_list: { title: 'List canvas frames', description: 'List the frames on the studio canvas of a project: id, label, page, size and position, plus what the user has selected and which frame is live.', readOnly: true, idempotent: true },
  canvas_place: { title: 'Place canvas frames', description: 'Add or move frames on the studio canvas. Pass { frames: [...] }, applied in order. Each item: frame (id or @label to move; leave out to add), label, path, viewport or width/height, and one of below / rightOf / leftOf / above (another frame) with gap, or absolute x/y. Returns the placed frames and overlap warnings.' },
  canvas_point: { title: 'Point at a canvas frame', description: 'Show the user a small badge on the canvas that says you are pointing at one frame (and an optional CSS selector). The view moves only when the user clicks Show, so the result always has shown: false. badge: true means a studio window has the project open and the user sees the badge.', readOnly: true, idempotent: true },
  add_frame: { title: 'Add frame', description: 'Add a frame for a page or a state (path + viewport) to the canvas, to the right of all frames unless you pass rightOf or below.' },
  remove_frame: { title: 'Remove frame', description: 'Remove one frame from the canvas. The page file stays.', destructive: true, idempotent: true },
  write_file: { title: 'Write file', description: 'Write or replace one text file in the project folder and save it as a version labelled "Edit by <client>", so the user can undo it. The same path rules as the studio agent apply: no .studio/, no files outside the project, no build config files, no generated design-system/tokens.css.' },
  edit_element: { title: 'Edit element', description: 'Change the style, the Tailwind classes or the text of one element, found by CSS selector on a page, with the same code path as the studio inspector. In a Tailwind project style changes become theme classes; the result lists the classes and says when the edit fell back to inline style. Pass variant ("md:", "hover:", "md:hover:", "dark:") to set the style for a breakpoint or state only. Or pass op to delete, duplicate, wrap in an auto layout frame, unwrap, or move the element into targetSelector, with the same code path as the studio layers and canvas menu. The ops refuse elements made by .map(), a condition or a function call. Text that comes from a prop, a literal array or object (also through .map()), a constant, a default prop value or an i18n messages JSON key changes where it is written, and textSource in the result says where; text from fetched or runtime data is refused with the reason. In an attached app, the outer element of a shared component use (such as <Button>, <Badge> or <CardTitle> from packages/ui) is edited where it is used by default: its className prop and text in the page file, so only this use changes; target "component" edits the component file and changes every use. The result says which file and line changed (at, editedAt). The source file changes and a version is saved, so the user can undo it.' },
  add_comment: { title: 'Add comment', description: 'Pin a comment on an element (CSS selector) or on the whole frame. The comment shows your client name. It does not send anything to the studio agent.' },
  reply_comment: { title: 'Reply to comment', description: 'Add a reply to a pinned comment.' },
  resolve_comment: { title: 'Resolve comment', description: 'Mark a pinned comment as resolved.', idempotent: true },
  create_project: { title: 'Create project', description: 'Create an empty design project in the default projects folder. Returns the project id and the direction id.' },
  attach_app: { title: 'Attach app', description: 'Open an existing Next.js app (or a monorepo with apps/*) as a project. The project points at the folder; nothing is copied. With url the studio proxies your running dev server; without it the studio starts next dev on a free port. A folder that is not attached yet waits for the user to approve it in Design Studio. Returns the project id. Edits from the studio agent and write_file then go to the real files in that folder. A Next.js app folder inside a monorepo (pnpm-workspace.yaml, turbo.json or package.json workspaces) opens at the workspace root with that folder as appDir, so the shared kit, Tailwind CSS and root DESIGN.md are found; the result has workspaceRoot and appDir (workspaceRoot is null outside a monorepo).' },
  add_route_frame: { title: 'Add route frame', description: 'Add a canvas frame that shows one route of an attached app at a viewport. get_screenshot with the returned frame id renders it. On a canvas with no saved frames, the first route frame is f1 and replaces the default entry-page frame.' },
  restore_version: { title: 'Restore version', description: 'Make an older version the current design of a direction. Saved as a new version.', destructive: true },
  apply_design_system: { title: 'Apply design system', description: 'Apply a design system to a direction. This overwrites the tokens, tokens.css and DESIGN.md (project notes stay) as one new version.', destructive: true },
  set_token: { title: 'Set token', description: 'Change one design token value with the same code path as the studio Tokens panel. In a studio design system it edits tokens.json. In an imported app folder it rewrites only that declaration in the app CSS file (for example the Tailwind @theme, :root or .dark block). A version is saved.' },
  export: { title: 'Export', description: 'Export a version as PNG, HTML, PDF, a handoff zip or a source zip and write the files to a folder. Returns the file paths. Default folder ~/Downloads. A folder outside Downloads and the projects folder waits for the user to approve it in Design Studio.' },
};

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>;
  return rest;
}

const EXTRA_TOOLS: ToolSpec[] = [...HISTORY_TOOLS, ...LIBRARY_TOOLS, ...LINK_TOOLS, ...SHIP_TOOLS, ...VARIANT_TOOLS, ...PROPS_TOOLS, ...STYLE_TOOLS, ...REVIEW_TOOLS, ...INSERT_TOOLS, ...FRAME_STATE_TOOLS, ...JSX_INSERT_TOOLS, ...LAYER_TOOLS, ...COMMENT_TOOLS, ...FLOW_TOOLS, ...RULES_TOOLS, ...ARRANGE_TOOLS, ...CONTEXT_TOOLS, ...DOCTOR_TOOLS, ...COMPONENT_PREVIEW_TOOLS, ...SHARE_TOOLS, ...COMPONENT_CREATE_TOOLS, ...SELECT_TOOLS];
const EXTRA_BY_NAME = new Map(EXTRA_TOOLS.map((tool) => [tool.name, tool]));

export const RENDER_WAIT_TOOLS = new Set(['edit_element', 'batch_edit', 'set_props', 'insert_component', 'insert_jsx', 'clear_text', 'write_file', 'apply_fix', 'replace_style', 'undo', 'redo', 'set_token', 'create_component', 'swap_instance']);
const WAIT_PROPERTY = { type: 'string', enum: ['render'], description: 'Leave out to get the result as soon as the file is written and saved as a version; the app rebuilds in the background, and get_screenshot, get_layers and review_frame wait for that rebuild. "render": also wait until the dev server has rebuilt the page.' };

function withWait(name: string, schema: Record<string, unknown>): Record<string, unknown> {
  if (!RENDER_WAIT_TOOLS.has(name)) return schema;
  return { ...schema, properties: { ...((schema.properties as Record<string, unknown> | undefined) ?? {}), wait: WAIT_PROPERTY } };
}

function toolDef(name: string, schema: z.ZodType, meta: Meta): ToolDef {
  return { name, title: meta.title, description: meta.description, inputSchema: withWait(name, jsonSchema(schema)), annotations: { readOnlyHint: meta.readOnly === true, destructiveHint: meta.destructive === true, idempotentHint: meta.idempotent === true, openWorldHint: false } };
}

export const EDIT_TOOLS: ToolDef[] = [...(Object.keys(schemas) as Name[]).map((name) => toolDef(name, schemas[name], META[name])), ...EXTRA_TOOLS.map((tool) => toolDef(tool.name, tool.schema, tool.meta))];

export const EDIT_NAMES = new Set<string>([...Object.keys(schemas), ...EXTRA_BY_NAME.keys()]);

function parse<N extends Name>(name: N, args: Record<string, unknown>): Input<N> {
  return parseInput(schemas[name], args) as Input<N>;
}

async function packOf(deps: EditDeps, id: string): Promise<PackSummary> {
  const pack = (await studioCall<PackSummary[]>(deps, 'GET', '/api/packs')).find((item) => item.id === id);
  if (!pack) throw new EditError(`unknown design system ${id}`);
  return pack;
}

async function canvasContext(deps: EditDeps, input: { projectId: string; directionId?: string }): Promise<CanvasToolContext> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  return { canvas: deps.canvas, project, direction, mode: 'edit', plan: false };
}

async function busyCanvas(deps: EditDeps, input: { projectId: string; directionId?: string }): Promise<CanvasToolContext> {
  const ctx = await canvasContext(deps, input);
  refuseWhileRunning(deps, ctx.project, ctx.direction);
  return ctx;
}

async function pointFrame(deps: EditDeps, ctx: CanvasToolContext, ref: string, sel: string | undefined, client: string): Promise<ToolResult> {
  const frames = (await ctx.canvas.read(ctx.project)).canvas?.frames ?? [];
  const first = frames.length === 0 && ref === 'f1';
  const frame = first ? null : findFrame(frames, ref);
  if (!frame && !first) throw new EditError(`No frame ${ref}. Call canvas_list for the ids and labels.`);
  const frameId = frame?.id ?? 'f1';
  deps.bus.emit({ type: 'mcp.point', projectId: ctx.project.id, directionId: ctx.direction.id, point: { client, frameId, label: frame?.label ?? frame?.path ?? null, ...(sel ? { selector: sel } : {}), at: Date.now() } });
  const badge = deps.canvas.presence(ctx.project.id) !== null;
  const note = badge ? 'The user sees a badge with a Show button. The view moves only if they click it.' : 'No studio window has this project open, so nobody saw the badge. Tell the user which frame to look at.';
  return ok({ frame: frameId, label: frame?.label ?? null, page: frame?.path ?? '(entry page)', ...(sel ? { selector: sel } : {}), shown: false, badge, note });
}

async function placeWithActivity(ctx: CanvasToolContext, specs: PlaceSpec[], verb: string, options: { seed?: boolean } = {}): Promise<Done> {
  const before = (await ctx.canvas.read(ctx.project)).canvas?.frames ?? [];
  const result = await canvasPlace(ctx, specs, options);
  if (result.isError) return { result };
  const after = (await ctx.canvas.read(ctx.project)).canvas?.frames ?? [];
  const placed = placedFrames(specs, before, after);
  return { result, activity: { projectId: ctx.project.id, directionId: ctx.direction.id, summary: placeSummary(verb, specs, placed, after), frameId: placed[0]?.id ?? null } };
}

async function addFrame(deps: EditDeps, input: Input<'add_frame'>): Promise<Done> {
  const ctx = await busyCanvas(deps, input);
  const spec = { ...(input.path ? { path: input.path } : {}), viewport: input.viewport ?? 'desktop', ...(input.width ? { width: input.width } : {}), ...(input.height ? { height: input.height } : {}), ...(input.label ? { label: input.label } : {}), ...(input.rightOf ? { rightOf: input.rightOf } : {}), ...(input.below ? { below: input.below } : {}) };
  return placeWithActivity(ctx, [spec], 'Added');
}

async function removeFrame(deps: EditDeps, input: Input<'remove_frame'>): Promise<Done> {
  const ctx = await busyCanvas(deps, input);
  let removed: string | null = null;
  let name = input.frame;
  await deps.canvas.update(
    ctx.project,
    (file) => {
      const frame = findFrame(file.frames, input.frame);
      if (!frame) return null;
      if (file.frames.length === 1) throw new EditError('The canvas needs at least one frame.');
      removed = frame.id;
      name = frameName(frame, input.frame);
      return { ...file, frames: file.frames.filter((item) => item.id !== frame.id) };
    },
    { source: 'agent' },
  );
  if (!removed) throw new EditError(`No frame ${input.frame}. Call canvas_list for the ids and labels.`);
  return { result: ok({ removed, note: 'The page file stays in the project.' }), activity: { projectId: ctx.project.id, directionId: ctx.direction.id, summary: `Removed ${name}`, frameId: removed } };
}

const FIRST_VERSION_WAIT_MS = 20_000;

async function writeProjectFile(deps: EditDeps, input: Input<'write_file'>, client: string): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  refuseWhileRunning(deps, project, direction);
  const relative = checkWritePath(project, direction.workTree, input.path);
  const file = path.join(direction.workTree, ...relative.split('/'));
  const before = await readFile(file, 'utf8').catch(() => null);
  if (before === input.content) return plain(ok({ path: relative, changed: false, versionId: direction.headVersionId }));
  const blocked = await firstVersionBlock(project, FIRST_VERSION_WAIT_MS);
  if (blocked) throw new EditError(blocked);
  await writeText(file, input.content);
  const version = await deps.versions.commitFile(project, direction, relative, `Edit by ${client}`, { kind: 'manual', prompt: `Edit by ${client}: ${relative}` });
  if (version && before !== null) deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: [{ file, relative, before, after: input.content }] });
  if (version) await publishVersion({ bus: deps.bus, projects: deps.projects, versions: deps.versions, runner: deps.runner }, project, direction, version);
  const result = ok({ path: relative, changed: true, created: before === null, versionId: version?.id ?? null, title: version?.title ?? null });
  return { result, activity: versionActivity(project, direction, `${before === null ? 'Created' : 'Wrote'} ${relative}`, version) };
}

const OP_WORDS = { delete: 'Deleted', duplicate: 'Duplicated', wrap: 'Wrapped', unwrap: 'Unwrapped', move: 'Moved', clear: 'Cleared text in', group: 'Grouped' } as const;

async function structureElement(deps: EditDeps, input: Input<'edit_element'>, op: NonNullable<Input<'edit_element'>['op']>): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  refuseWhileRunning(deps, project, direction);
  const url = await pageUrl(deps, project, direction, input.path);
  const element = await sourceElement(deps, url, input.selector);
  const parent = input.targetSelector ? await sourceElement(deps, url, input.targetSelector) : null;
  const more = await Promise.all((input.also ?? []).map(async (item) => ({ item, found: await sourceElement(deps, url, item.selector) })));
  const targets = [{ source: element.source, selector: input.selector, tag: element.tag }, ...more.map(({ item, found }) => ({ source: found.source, selector: item.selector, tag: found.tag }))];
  const body = { op, targets, ...(parent ? { into: { source: parent.source, selector: input.targetSelector, tag: parent.tag } } : {}) };
  const result = await studioCall<StructureEditResult>(deps, 'POST', `${base(project, direction.id)}/direct-edit`, body);
  const summary = `${OP_WORDS[op]} ${targets.length > 1 ? `${targets.length} elements` : element.tag}${parent ? ` into ${parent.tag}` : ''}`;
  return { result: ok({ files: result.files, versionId: result.version.id, title: result.version.title, select: result.select }), activity: versionActivity(project, direction, summary, result.version) };
}

type SourcedElement = SelectionContext & { source: SourceLoc };

function editBody(input: Input<'edit_element'>, element: SelectionContext, site: EditSite) {
  return { ...siteRequest(site), selector: input.selector, ...(input.style && Object.keys(input.style).length > 0 ? { style: input.style } : {}), ...(input.text !== undefined ? { text: input.text, hints: textHintsOf(element) } : {}), ...(hasClasses(input) ? { classes: input.classes } : {}), ...(input.variant ? { variant: input.variant } : {}) };
}

function isTextOnly(input: Input<'edit_element'>): boolean {
  return input.text !== undefined && !hasClasses(input) && Object.keys(input.style ?? {}).length === 0;
}

async function postEdit(deps: EditDeps, url: string, input: Input<'edit_element'>, element: SourcedElement, site: EditSite, workTree: string, project: Project): Promise<DirectEditResult> {
  try {
    return await studioCall<DirectEditResult>(deps, 'POST', url, editBody(input, element, site));
  } catch (error) {
    if (!(error instanceof EditError) || site.kind !== 'use' || site.explicit || error.code !== 'text_not_editable' || !isTextOnly(input)) throw error;
    if (!(await textComesFromData({ workTree, project }, element.source))) throw error;
    const component: EditSite = { kind: 'component', source: element.source, tag: element.tag, shared: site.shared, explicit: false };
    return studioCall<DirectEditResult>(deps, 'POST', url, editBody(input, element, component)).catch(() => {
      throw error;
    });
  }
}

function editedAt(result: DirectEditResult, site: EditSite): string {
  if (result.textSource) return `${result.textSource.file}:${result.textSource.line}`;
  return site.kind === 'use' || result.file === site.source.file ? locText(site.source) : result.file;
}

async function editElement(deps: EditDeps, input: Input<'edit_element'>): Promise<Done> {
  if (input.op) return structureElement(deps, input, input.op);
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  refuseWhileRunning(deps, project, direction);
  const element = await sourceElement(deps, await pageUrl(deps, project, direction, input.path), input.selector);
  const site = await chooseEditSite({ workTree: direction.workTree, project }, element, { selector: input.selector, target: input.target, classes: hasClasses(input) || Object.keys(input.style ?? {}).length > 0 });
  if ('error' in site) throw new EditError(site.error);
  const result = await postEdit(deps, `${base(project, direction.id)}/direct-edit`, input, element, site, direction.workTree, project);
  const note = siteNote(site);
  const tailwind = result.tailwind ? { classes: result.tailwind.classes, wrote: result.tailwind.mode, ...(result.tailwind.note ? { note: result.tailwind.note } : {}) } : {};
  const source = result.textSource ? { textSource: `Edited ${result.textSource.what} in ${result.textSource.file}:${result.textSource.line}.${result.textSource.shared ? ` ${result.textSource.shared}` : ''}` } : {};
  const where = { file: result.file, at: editedAt(result, site), editedAt: editedAtLabel(site), ...(note ? { [site.kind === 'use' ? 'use' : 'shared']: note } : {}) };
  return { result: ok({ ...where, versionId: result.version.id, title: result.version.title, applied: result.applied, ...tailwind, ...source }), activity: versionActivity(project, direction, editSummary(element.tag, input.style, input.text, hasClasses(input)), result.version) };
}

function frameTarget(): DesignComment['target'] {
  return { selector: 'body', sourceLoc: null, tag: 'body', textSnippet: '', rectHint: { x: 0, y: 0, width: 1440, height: 900 } };
}

async function addComment(deps: EditDeps, input: Input<'add_comment'>, client: string): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  const context = input.selector ? await describeElement(deps.preview, await pageUrl(deps, project, direction, input.path), input.selector) : null;
  if (input.selector && !context) throw new EditError(`No element matches ${input.selector} on the page.`);
  const target = context ? targetFromSelection(context) : frameTarget();
  const comment = await studioCall<DesignComment>(deps, 'POST', `${base(project, direction.id)}/comments`, { text: input.text, target, ...(context ? { context } : {}), status: 'draft', author: client, frame: { path: input.path ?? '' } });
  const summary = `Added comment #${comment.n}${context ? ` on ${context.tag}` : ''}`;
  return { result: ok({ commentId: comment.id, number: comment.n, frameLevel: !context, author: comment.author ?? client }), activity: { projectId: project.id, directionId: direction.id, summary } };
}

async function replyComment(deps: EditDeps, input: Input<'reply_comment'>, client: string): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  const comment = await studioCall<DesignComment>(deps, 'POST', `${base(project, direction.id)}/comments/${encodeURIComponent(input.commentId)}/replies`, { text: input.text, author: client });
  return { result: ok({ commentId: comment.id, replies: comment.replies?.length ?? 0 }), activity: { projectId: project.id, directionId: direction.id, summary: `Replied to comment #${comment.n}` } };
}

async function resolveComment(deps: EditDeps, input: Input<'resolve_comment'>): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  const comment = await studioCall<DesignComment>(deps, 'PATCH', `${base(project, direction.id)}/comments/${encodeURIComponent(input.commentId)}`, { status: 'resolved' });
  return { result: ok({ commentId: comment.id, status: comment.status }), activity: { projectId: project.id, directionId: direction.id, summary: `Resolved comment #${comment.n}` } };
}

async function createProject(deps: EditDeps, input: Input<'create_project'>): Promise<Done> {
  const pack = input.designSystemId ? await packOf(deps, input.designSystemId) : null;
  const created = await studioCall<{ project: Project }>(deps, 'POST', '/api/projects', { prompt: input.name, name: input.name, kind: input.kind, startRun: false, ...(pack ? { packId: pack.id } : {}) });
  const main = created.project.directions.find((d) => d.id === 'main') ?? created.project.directions[0];
  const result = ok({ projectId: created.project.id, directionId: main?.id ?? null, name: created.project.name, folder: main?.workTree ?? null, designSystem: pack?.id ?? null });
  return { result, activity: { projectId: created.project.id, directionId: main?.id ?? null, summary: `Created project ${oneLine(created.project.name, 60)}` } };
}

async function attachApp(deps: EditDeps, input: Input<'attach_app'>, client: string): Promise<Done> {
  const folder = await safeFolder(input.folder, deps.dataDir);
  const workspace = input.appDir ? null : await workspaceOf(folder);
  const known = (await deps.projects.list()).some((project) => project.app && sameFolderOrRoot(project, folder, workspace));
  const scope = workspace ? `the ${workspace.name} monorepo at ${workspace.root} (this folder is its app ${workspace.appDir})` : 'this folder';
  if (!known) await approve(deps, { tool: 'attach_app', action: 'Attach an app folder so edits write to its real files', projectId: null, client, title: `${client} wants to attach ${oneLine(folder, 160)}`, detail: `The studio agent and write_file can then change the real files in ${scope}.` });
  const { project, firstVersion, legacyCanvas } = await studioCall<AttachResponse>(deps, 'POST', '/api/projects/attach', { folder, ...(input.url ? { url: input.url } : {}), ...(input.appDir ? { appDir: input.appDir } : {}), ...(input.name ? { name: input.name } : {}) });
  const main = project.directions[0];
  const state = await studioCall<{ status: AppServerStatus | null }>(deps, 'GET', `/api/projects/${encodeURIComponent(project.id)}/app`).catch(() => ({ status: null }));
  const server = state.status ? { state: state.status.state, upstream: state.status.upstream, message: state.status.message } : null;
  const result = ok({ projectId: project.id, directionId: main?.id ?? null, name: project.name, folder: main?.workTree ?? null, app: project.app, ...workspaceFields(project, folder), server, ...attachReadiness(firstVersion, legacyCanvas), next: server?.state === 'failed' ? 'The dev server is not running. Fix the problem in server.message; the studio tries again on the next attach_app call or preview load.' : 'Call list_routes, then add_route_frame.' });
  return { result, activity: { projectId: project.id, directionId: main?.id ?? null, summary: `Attached ${oneLine(project.name, 60)}` } };
}

async function addRouteFrame(deps: EditDeps, input: Input<'add_route_frame'>): Promise<Done> {
  const ctx = await busyCanvas(deps, input);
  if (!ctx.project.app) throw new EditError('This project is not an attached app. Use add_frame.');
  const route = cleanRoute(input.route);
  if (route === null || /\[|\]/.test(route)) throw new EditError(`Route ${input.route} is not a page path. Fill in dynamic segments like [id] first.`);
  const spec = { path: route.replace(/^\/+/, ''), viewport: input.viewport ?? 'desktop', label: input.label ?? routeLabel(route), ...(input.rightOf ? { rightOf: input.rightOf } : {}), ...(input.below ? { below: input.below } : {}) };
  void deps.preview.apps?.ensure(ctx.project).then((upstream) => fetch(new URL(route, upstream), { redirect: 'manual', signal: AbortSignal.timeout(180_000) })).catch(() => undefined);
  return placeWithActivity(ctx, [spec], 'Added', { seed: false });
}

async function restoreVersion(deps: EditDeps, input: Input<'restore_version'>): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  const version = await deps.versions.get(project, input.versionId);
  refuseWhileRunning(deps, project, direction);
  const restored = await studioCall<Version>(deps, 'POST', `${base(project, direction.id)}/restore`, { versionId: version.id });
  return { result: ok({ restored: true, newVersionId: restored.id, title: restored.title, from: version.id }), activity: versionActivity(project, direction, `Restored “${versionName(version)}”`, restored) };
}

async function applyDesignSystem(deps: EditDeps, input: Input<'apply_design_system'>): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  const pack = await packOf(deps, input.packId);
  refuseWhileRunning(deps, project, direction);
  const result = await studioCall<{ version: Version | null; notice: string | null }>(deps, 'POST', `${base(project, direction.id)}/design-system/apply`, { packId: pack.id });
  const output = ok({ applied: pack.id, versionId: result.version?.id ?? null, changedFiles: result.version?.changedFiles ?? [], notice: result.notice });
  return { result: output, activity: versionActivity(project, direction, `Applied ${oneLine(pack.name, 60)}`, result.version) };
}

function tokenReadback(entry: CompiledTokenEntry, theme: 'light' | 'dark') {
  const source = entry.source;
  if (theme === 'dark') return { value: source ? source.darkValue : entry.darkValue, resolved: entry.darkValue, file: source?.file ?? TOKENS_FILE, line: source?.darkLine ?? null };
  return { value: source ? source.value : entry.value, resolved: entry.value, file: source?.file ?? TOKENS_FILE, line: source?.line ?? null };
}

async function setToken(deps: EditDeps, input: Input<'set_token'>): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  refuseWhileRunning(deps, project, direction);
  const url = `${base(project, direction.id)}/design-system`;
  const state = await studioCall<DesignSystemState>(deps, 'GET', url);
  const entry = state.entries.find((item) => item.cssVar === input.name || item.path === input.name);
  if (!entry) throw new EditError(state.entries.length === 0 ? 'This direction has no tokens. Use get_tokens to check.' : `No token ${input.name}. Use get_tokens for the names.`);
  const change = input.theme === 'dark' ? { path: entry.path, darkValue: input.value } : { path: entry.path, value: input.value };
  const result = await studioCall<UpdateTokensResult>(deps, 'POST', `${url}/tokens/update`, { changes: [change] });
  const after = result.state.entries.find((item) => item.path === entry.path) ?? entry;
  const output = ok({ token: entry.cssVar, theme: input.theme, ...tokenReadback(after, input.theme), versionId: result.version.id, changedFiles: result.version.changedFiles });
  return { result: output, activity: versionActivity(project, direction, `Set ${entry.cssVar}${input.theme === 'dark' ? ' (dark)' : ''} to ${oneLine(input.value, 60)}`, result.version) };
}

async function exportFiles(deps: EditDeps, input: Input<'export'>, client: string): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  const versionId = input.versionId ?? direction.headVersionId;
  if (!versionId) throw new EditError('This direction has no saved version yet.');
  const version = await deps.versions.get(project, versionId);
  const { folder, trusted } = await outputFolder(deps, input.folder);
  const format = input.format.toUpperCase();
  if (!trusted) await approve(deps, { tool: 'export', action: 'Export to a folder outside Downloads and the projects folder', projectId: project.id, client, title: `${client} wants to export ${format} to ${oneLine(folder, 160)}`, detail: `${oneLine(project.name)}. This folder is outside Downloads and the projects folder.` });
  const exported = (file: string): ActivityDraft => ({ projectId: project.id, directionId: direction.id, summary: `Exported ${format} to ${oneLine(file, 120)}` });
  const frames = input.frames?.map((frame) => ({ name: frame.name?.trim() || `${frame.width}x${frame.height}`, width: frame.width, height: frame.height, ...(frame.path ? { path: frame.path } : {}) }));
  const pid = encodeURIComponent(project.id);
  if (input.format === 'handoff') {
    const handoff = await studioCall<HandoffResult>(deps, 'POST', `/api/projects/${pid}/handoff`, { versionId: version.id, ...(frames ? { frames } : {}) });
    const zip = await studioFile(deps, 'GET', `/api/projects/${pid}/handoff/${encodeURIComponent(path.basename(handoff.path))}/zip`);
    const file = await writeUnique(folder, zip.name, zip.bytes);
    return { result: ok({ files: [file], versionId: version.id, handoffFiles: handoff.files.length, prompt: short(handoff.prompt, 2000) }), activity: exported(file) };
  }
  const output = await studioFile(deps, 'POST', `/api/projects/${pid}/export`, { format: input.format, versionId: version.id, frames: frames ?? [], scale: input.scale, scope: 'page' });
  const file = await writeUnique(folder, output.name, output.bytes);
  return { result: ok({ files: [file], versionId: version.id, bytes: output.bytes.byteLength, ...(output.note ? { note: output.note } : {}) }), activity: exported(file) };
}

async function runCanvas(deps: EditDeps, name: 'canvas_list' | 'canvas_place' | 'canvas_point' | 'add_frame' | 'remove_frame', args: Record<string, unknown>, client: string): Promise<Done> {
  switch (name) {
    case 'canvas_list':
      return plain(await canvasList(await canvasContext(deps, parse('canvas_list', args))));
    case 'canvas_place': {
      const input = parse('canvas_place', args);
      return placeWithActivity(await busyCanvas(deps, input), input.frames, 'Placed');
    }
    case 'canvas_point': {
      const input = parse('canvas_point', args);
      return plain(await pointFrame(deps, await canvasContext(deps, input), input.frame, input.selector?.trim() || undefined, client));
    }
    case 'add_frame':
      return addFrame(deps, parse('add_frame', args));
    case 'remove_frame':
      return removeFrame(deps, parse('remove_frame', args));
  }
}

async function run(deps: EditDeps, name: string, args: Record<string, unknown>, client: string): Promise<Done> {
  const extra = EXTRA_BY_NAME.get(name);
  if (extra) return extra.run(deps, args, client);
  const tool = name as Name;
  switch (tool) {
    case 'attach_app':
      return attachApp(deps, parse('attach_app', args), client);
    case 'add_route_frame':
      return addRouteFrame(deps, parse('add_route_frame', args));
    case 'canvas_list':
    case 'canvas_place':
    case 'canvas_point':
    case 'add_frame':
    case 'remove_frame':
      return runCanvas(deps, tool, args, client);
    case 'write_file':
      return writeProjectFile(deps, parse('write_file', args), client);
    case 'edit_element':
      return editElement(deps, parse('edit_element', args));
    case 'add_comment':
      return addComment(deps, parse('add_comment', args), client);
    case 'reply_comment':
      return replyComment(deps, parse('reply_comment', args), client);
    case 'resolve_comment':
      return resolveComment(deps, parse('resolve_comment', args));
    case 'create_project':
      return createProject(deps, parse('create_project', args));
    case 'restore_version':
      return restoreVersion(deps, parse('restore_version', args));
    case 'apply_design_system':
      return applyDesignSystem(deps, parse('apply_design_system', args));
    case 'set_token':
      return setToken(deps, parse('set_token', args));
    case 'export':
      return exportFiles(deps, parse('export', args), client);
  }
}

async function recordActivity(deps: EditDeps, name: string, client: string, draft: ActivityDraft): Promise<void> {
  const save = (item: ActivityDraft) => deps.activity.record(name, client, item).then(() => undefined, (error: unknown) => console.error('[mcp] activity not saved', error));
  if (!draft.versionId?.startsWith(PENDING_VERSION)) return save(draft);
  void savesSettled(draft.projectId).then(() => save({ ...draft, versionId: savedVersionId(draft.versionId as string) }));
}

export async function callEditTool(deps: EditDeps, name: string, args: Record<string, unknown>, client: string): Promise<ToolResult> {
  if (!EDIT_NAMES.has(name)) throw new EditError(`unknown tool ${name}`);
  try {
    const done = await run(deps, name, args, client);
    if (done.activity && !done.result.isError) await recordActivity(deps, name, client, done.activity);
    return done.result;
  } catch (error) {
    if (error instanceof EditError || error instanceof FolderError || (error instanceof Error && 'status' in error)) return { content: [{ type: 'text', text: mcpErrorText(error.message) }], isError: true };
    throw error;
  }
}

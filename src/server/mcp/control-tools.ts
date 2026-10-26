import { z } from 'zod';
import { RUN_LEVELS, type DesignComment, type PackSummary, type Project, type RunLevel, type RunSummary, type Version } from '../../shared/contracts.js';
import { COMMENT_TEXT_MAX, targetFromSelection } from '../../shared/comments.js';
import { EXPORT_FRAME_MAX_SIDE, EXPORT_MAX_FRAMES, type HandoffResult } from '../../shared/export.js';
import { canvasList, canvasPlace, canvasPoint, frameRef, placeSchema, type CanvasToolContext } from '../canvas/tools.js';
import { approve, changedFiles, ControlError, currentStep, loadTarget, outputFolder, readRun, refuseWhileRunning, short, studioCall, studioFile, writeUnique, type ControlDeps } from './control.js';
import { describeElement } from './element.js';
import { FolderError, isInside, safeFolder } from './folders.js';
import type { ToolDef, ToolResult } from './tools.js';

const PROMPT_MAX = 20_000;
const SELECTOR_MAX = 2000;
const WAIT_DEFAULT_S = 300;
const WAIT_MAX_S = 900;

const id = (what: string) => z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'must be an id of 1 to 64 letters, digits, - or _').describe(what);
const projectId = id('Project id from list_projects.');
const directionId = id('Direction id. Leave out for the main direction.').optional();
const selector = z.string().trim().min(1).max(SELECTOR_MAX);

const schemas = {
  create_project: z
    .object({
      name: z.string().trim().min(1).max(120).optional().describe('Project name. Leave out to make one from the prompt.'),
      prompt: z.string().trim().min(1).max(PROMPT_MAX).optional().describe('What to design. When you pass it, the first run starts at once, as on the Home screen.'),
      kind: z.enum(['html', 'react']).default('html').describe('html (static pages) or react (Vite + React). Default html.'),
      designSystemId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/).optional().describe('Design system (pack) id to apply. Leave out for none.'),
      location: z.string().min(1).max(4096).optional().describe('Absolute path of the parent folder for the new project folder. Leave out for the default projects folder. Another folder needs approval in Design Studio.'),
    })
    .strict()
    .refine((input) => input.name !== undefined || input.prompt !== undefined, 'pass a name or a prompt'),
  start_run: z
    .object({
      projectId,
      directionId,
      prompt: z.string().trim().min(1).max(PROMPT_MAX).describe('The message to Claude in Design Studio.'),
      level: z.enum(RUN_LEVELS as unknown as [RunLevel, ...RunLevel[]]).optional().describe('wireframe, prototype or polish. Leave out for the project default.'),
      mode: z.enum(['edit', 'plan', 'critique']).default('edit').describe('edit changes the design, plan writes a plan first and changes nothing, critique reviews without changes.'),
      selector: selector.optional().describe('CSS selector of one element on the entry page to attach to the message, as when the user selects it.'),
    })
    .strict(),
  wait_for_run: z
    .object({
      runId: id('Run id from start_run or add_comment.'),
      timeoutSeconds: z.number().int().min(1).max(WAIT_MAX_S).default(WAIT_DEFAULT_S).describe(`Seconds to wait. Default ${WAIT_DEFAULT_S}, most ${WAIT_MAX_S}.`),
    })
    .strict(),
  get_run_status: z.object({ runId: id('Run id.') }).strict(),
  stop_run: z.object({ runId: id('Run id of a run that is going.') }).strict(),
  restore_version: z.object({ projectId, directionId, versionId: id('Version id from list_versions.') }).strict(),
  apply_design_system: z.object({ projectId, directionId, packId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/).describe('Design system (pack) id.') }).strict(),
  add_comment: z
    .object({
      projectId,
      directionId,
      selector: selector.optional().describe('CSS selector of the element on the entry page. Leave out for a comment on the whole frame.'),
      text: z.string().trim().min(1).max(COMMENT_TEXT_MAX).describe('The comment.'),
      sendToClaude: z.boolean().default(false).describe('Send the comment to Claude at once, as the "Send to Claude" box in the app does. This starts a run.'),
    })
    .strict(),
  canvas_list: z.object({ projectId, directionId }).strict(),
  canvas_place: z.object({ projectId, directionId, frames: z.array(placeSchema).min(1).max(12) }).strict(),
  canvas_point: z.object({ projectId, directionId, frame: frameRef.describe('Frame id or @label.'), selector: z.string().max(400).optional() }).strict(),
  export: z
    .object({
      projectId,
      directionId,
      versionId: id('Version id. Leave out for the newest version of the direction.').optional(),
      format: z.enum(['png', 'html', 'pdf', 'handoff', 'zip']).describe('png, html, pdf, handoff (folder for a coding agent, as a zip) or zip (source files).'),
      scale: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1).describe('PNG pixel scale.'),
      frames: z
        .array(
          z
            .object({
              name: z.string().max(60).optional(),
              width: z.number().int().min(1).max(EXPORT_FRAME_MAX_SIDE),
              height: z.number().int().min(1).max(EXPORT_FRAME_MAX_SIDE),
              path: z.string().max(200).optional().describe('Page path, for example "about.html". Leave out for the entry page.'),
            })
            .strict(),
        )
        .min(1)
        .max(EXPORT_MAX_FRAMES)
        .optional()
        .describe('Frames to capture. Default one 1440x900 desktop frame (handoff: desktop and mobile).'),
      folder: z.string().min(1).max(4096).optional().describe('Absolute path of an existing folder for the files. Leave out for ~/Downloads. Another folder needs approval in Design Studio.'),
    })
    .strict(),
};

type Name = keyof typeof schemas;
type Input<N extends Name> = z.output<(typeof schemas)[N]>;

interface Hints {
  destructive: boolean;
  idempotent: boolean;
  readOnly?: boolean;
}

const META: Record<Name, { title: string; description: string; hints: Hints }> = {
  create_project: { title: 'Create project', description: 'Create a design project in Design Studio and return its project id and direction id. With a prompt, the first run starts at once and runId is returned. A location outside the default projects folder needs approval in the app.', hints: { destructive: false, idempotent: false } },
  start_run: { title: 'Start run', description: 'Send a message to Claude in one direction of a project. Returns the run id at once; call wait_for_run for the result. Refused while another run is going in that direction.', hints: { destructive: false, idempotent: false } },
  wait_for_run: { title: 'Wait for run', description: 'Wait until a run ends or the timeout passes. Returns the status, the final text, the cost, the changed files and the version id.', hints: { destructive: false, idempotent: true, readOnly: true } },
  get_run_status: { title: 'Get run status', description: 'Get the status of a run: running or how it ended, the current step, the elapsed time and the cost.', hints: { destructive: false, idempotent: true, readOnly: true } },
  stop_run: { title: 'Stop run', description: 'Stop a run that is going. The user must approve this in Design Studio.', hints: { destructive: true, idempotent: true } },
  restore_version: { title: 'Restore version', description: 'Make an older version the current design of a direction. The restore is saved as a new version. The user must approve this in Design Studio.', hints: { destructive: true, idempotent: false } },
  apply_design_system: { title: 'Apply design system', description: 'Apply a design system to a direction. This overwrites the tokens, tokens.css and DESIGN.md (project notes stay) as one new version. The user must approve this in Design Studio.', hints: { destructive: true, idempotent: false } },
  add_comment: { title: 'Add comment', description: 'Add a comment on an element (CSS selector on the entry page) or on the whole frame. With sendToClaude the comment goes to Claude at once and the run id is returned.', hints: { destructive: false, idempotent: false } },
  canvas_list: { title: 'List canvas frames', description: 'List the frames on the studio canvas of a project: id, label, page, size and position, plus what the user has selected and which frame is live.', hints: { destructive: false, idempotent: true, readOnly: true } },
  canvas_place: { title: 'Place canvas frames', description: 'Add or move frames on the studio canvas. Pass { frames: [...] }, applied in order. Each item: frame (id or @label to move; leave out to add), label, path, viewport or width/height, and one of below / rightOf / leftOf / above (another frame) with gap, or absolute x/y. Returns the placed frames and overlap warnings.', hints: { destructive: false, idempotent: false } },
  canvas_point: { title: 'Show a canvas frame', description: 'Show the user one frame in Design Studio: make it live, select an element when you pass a CSS selector, and zoom the canvas to it.', hints: { destructive: false, idempotent: true } },
  export: { title: 'Export', description: 'Export a version as PNG, HTML, PDF, a handoff zip or a source zip and write the files to a folder. Returns the file paths. Default folder ~/Downloads. Another folder needs approval in Design Studio.', hints: { destructive: false, idempotent: false } },
};

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>;
  return rest;
}

export const CONTROL_TOOLS: ToolDef[] = (Object.keys(schemas) as Name[]).map((name) => ({
  name,
  title: META[name].title,
  description: META[name].description,
  inputSchema: jsonSchema(schemas[name]),
  annotations: { readOnlyHint: META[name].hints.readOnly === true, destructiveHint: META[name].hints.destructive, idempotentHint: META[name].hints.idempotent, openWorldHint: false },
}));

export const CONTROL_NAMES = new Set<string>(Object.keys(schemas));

function ok(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] };
}

function parse<N extends Name>(name: N, args: Record<string, unknown>): Input<N> {
  const result = schemas[name].safeParse(args);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ControlError(issue ? `${issue.path.join('.') || 'input'}: ${issue.message}` : 'input is not valid');
  }
  return result.data as Input<N>;
}

const base = (project: Project, did: string) => `/api/projects/${encodeURIComponent(project.id)}/d/${encodeURIComponent(did)}`;

async function packOf(deps: ControlDeps, packId: string): Promise<PackSummary> {
  const pack = (await studioCall<PackSummary[]>(deps, 'GET', '/api/packs')).find((item) => item.id === packId);
  if (!pack) throw new ControlError(`unknown design system ${packId}`);
  return pack;
}

async function createProject(deps: ControlDeps, input: Input<'create_project'>): Promise<ToolResult> {
  const pack = input.designSystemId ? await packOf(deps, input.designSystemId) : null;
  let parentPath: string | undefined;
  if (input.location !== undefined) {
    parentPath = await safeFolder(input.location, deps.dataDir);
    const trusted = await safeFolder(await deps.projectsFolder(), deps.dataDir).then((root) => isInside(parentPath as string, root), () => false);
    const label = input.name ?? input.prompt?.slice(0, 60) ?? 'Untitled';
    if (!trusted) await approve(deps, 'create_project', `Claude Code wants to create the project "${label}" in ${parentPath}`, `Design Studio makes a new folder for the project inside ${parentPath}. This folder is outside your projects folder.`);
  }
  const body = { prompt: input.prompt ?? input.name, ...(input.name ? { name: input.name } : {}), kind: input.kind, startRun: input.prompt !== undefined, ...(pack ? { packId: pack.id } : {}), ...(parentPath ? { parentPath } : {}) };
  const created = await studioCall<{ project: Project; runId: string | null }>(deps, 'POST', '/api/projects', body);
  const main = created.project.directions.find((d) => d.id === 'main') ?? created.project.directions[0];
  return ok({ projectId: created.project.id, directionId: main?.id ?? null, name: created.project.name, folder: main?.workTree ?? null, designSystem: pack?.id ?? null, runId: created.runId });
}

async function startRun(deps: ControlDeps, input: Input<'start_run'>): Promise<ToolResult> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  refuseWhileRunning(deps, project, direction);
  let selection;
  if (input.selector) {
    const element = await describeElement(deps.preview, await deps.preview.directionUrl(project, direction), input.selector);
    if (!element) throw new ControlError(`No element matches ${input.selector} on the entry page.`);
    selection = [element];
  }
  const body = { prompt: input.prompt, mode: input.mode === 'critique' ? 'critique' : 'edit', ...(input.mode === 'plan' ? { plan: true } : {}), ...(input.level ? { level: input.level } : {}), ...(selection ? { selection } : {}) };
  const { runId } = await studioCall<{ runId: string }>(deps, 'POST', `${base(project, direction.id)}/runs`, body);
  return ok({ runId, projectId: project.id, directionId: direction.id, next: 'Call wait_for_run with this runId.' });
}

async function runReport(deps: ControlDeps, summary: RunSummary): Promise<Record<string, unknown>> {
  return {
    runId: summary.id,
    status: summary.status,
    summary: short(summary.finalText ?? ''),
    costUsd: summary.costUsd,
    durationMs: summary.durationMs,
    versionId: summary.versionId,
    filesChanged: await changedFiles(deps, summary),
    error: summary.error,
  };
}

async function waitForRun(deps: ControlDeps, input: Input<'wait_for_run'>): Promise<ToolResult> {
  const deadline = Date.now() + input.timeoutSeconds * 1000;
  const handle = deps.runner.get(input.runId);
  if (handle) await Promise.race([handle.done.catch(() => undefined), new Promise((resolve) => setTimeout(resolve, Math.max(0, deadline - Date.now())))]);
  for (let idle = 0; ; ) {
    const { summary } = await readRun(deps, input.runId);
    if (summary && summary.status !== 'running') return ok(await runReport(deps, summary));
    const active = deps.runner.get(input.runId) !== undefined;
    if (!active) idle += 1;
    if (idle > 10) return ok({ runId: input.runId, status: 'unknown', note: 'The run is not active and has no final summary.' });
    if (Date.now() >= deadline) return ok({ runId: input.runId, status: 'running', note: `The run is still going after ${input.timeoutSeconds} s. Call wait_for_run again or stop_run.` });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function statusOf(summary: RunSummary | null, active: boolean): string {
  if (summary) return summary.status;
  return active ? 'running' : 'unknown';
}

function elapsedOf(summary: RunSummary | null, events: readonly { ts: number }[]): number | null {
  const startedAt = summary?.startedAt ?? events[0]?.ts;
  if (startedAt === undefined) return null;
  return (summary?.finishedAt ?? Date.now()) - startedAt;
}

async function runStatus(deps: ControlDeps, input: Input<'get_run_status'>): Promise<ToolResult> {
  const { summary, events } = await readRun(deps, input.runId);
  const active = deps.runner.get(input.runId) !== undefined;
  const status = statusOf(summary, active);
  const running = status === 'running';
  return ok({
    runId: input.runId,
    projectId: summary?.projectId ?? null,
    directionId: summary?.directionId ?? null,
    status,
    active,
    currentStep: running ? (currentStep(events) ?? 'thinking or writing') : null,
    elapsedMs: elapsedOf(summary, events),
    costUsd: running || !summary ? null : summary.costUsd,
    ...(running ? { note: 'The cost is known when the run ends.' } : {}),
    toolCalls: events.filter((event) => event.type === 'run.tool.started').length,
  });
}

async function stopRun(deps: ControlDeps, input: Input<'stop_run'>): Promise<ToolResult> {
  const handle = deps.runner.get(input.runId);
  if (!handle) throw new ControlError('That run is not going.');
  const { summary } = await readRun(deps, input.runId).catch(() => ({ summary: null }));
  const project = summary ? await deps.projects.get(summary.projectId).catch(() => null) : null;
  const what = summary?.request.prompt ? `"${summary.request.prompt.slice(0, 80)}"` : input.runId;
  await approve(deps, 'stop_run', `Claude Code wants to stop the run ${what}${project ? ` in ${project.name}` : ''}`, 'Claude stops at once. Changes made so far stay as unfinished changes.');
  const live = deps.runner.get(input.runId);
  if (!live) return ok({ runId: input.runId, stopped: false, note: 'The run ended before the stop.' });
  live.cancel();
  const final = await Promise.race([live.done.then((s) => s.status, () => 'failed'), new Promise<string>((resolve) => setTimeout(() => resolve('stopping'), 10_000))]);
  return ok({ runId: input.runId, stopped: true, status: final });
}

async function restoreVersion(deps: ControlDeps, input: Input<'restore_version'>): Promise<ToolResult> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  const version = await deps.versions.get(project, input.versionId);
  refuseWhileRunning(deps, project, direction);
  const label = version.name ?? version.title;
  await approve(deps, 'restore_version', `Claude Code wants to restore version "${label}" of ${project.name}`, `Direction ${direction.name}. Design Studio saves the restore as a new version, so you can undo it from the version list.`);
  refuseWhileRunning(deps, project, direction);
  const restored = await studioCall<Version>(deps, 'POST', `${base(project, direction.id)}/restore`, { versionId: version.id });
  return ok({ restored: true, newVersionId: restored.id, title: restored.title, from: version.id });
}

async function applyDesignSystem(deps: ControlDeps, input: Input<'apply_design_system'>): Promise<ToolResult> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  const pack = await packOf(deps, input.packId);
  refuseWhileRunning(deps, project, direction);
  await approve(deps, 'apply_design_system', `Claude Code wants to apply the design system ${pack.name} to ${project.name}`, `Direction ${direction.name}. This overwrites the tokens, tokens.css and DESIGN.md as one new version. Your project notes stay.`);
  const result = await studioCall<{ version: Version | null; notice: string | null }>(deps, 'POST', `${base(project, direction.id)}/design-system/apply`, { packId: pack.id });
  return ok({ applied: pack.id, versionId: result.version?.id ?? null, changedFiles: result.version?.changedFiles ?? [], notice: result.notice });
}

async function addComment(deps: ControlDeps, input: Input<'add_comment'>): Promise<ToolResult> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  if (input.sendToClaude) refuseWhileRunning(deps, project, direction);
  const context = input.selector ? await describeElement(deps.preview, await deps.preview.directionUrl(project, direction), input.selector) : null;
  if (input.selector && !context) throw new ControlError(`No element matches ${input.selector} on the entry page.`);
  const target = context ? targetFromSelection(context) : { selector: 'body', sourceLoc: null, tag: 'body', textSnippet: '', rectHint: { x: 0, y: 0, width: 1440, height: 900 } };
  const comment = await studioCall<DesignComment>(deps, 'POST', `${base(project, direction.id)}/comments`, { text: input.text, target, ...(context ? { context } : {}), status: input.sendToClaude ? 'draft' : 'queued' });
  if (!input.sendToClaude) return ok({ commentId: comment.id, number: comment.n, status: comment.status, frameLevel: !context });
  const sent = await studioCall<{ runId: string }>(deps, 'POST', `${base(project, direction.id)}/comments/send`, { ids: [comment.id], ...(context ? { contexts: { [comment.id]: context } } : {}) });
  return ok({ commentId: comment.id, number: comment.n, status: 'sent', frameLevel: !context, runId: sent.runId });
}

async function canvasContext(deps: ControlDeps, input: { projectId: string; directionId?: string }): Promise<CanvasToolContext> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  return { canvas: deps.canvas, project, direction, mode: 'edit', plan: false };
}

async function exportFiles(deps: ControlDeps, input: Input<'export'>): Promise<ToolResult> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  const versionId = input.versionId ?? direction.headVersionId;
  if (!versionId) throw new ControlError('This direction has no saved version yet.');
  const version = await deps.versions.get(project, versionId);
  const { folder, trusted } = await outputFolder(deps, input.folder);
  if (!trusted) await approve(deps, 'export', `Claude Code wants to export ${project.name} as ${input.format.toUpperCase()} to ${folder}`, 'This folder is outside Downloads and your projects folder.');
  const frames = input.frames?.map((frame) => ({ name: frame.name?.trim() || `${frame.width}x${frame.height}`, width: frame.width, height: frame.height, ...(frame.path ? { path: frame.path } : {}) }));
  const pid = encodeURIComponent(project.id);
  if (input.format === 'handoff') {
    const handoff = await studioCall<HandoffResult>(deps, 'POST', `/api/projects/${pid}/handoff`, { versionId: version.id, ...(frames ? { frames } : {}) });
    const zip = await studioFile(deps, 'GET', `/api/projects/${pid}/handoff/${encodeURIComponent(handoff.path.split(/[\\/]/).pop() ?? '')}/zip`);
    const file = await writeUnique(folder, zip.name, zip.bytes);
    return ok({ files: [file], versionId: version.id, handoffFiles: handoff.files.length, prompt: short(handoff.prompt, 2000) });
  }
  const exported = await studioFile(deps, 'POST', `/api/projects/${pid}/export`, { format: input.format, versionId: version.id, frames: frames ?? [], scale: input.scale, scope: 'page' });
  const file = await writeUnique(folder, exported.name, exported.bytes);
  return ok({ files: [file], versionId: version.id, bytes: exported.bytes.byteLength, ...(exported.note ? { note: exported.note } : {}) });
}

async function run(deps: ControlDeps, name: Name, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case 'create_project':
      return createProject(deps, parse('create_project', args));
    case 'start_run':
      return startRun(deps, parse('start_run', args));
    case 'wait_for_run':
      return waitForRun(deps, parse('wait_for_run', args));
    case 'get_run_status':
      return runStatus(deps, parse('get_run_status', args));
    case 'stop_run':
      return stopRun(deps, parse('stop_run', args));
    case 'restore_version':
      return restoreVersion(deps, parse('restore_version', args));
    case 'apply_design_system':
      return applyDesignSystem(deps, parse('apply_design_system', args));
    case 'add_comment':
      return addComment(deps, parse('add_comment', args));
    case 'canvas_list':
      return canvasList(await canvasContext(deps, parse('canvas_list', args)));
    case 'canvas_place': {
      const input = parse('canvas_place', args);
      return canvasPlace(await canvasContext(deps, input), input.frames);
    }
    case 'canvas_point': {
      const input = parse('canvas_point', args);
      return canvasPoint(await canvasContext(deps, input), { frame: input.frame, ...(input.selector ? { selector: input.selector } : {}) });
    }
    case 'export':
      return exportFiles(deps, parse('export', args));
  }
}

export async function callControlTool(deps: ControlDeps, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  if (!CONTROL_NAMES.has(name)) throw new ControlError(`unknown tool ${name}`);
  try {
    return await run(deps, name as Name, args);
  } catch (error) {
    if (error instanceof ControlError || error instanceof FolderError) return { content: [{ type: 'text', text: error.message }], isError: true };
    throw error;
  }
}

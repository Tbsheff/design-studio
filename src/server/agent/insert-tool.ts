import { z } from 'zod';
import { INSERT_TEXT_MAX, type InsertTarget } from '../../shared/insert.js';
import { PROP_NAME, PROP_TEXT_MAX, PROPS_MAX } from '../../shared/props.js';
import { planInsertComponent } from '../components/insert.js';
import { probeOwners } from '../components/owner-probe.js';
import { writeAtomic } from '../direct-edit/index.js';
import { editPageUrl } from './run-target.js';
import { describeElements } from '../mcp/element.js';
import { refusal, writeProblem, type DirectToolDeps } from './direct-tools.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const LOC = /^(.+):(\d+):(\d+)$/;

export const insertComponentShape = {
  name: z.string().regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/).describe('Component name from the project library, for example "Button".'),
  file: z.string().trim().max(1000).optional().describe('File of the component when two components have the same name.'),
  targetSelector: z.string().trim().min(1).max(2000).optional().describe('CSS selector of the element on the live page to insert inside or after.'),
  targetSource: z.string().trim().max(1100).optional().describe('Or the target as file:line:col of its JSX tag, for example "src/App.tsx:12:7".'),
  path: z.string().trim().max(300).optional().describe('Page path. Leave out for the page of the frame in <canvas-context> (or the entry page).'),
  position: z.enum(['inside', 'after']).default('inside').describe('inside: last child of the target. after: next sibling.'),
  props: z.record(z.string().regex(PROP_NAME), z.union([z.string().max(PROP_TEXT_MAX), z.number(), z.boolean()])).optional().describe(`Up to ${PROPS_MAX} props, for example {"variant": "outline"}.`),
  text: z.string().max(INSERT_TEXT_MAX).optional().describe('Child text, for example "Save".'),
};

const schema = z.object(insertComponentShape).strict();

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

export async function targetOf(deps: DirectToolDeps, input: { targetSelector?: string | undefined; targetSource?: string | undefined; path?: string | undefined }): Promise<InsertTarget | string> {
  if (input.targetSource) {
    const match = LOC.exec(input.targetSource);
    return match ? { source: { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) } } : 'targetSource must be file:line:col.';
  }
  if (!input.targetSelector) return 'Pass targetSelector or targetSource.';
  if (!deps.ctx.previewUrl) return 'Preview is not running for this direction. Pass targetSource instead.';
  const url = editPageUrl(deps.ctx, input.path);
  const [element] = await describeElements(deps.preview, url, [input.targetSelector]);
  if (!element) return `No element matches ${input.targetSelector} on the page.`;
  const probed = await probeOwners(deps.preview, url, input.targetSelector).catch(() => null);
  if (!element.source && !probed?.owners.length) return `${input.targetSelector} has no source location on the page. Pass targetSource instead.`;
  return { source: element.source, tag: element.tag, ...(probed?.owners.length ? { owners: probed.owners } : {}) };
}

export async function runInsertComponent(deps: DirectToolDeps, args: z.input<typeof schema>): Promise<ToolText> {
  const blocked = refusal(deps.ctx, 'insert_component');
  if (blocked) return text(blocked, true);
  const parsed = schema.safeParse(args);
  if (!parsed.success) return text(`insert_component: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`, true);
  const input = parsed.data;
  if ((input.targetSelector === undefined) === (input.targetSource === undefined)) return text('Pass targetSelector or targetSource, not both.', true);
  try {
    const target = await targetOf(deps, input);
    if (typeof target === 'string') return text(target, true);
    const { project, direction, previewUrl } = deps.ctx;
    const previewOrigin = previewUrl && project.kind === 'react' ? new URL(previewUrl).origin : null;
    const request = { component: { name: input.name, ...(input.file ? { file: input.file } : {}) }, target, position: input.position, ...(input.props ? { props: input.props } : {}), ...(input.text !== undefined ? { text: input.text } : {}) };
    const plan = await planInsertComponent({ project, workTree: direction.workTree, previewOrigin }, request);
    const problem = writeProblem(deps.ctx, plan.target.relative);
    if (problem) return text(problem, true);
    await writeAtomic(plan.target.file, plan.code);
    const at = plan.select[0];
    const imported = plan.importAdded ? ` Import from "${plan.importFrom}" added.` : '';
    return text(`${plan.title}: ${plan.jsx} at ${plan.target.relative}:${at?.line ?? '?'}.${imported} The run saves this change in its version, like your file edits.`);
  } catch (error) {
    return text(`insert_component failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

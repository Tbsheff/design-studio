import { readFile, stat } from 'node:fs/promises';
import { z } from 'zod';
import { FIGMA_NODES_MAX_BYTES } from '../../shared/figma-nodes.js';
import { JSX_INSERT_POSITIONS } from '../../shared/insert.js';
import { resolveSource, writeAtomic } from '../direct-edit/index.js';
import { planInsertJsx } from '../direct-edit/jsx-insert.js';
import { parseFigmaNodes } from '../figma/nodes.js';
import { prepareFigmaImport } from '../figma/to-markup.js';
import { refusal, writeProblem, type DirectToolDeps } from './direct-tools.js';
import { targetOf } from './insert-tool.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

export const FIGMA_IMPORT_TOOL_DESCRIPTION =
  'Turn one Figma frame into editable markup on the page: auto layout becomes flex with gap and padding, sizing becomes widths or flex, text stays live, colors that match a project token use the token, and instances named like a kit component (Button, Badge, Card) become that component with its import. nodesFile is a JSON file with the body of the Figma REST call GET /v1/files/:key/nodes: an attachment of this run or a file in the project. It never calls Figma. Image fills become placeholder <img> elements. Use dryRun to see the markup first.';

export const figmaImportShape = {
  nodesFile: z.string().trim().min(1).max(1000).describe('The Figma nodes JSON: the name or path of an attachment of this run, or a file path in the project.'),
  nodeId: z.string().trim().min(1).max(200).optional().describe('Figma node id of the frame, for example "12:345". Leave out for the first frame.'),
  targetSelector: z.string().trim().min(1).max(2000).optional().describe('CSS selector of the target element on the live page.'),
  targetSource: z.string().trim().max(1100).optional().describe('Or the target as file:line:col of its tag.'),
  path: z.string().trim().max(300).optional().describe('Page path. Leave out for the page of the frame in <canvas-context> (or the entry page).'),
  position: z.enum(JSX_INSERT_POSITIONS as ['inside', 'before', 'after', 'replace']).default('inside').describe('inside: after the last child. before / after: a sibling. replace: in place of the target.'),
  dryRun: z.boolean().optional().describe('true: return the markup and write nothing.'),
};

const schema = z.object(figmaImportShape).strict();

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

async function nodesText(deps: DirectToolDeps, file: string): Promise<string> {
  const attachment = deps.ctx.attachments.find((item) => item.name === file || item.path === file);
  const absolute = attachment ? attachment.path : (await resolveSource(deps.ctx.direction.workTree, file)).file;
  const info = await stat(absolute);
  if (info.size > FIGMA_NODES_MAX_BYTES) throw new Error(`${file} is larger than 10 MB`);
  return readFile(absolute, 'utf8');
}

export async function runFigmaImport(deps: DirectToolDeps, args: z.input<typeof schema>): Promise<ToolText> {
  const blocked = refusal(deps.ctx, 'import_figma_frame');
  if (blocked) return text(blocked, true);
  const parsed = schema.safeParse(args);
  if (!parsed.success) return text(`import_figma_frame: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`, true);
  const input = parsed.data;
  if ((input.targetSelector === undefined) === (input.targetSource === undefined)) return text('Pass targetSelector or targetSource, not both.', true);
  try {
    const target = await targetOf(deps, input);
    if (typeof target === 'string') return text(target, true);
    const { project, direction, previewUrl } = deps.ctx;
    const doc = parseFigmaNodes(await nodesText(deps, input.nodesFile));
    const scope = { project, direction, workTree: direction.workTree, previewOrigin: previewUrl && project.kind === 'react' ? new URL(previewUrl).origin : null };
    const prepared = await prepareFigmaImport(scope, doc, { nodeId: input.nodeId, target, position: input.position });
    const plan = await planInsertJsx(scope, prepared.insert);
    const stats = prepared.preview.stats;
    const kit = stats.kit.map((use) => `${use.layer} -> <${use.component}>`).join(', ');
    const facts = `${stats.layers} layers, ${stats.tokens} token colors${stats.rawColors.length ? `, raw colors ${stats.rawColors.join(' ')}` : ''}${kit ? `, kit: ${kit}` : ''}.${stats.notes.length ? ` ${stats.notes.join(' ')}` : ''}`;
    if (input.dryRun) return text(`${prepared.preview.frame.name} (${prepared.preview.frame.id}): ${facts}\n\n${prepared.preview.markup}`);
    const problem = writeProblem(deps.ctx, plan.target.relative);
    if (problem) return text(problem, true);
    await writeAtomic(plan.target.file, plan.code);
    const at = plan.select.map((item) => `${item.file}:${item.line}:${item.col}`).join(', ');
    return text(`Imported Figma frame ${prepared.preview.frame.name} at ${at}: ${facts} The run saves this change in its version, like your file edits.`);
  } catch (error) {
    return text(`import_figma_frame failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

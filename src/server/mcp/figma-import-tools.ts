import { readFile, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { FIGMA_NODES_MAX_BYTES, type FigmaImportPreview, type FigmaImportResult } from '../../shared/figma-nodes.js';
import { JSX_INSERT_POSITIONS } from '../../shared/insert.js';
import { approve, EditError, loadTarget, oneLine, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, projectId, selector, versionActivity, type Done } from './edit-kit.js';
import { isInside, safeFolder } from './folders.js';
import { targetOf } from './insert-tools.js';

export const IMPORT_FIGMA_FRAME_DESCRIPTION =
  'Turn one Figma frame into editable markup on a page, like pasting Figma JSON in the studio (Paste JSX). Pass nodesFile: a local .json file with the body of the Figma REST call GET /v1/files/:key/nodes?ids=<node id> (or GET /v1/files/:key); this tool does not call Figma. Auto layout becomes flex with gap, padding and alignment; Fixed, Hug and Fill sizing become widths, flex: 1 or align-self: stretch; text keeps its size, weight, line height and characters; fills, strokes, radius and shadows become CSS, and a color that matches a project token is written as that token (in a Tailwind app as a theme class such as bg-card). An instance whose name matches a kit component (Button, Badge, Card) becomes that component with its text and matching variant props, and its import line is added. Image fills become placeholder <img> elements (use set_image after). Hidden layers are skipped. dryRun: true returns the markup and the stats without a write. One version and one undo step.';

const schema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    nodesFile: z.string().trim().min(1).max(1000).describe('Absolute path of the Figma nodes JSON file, for example "/Users/me/Downloads/card.json".'),
    nodeId: z.string().trim().min(1).max(200).optional().describe('Figma node id of the frame to import, for example "12:345" (the node-id in a Figma link, with - or :). Leave out for the first frame in the file.'),
    targetSelector: selector.optional().describe('CSS selector or layer id of the element to insert into or next to, for example "main".'),
    targetSource: z.string().trim().max(1100).optional().describe('Or the target element as file:line:col of its tag, as get_layers prints it. Use this or targetSelector.'),
    position: z.enum(JSX_INSERT_POSITIONS as ['inside', 'before', 'after', 'replace']).default('inside').describe('inside: after the last child of the target. before / after: a sibling. replace: in place of the target.'),
    dryRun: z.boolean().optional().describe('true: return the markup, the frames in the file and the stats, and write nothing.'),
  })
  .strict()
  .refine((input) => (input.targetSelector === undefined) !== (input.targetSource === undefined), 'pass targetSelector or targetSource, not both');

async function resolveNodesFile(raw: string, dataDir: string): Promise<string> {
  if (raw.includes('\0')) throw new EditError('nodesFile is not a valid path');
  const expanded = raw.startsWith('~/') ? path.join(homedir(), raw.slice(2)) : raw;
  if (!path.isAbsolute(expanded)) throw new EditError('nodesFile must be an absolute path');
  const file = await realpath(expanded).catch(() => null);
  if (!file) throw new EditError(`nodesFile not found: ${raw}`);
  const info = await stat(file);
  if (!info.isFile()) throw new EditError(`nodesFile is not a file: ${file}`);
  if (!/\.json$/i.test(file)) throw new EditError('nodesFile must be a .json file with the body of GET /v1/files/:key/nodes');
  if (info.size > FIGMA_NODES_MAX_BYTES) throw new EditError(`${path.basename(file)} is larger than 10 MB. Export one frame with ?ids=<node id>.`);
  await safeFolder(path.dirname(file), dataDir);
  return file;
}

async function readNodesFile(deps: EditDeps, raw: string, client: string, projectId: string): Promise<string> {
  const file = await resolveNodesFile(raw, deps.dataDir);
  const projects = await safeFolder(await deps.projectsFolder(), deps.dataDir).catch(() => null);
  if (projects === null || !isInside(file, projects)) {
    await approve(deps, { tool: 'import_figma_frame', action: 'Read a Figma nodes file', projectId, client, title: `${client} wants to read ${oneLine(file, 160)} to import a Figma frame`, detail: 'The studio reads this JSON file and writes the frame as markup into the page. It does not connect to Figma.' });
  }
  return readFile(file, 'utf8');
}

function summary(stats: FigmaImportResult['stats']): string {
  const kit = stats.kit.map((use) => `${use.layer} -> <${use.component}>`).join(', ');
  return `${stats.layers} layers, ${stats.tokens} token colors, ${stats.rawColors.length} raw colors${kit ? `, kit: ${kit}` : ''}${stats.images ? `, ${stats.images} image placeholders` : ''}`;
}

const importFigmaFrame = defineTool('import_figma_frame', schema, { title: 'Import Figma frame', description: IMPORT_FIGMA_FRAME_DESCRIPTION }, async (deps, input, client): Promise<Done> => {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  if (!input.dryRun) refuseWhileRunning(deps, project, direction);
  const nodes = await readNodesFile(deps, input.nodesFile, client, project.id);
  const target = await targetOf(deps, project, direction, input);
  const body = { nodes, ...(input.nodeId ? { nodeId: input.nodeId } : {}), target, position: input.position, ...(input.dryRun ? { dryRun: true } : {}) };
  let result: FigmaImportResult | FigmaImportPreview;
  try {
    result = await studioCall<FigmaImportResult | FigmaImportPreview>(deps, 'POST', `${base(project, direction.id)}/figma/import`, body);
  } catch (error) {
    throw new EditError(error instanceof Error ? error.message : String(error));
  }
  if (!('version' in result)) return { result: ok({ dryRun: true, frame: result.frame, frames: result.frames, markup: result.markup, stats: result.stats }) };
  const at = result.select.map((item) => `${item.file}:${item.line}:${item.col}`);
  const output = ok({ file: result.file, title: result.title, at, frame: result.frame, stats: result.stats, imports: result.imports, versionId: result.version?.id ?? null });
  return { result: output, activity: versionActivity(project, direction, `${result.title} (${summary(result.stats)})`, result.version) };
});

export const FIGMA_IMPORT_TOOLS = [importFigmaFrame];

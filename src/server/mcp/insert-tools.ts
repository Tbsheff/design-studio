import { z } from 'zod';
import type { Project } from '../../shared/contracts.js';
import { INSERT_TEXT_MAX, type InsertComponentResult, type InsertTarget, type InsertableList } from '../../shared/insert.js';
import { PROP_NAME, PROP_TEXT_MAX, PROPS_MAX } from '../../shared/props.js';
import { probeOwners } from '../components/owner-probe.js';
import { EditError, loadTarget, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, pageUrl, projectId, selector, versionActivity, type Done } from './edit-kit.js';
import { describeElement } from './element.js';

type Direction = Project['directions'][number];

const LOC = /^(.+):(\d+):(\d+)$/;

const insertSchema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    name: z.string().regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/).describe('Component name, for example "Button". The studio finds it in the project component library (exported React components in src, or in the app and its workspace packages such as @workspace/ui).'),
    file: z.string().trim().max(1000).optional().describe('File of the component, relative to the project, when two components have the same name.'),
    targetSelector: selector.optional().describe('CSS selector of the element on the page to insert inside or after, for example "main" or "[data-name=\'Hero\'] h2".'),
    targetSource: z.string().trim().max(1100).optional().describe('Or the target element as file:line:col of its JSX tag, for example "src/App.tsx:12:7". Use this or targetSelector.'),
    position: z.enum(['inside', 'after']).default('inside').describe('inside adds the component as the last child of the target; after adds it as the next sibling.'),
    props: z
      .record(z.string().regex(PROP_NAME), z.union([z.string().max(PROP_TEXT_MAX), z.number(), z.boolean()]))
      .refine((props) => Object.keys(props).length <= PROPS_MAX, `pass at most ${PROPS_MAX} props`)
      .optional()
      .describe('Props to set, for example {"variant": "outline"}. Required props that you leave out get a default from the props type.'),
    text: z.string().max(INSERT_TEXT_MAX).optional().describe('Child text, for example "Save". Default: the component name.'),
  })
  .strict()
  .refine((input) => (input.targetSelector === undefined) !== (input.targetSource === undefined), 'pass targetSelector or targetSource, not both');

type Input = z.output<typeof insertSchema>;

function parseLoc(raw: string): InsertTarget['source'] {
  const match = LOC.exec(raw);
  if (!match) throw new EditError('targetSource must be file:line:col, for example src/App.tsx:12:7');
  return { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) };
}

async function targetOf(deps: EditDeps, project: Project, direction: Direction, input: Input): Promise<InsertTarget> {
  if (input.targetSource) return { source: parseLoc(input.targetSource) };
  const sel = input.targetSelector ?? '';
  const url = await pageUrl(deps, project, direction, input.path);
  const element = await describeElement(deps.preview, url, sel);
  if (!element) throw new EditError(`No element matches ${sel} on the page.`);
  const probed = await probeOwners(deps.preview, url, sel).catch(() => null);
  if (!element.source && !probed?.owners.length) throw new EditError(`${sel} has no source location. Pass targetSource with the file:line:col of the JSX tag.`);
  return { source: element.source, tag: element.tag, selector: sel, ...(probed?.owners.length ? { owners: probed.owners } : {}) };
}

async function knownNames(deps: EditDeps, project: Project, direction: Direction): Promise<string> {
  const list = await studioCall<InsertableList>(deps, 'GET', `${base(project, direction.id)}/insert/components`).catch(() => null);
  const names = [...new Set((list?.components ?? []).map((item) => item.name))];
  return names.length > 0 ? ` Components: ${names.slice(0, 40).join(', ')}${names.length > 40 ? ', …' : ''}.` : '';
}

const insertComponent = defineTool(
  'insert_component',
  insertSchema,
  {
    title: 'Insert component',
    description:
      'Insert an instance of a React component from the project library, like dragging it from the studio Components panel: it writes <Name …>Text</Name> inside or after the target element, fills required props from the props type, and adds or extends the import line with the path the project uses (a workspace package such as @workspace/ui/components/button, a tsconfig path, or a relative path). One version and one undo step. Targets made by .map(), shown by a condition, or the top element of a component are refused with a reason. HTML projects have no component kit and are refused.',
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    if (project.kind !== 'react') throw new EditError('This is an HTML project. It has no component kit to insert from; use write_file or edit_element.');
    refuseWhileRunning(deps, project, direction);
    const target = await targetOf(deps, project, direction, input);
    const body = { component: { name: input.name, ...(input.file ? { file: input.file } : {}) }, target, position: input.position, ...(input.props ? { props: input.props } : {}), ...(input.text !== undefined ? { text: input.text } : {}) };
    let result: InsertComponentResult;
    try {
      result = await studioCall<InsertComponentResult>(deps, 'POST', `${base(project, direction.id)}/insert`, body);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new EditError(/no exported component/.test(message) ? `${message}.${await knownNames(deps, project, direction)}` : message);
    }
    const output = ok({ file: result.file, jsx: result.jsx, importFrom: result.importFrom, importAdded: result.importAdded, at: result.select[0] ?? null, usedAt: result.usedAt, versionId: result.version?.id ?? null, title: result.version?.title ?? null });
    return { result: output, activity: versionActivity(project, direction, result.version?.title ?? `Inserted ${input.name}`, result.version) };
  },
);

export const INSERT_TOOLS = [insertComponent];

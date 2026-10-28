import { z } from 'zod';
import type { Project, SourceLoc } from '../../shared/contracts.js';
import { PROP_NAME, PROP_TEXT_MAX, PROPS_MAX, type ComponentInstance, type ComponentSchemaList, type PropValue, type SetPropsResult } from '../../shared/props.js';
import { probeOwners } from '../components/owner-probe.js';
import { EditError, loadTarget, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, pageUrl, projectId, selector, versionActivity, type Done } from './edit-kit.js';

type Direction = Project['directions'][number];

const LOC = /^(.+):(\d+):(\d+)$/;
const propValue = z.union([z.string().max(PROP_TEXT_MAX), z.number(), z.boolean(), z.null()]);

const listSchema = z.object({ projectId, directionId }).strict();

const setSchema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    selector: selector.optional().describe('CSS selector of an element inside the component instance on the page, for example "button" or "main button:nth-of-type(2)". The nearest component (such as <Button>) that has props is changed.'),
    source: z.string().trim().max(1100).optional().describe('Use site of the component as file:line:col of its JSX tag, for example "src/App.tsx:14:9". Use this or selector.'),
    props: z
      .record(z.string().regex(PROP_NAME), propValue)
      .refine((props) => Object.keys(props).length > 0 && Object.keys(props).length <= PROPS_MAX, `pass 1 to ${PROPS_MAX} props`)
      .describe('Props to set: a string, number or boolean. null removes the prop. A value equal to the default removes the attribute. Variant props take one of the cva option names from list_components.'),
  })
  .strict()
  .refine((input) => (input.selector === undefined) !== (input.source === undefined), 'pass selector or source, not both');

function parseLoc(raw: string): SourceLoc {
  const match = LOC.exec(raw);
  if (!match) throw new EditError('source must be file:line:col, for example src/App.tsx:14:9');
  return { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) };
}

async function useSiteOf(deps: EditDeps, project: Project, direction: Direction, page: string | undefined, sel: string): Promise<ComponentInstance> {
  const probed = await probeOwners(deps.preview, await pageUrl(deps, project, direction, page), sel);
  if (!probed) throw new EditError(`No element matches ${sel} on the page.`);
  const { instance } = await studioCall<{ instance: ComponentInstance | null }>(deps, 'POST', `${base(project, direction.id)}/props/instance`, { owners: probed.owners });
  if (!instance) throw new EditError(`${sel} is not inside a component instance with props that the studio can find. Use source with the file:line:col of the JSX tag, or edit_element.`);
  return instance;
}

function valueText(value: PropValue | null): string {
  return value === null ? 'default' : String(value);
}

const listComponents = defineTool(
  'list_components',
  listSchema,
  {
    title: 'List components and props',
    description: 'List the React components in the project with their props schema: each prop with its control (select with options, boolean, text, number), default, and whether it comes from a cva() variant or the TypeScript props type; the cva variants with the classes of each option; asChild; and the use count. Use the names and options with set_props.',
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    if (project.kind !== 'react') return { result: ok({ components: [], note: 'This is an HTML project; it has no React components.' }) };
    const list = await studioCall<ComponentSchemaList>(deps, 'GET', `${base(project, direction.id)}/props/components`);
    return { result: ok(list) };
  },
);

const setProps = defineTool(
  'set_props',
  setSchema,
  {
    title: 'Set component props',
    description: 'Change the props of one component instance, the same as the Component section of the studio inspector: it adds, replaces or removes JSX attributes at the use site (for example <Button variant="outline"> to variant="destructive") and keeps the rest of the file as it was. One version and one undo step. Find the instance by selector (an element inside it on the page) or by source (file:line:col of the JSX tag). Props set by an expression are refused.',
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const source = input.source ? parseLoc(input.source) : (await useSiteOf(deps, project, direction, input.path, input.selector ?? '')).use;
    const result = await studioCall<SetPropsResult>(deps, 'POST', `${base(project, direction.id)}/props`, { source, props: input.props });
    const tag = result.instance?.tag ?? 'component';
    if (result.changed.length === 0 && result.removed.length === 0) return { result: ok({ changed: false, use: source, values: result.instance?.values ?? {}, note: 'Every prop already had that value.' }) };
    const words = Object.entries(input.props).map(([name, value]) => `${name} ${valueText(value)}`).join(', ');
    const output = ok({ changed: true, file: result.file, use: result.instance?.use ?? source, set: result.changed, removed: result.removed, values: result.instance?.values ?? {}, versionId: result.version?.id ?? null, title: result.version?.title ?? null });
    return { result: output, activity: versionActivity(project, direction, `Set ${tag} ${words}`, result.version) };
  },
);

export const PROPS_TOOLS = [listComponents, setProps];

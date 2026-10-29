import { z } from 'zod';
import { COMPONENT_NAME, CREATE_TARGETS_MAX, type ComponentFolderList, type CreateComponentResult, type SwapCandidateList, type SwapResult } from '../../shared/component-create.js';
import type { InsertTarget } from '../../shared/insert.js';
import { EditError, loadTarget, refuseWhileRunning, studioCall } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, projectId, selector, versionActivity, type Done } from './edit-kit.js';
import { targetOf } from './insert-tools.js';
import { scopeOf } from './layer-ref.js';
import { useSiteOf } from './props-tools.js';
import { resolveSourceLoc } from './source-loc.js';

export const CREATE_COMPONENT_DESCRIPTION =
  'Turn repeated markup into a React component, like Figma "Create component": pass one element, or several look-alike elements written out one by one (for example 3 stat rows or 4 nav links). The studio writes the component file in folder (the kit, such as packages/ui/src/components, or the app components folder; leave out for the app folder), with a prop for each part that differs between the elements (text, href, src, values in { }) and a cva() variant prop when their classes differ. Then it replaces each element with <Name …props /> and adds the import. Names the markup gets from the page (state, handlers) become props too. One version and one undo step; undo also removes the new file. Elements that a .map() draws, that a condition shows, that spread props, or whose structure differs are refused with a reason. Next: set_props to change the variant of one use, swap_instance to change one use to another component.';

export const SWAP_INSTANCE_DESCRIPTION =
  'Replace one component use with another library component, like Figma "Swap instance": <Badge variant="success">Paid</Badge> to <Button variant="outline">Paid</Button>. Props the new component also has stay (variant values that are not its options are dropped), required props it needs get defaults, the import is added and the old import goes when the file no longer uses it. Leave out name to list the components that fit (name, file, which props stay, drop or get added); only one with children can take a use that has children. One version and one undo step.';

const createSchema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    targets: z
      .array(
        z
          .object({
            targetSelector: selector.optional().describe('CSS selector or get_layers id of the element, for example "e0k3pz".'),
            targetSource: z.string().trim().max(1100).optional().describe('Or file:line:col of its JSX tag, for example "src/App.tsx:14:9".'),
            path: pagePath.describe('Page path of this element. Leave out to use the top-level path.'),
          })
          .strict()
          .refine((item) => (item.targetSelector === undefined) !== (item.targetSource === undefined), 'pass targetSelector or targetSource, not both'),
      )
      .min(1)
      .max(CREATE_TARGETS_MAX)
      .describe('The elements, one item per element: [{"targetSelector": "e0k3pz"}, {"targetSelector": "e0k4a1"}, {"targetSelector": "e0k4b7"}].'),
    name: z.string().regex(COMPONENT_NAME).describe('PascalCase component name, for example "StatRow". The file name follows the folder (stat-row.tsx in a kit of kebab-case files, StatRow.tsx in a folder of PascalCase files).'),
    folder: z.string().trim().min(1).max(500).optional().describe('Folder for the new file, relative to the project, for example "packages/ui/src/components" or "src/components". Leave out for the app components folder.'),
  })
  .strict();

const swapSchema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    selector: selector.optional().describe('CSS selector or get_layers id of an element of the component use on the page.'),
    source: z.string().trim().max(1100).optional().describe('Or the use site as file:line:col of its JSX tag, for example "src/App.tsx:14:9". Use this or selector.'),
    name: z.string().regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/).optional().describe('Component to swap to, for example "Button". Leave out to list the components that fit.'),
    file: z.string().trim().max(1000).optional().describe('File of that component when two have the same name.'),
  })
  .strict()
  .refine((input) => (input.selector === undefined) !== (input.source === undefined), 'pass selector or source, not both');

type Loaded = Awaited<ReturnType<typeof loadTarget>>;

async function targetsOf(deps: Parameters<typeof targetOf>[0], loaded: Loaded, input: z.output<typeof createSchema>): Promise<InsertTarget[]> {
  const out: InsertTarget[] = [];
  for (const item of input.targets) out.push(await targetOf(deps, loaded.project, loaded.direction, { ...item, path: item.path ?? input.path }));
  return out;
}

const createComponent = defineTool('create_component', createSchema, { title: 'Create component', description: CREATE_COMPONENT_DESCRIPTION }, async (deps, input): Promise<Done> => {
  const loaded = await loadTarget(deps, input.projectId, input.directionId);
  const { project, direction } = loaded;
  if (project.kind !== 'react') throw new EditError('This is an HTML project. Components need a React project.');
  refuseWhileRunning(deps, project, direction);
  const targets = await targetsOf(deps, loaded, input);
  const folder = input.folder ?? (await studioCall<ComponentFolderList>(deps, 'GET', `${base(project, direction.id)}/components/folders`)).folders.find((item) => item.kind === 'app')?.folder ?? 'src/components';
  let result: CreateComponentResult;
  try {
    result = await studioCall<CreateComponentResult>(deps, 'POST', `${base(project, direction.id)}/components/create`, { targets, name: input.name, folder });
  } catch (error) {
    throw new EditError(error instanceof Error ? error.message : String(error));
  }
  const at = result.select.map((item) => `${item.file}:${item.line}:${item.col}`);
  const output = ok({ file: result.file, name: result.name, props: result.props, variants: result.variants, files: result.files, at, importFrom: result.importFrom, versionId: result.version?.id ?? null, title: result.title });
  return { result: output, activity: versionActivity(project, direction, result.title, result.version) };
});

const swapInstance = defineTool('swap_instance', swapSchema, { title: 'Swap instance', description: SWAP_INSTANCE_DESCRIPTION }, async (deps, input): Promise<Done> => {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  if (project.kind !== 'react') throw new EditError('This is an HTML project. It has no components to swap.');
  const use = input.source ? await resolveSourceLoc(direction.workTree, scopeOf(project.id, direction.id), input.source) : (await useSiteOf(deps, project, direction, input.path, input.selector ?? '')).use;
  if (!input.name) {
    const list = await studioCall<SwapCandidateList>(deps, 'POST', `${base(project, direction.id)}/components/swap-candidates`, { use });
    return { result: ok({ use, ...list }) };
  }
  refuseWhileRunning(deps, project, direction);
  let result: SwapResult;
  try {
    result = await studioCall<SwapResult>(deps, 'POST', `${base(project, direction.id)}/components/swap`, { use, component: { name: input.name, ...(input.file ? { file: input.file } : {}) } });
  } catch (error) {
    throw new EditError(error instanceof Error ? error.message : String(error));
  }
  const at = result.select.map((item) => `${item.file}:${item.line}:${item.col}`);
  return { result: ok({ file: result.file, title: result.title, at, dropped: result.dropped, added: result.added, importFrom: result.importFrom, versionId: result.version?.id ?? null }), activity: versionActivity(project, direction, result.title, result.version) };
});

export const COMPONENT_CREATE_TOOLS = [createComponent, swapInstance];

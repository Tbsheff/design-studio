import { z } from 'zod';
import { COMPONENT_NAME, CREATE_TARGETS_MAX } from '../../shared/component-create.js';
import type { SourceLoc } from '../../shared/contracts.js';
import type { InsertTarget } from '../../shared/insert.js';
import { componentFolders, planCreateComponent } from '../components/extract.js';
import { planSwap, swapCandidates } from '../components/swap.js';
import { resolveInstance } from '../components/use-site.js';
import { writeAtomic, writeNewFile } from '../direct-edit/index.js';
import { refusal, writeProblem, type DirectToolDeps } from './direct-tools.js';
import { targetOf } from './insert-tool.js';
import { resolveSelectors } from './kit-tools.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const LOC = /^(.+):(\d+):(\d+)$/;

export const CREATE_COMPONENT_AGENT_DESCRIPTION =
  'Turn repeated markup into a React component with the same server code as the MCP create_component tool and the studio "Create component" menu: pass one element or several look-alike elements written out one by one (3 stat rows, 4 nav links). It writes the component file in folder (the kit such as packages/ui/src/components, or the app components folder by default) with a prop for each part that differs (text, href, src, { } values) and a cva() variant prop when the classes differ, then replaces each element with <Name …props /> and adds the import. Use it instead of copying the same markup three times. Elements drawn by .map(), shown by a condition, with spread props or with a different structure are refused with a reason.';

export const SWAP_INSTANCE_AGENT_DESCRIPTION =
  'Replace one component use with another library component, with the same server code as the MCP swap_instance tool and the inspector Swap button: shared props stay, props the new component lacks are dropped, required props get defaults, imports are fixed. Leave out name to list the components that fit.';

export const createComponentShape = {
  targets: z
    .array(z.object({ targetSelector: z.string().trim().min(1).max(2000).optional().describe('CSS selector or layer id on the live page.'), targetSource: z.string().trim().max(1100).optional().describe('Or file:line:col of the JSX tag.') }).strict())
    .min(1)
    .max(CREATE_TARGETS_MAX)
    .describe('The elements, one item per element, for example [{"targetSelector": "e0k3pz"}, {"targetSelector": "e0k4a1"}].'),
  name: z.string().regex(COMPONENT_NAME).describe('PascalCase component name, for example "StatRow".'),
  folder: z.string().trim().min(1).max(500).optional().describe('Folder for the file, relative to the project. Leave out for the app components folder.'),
  path: z.string().trim().max(300).optional().describe('Page path. Leave out for the page of the frame in <canvas-context> (or the entry page).'),
};

export const swapInstanceShape = {
  targetSelector: z.string().trim().min(1).max(2000).optional().describe('CSS selector or layer id of an element of the component use on the live page.'),
  targetSource: z.string().trim().max(1100).optional().describe('Or the use site as file:line:col of its JSX tag.'),
  name: z.string().regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/).optional().describe('Component to swap to. Leave out to list the components that fit.'),
  file: z.string().trim().max(1000).optional().describe('File of that component when two have the same name.'),
  path: z.string().trim().max(300).optional().describe('Page path. Leave out for the page of the frame in <canvas-context>.'),
};

const createSchema = z.object(createComponentShape).strict();
const swapSchema = z.object(swapInstanceShape).strict();

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

function issues(tool: string, error: z.ZodError): ToolText {
  return text(`${tool}: ${error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`, true);
}

function scopeOf(deps: DirectToolDeps) {
  const { project, direction, previewUrl } = deps.ctx;
  return { project, workTree: direction.workTree, previewOrigin: previewUrl && project.kind === 'react' ? new URL(previewUrl).origin : null };
}

async function targetsOf(deps: DirectToolDeps, input: z.output<typeof createSchema>): Promise<InsertTarget[] | string> {
  const out: InsertTarget[] = [];
  for (const item of input.targets) {
    if ((item.targetSelector === undefined) === (item.targetSource === undefined)) return 'Pass targetSelector or targetSource in each item, not both.';
    const target = await targetOf(deps, await resolveSelectors(deps, { ...item, path: input.path }));
    if (typeof target === 'string') return target;
    out.push(target);
  }
  return out;
}

export async function runCreateComponent(deps: DirectToolDeps, args: z.input<typeof createSchema>): Promise<ToolText> {
  const blocked = refusal(deps.ctx, 'create_component');
  if (blocked) return text(blocked, true);
  const parsed = createSchema.safeParse(args);
  if (!parsed.success) return issues('create_component', parsed.error);
  const input = parsed.data;
  try {
    const targets = await targetsOf(deps, input);
    if (typeof targets === 'string') return text(targets, true);
    const scope = scopeOf(deps);
    const folder = input.folder ?? (await componentFolders(scope.project, scope.workTree)).folders.find((item) => item.kind === 'app')?.folder ?? 'src/components';
    const plan = await planCreateComponent(scope, { targets, name: input.name, folder });
    const problem = plan.files.map((item) => writeProblem(deps.ctx, item.target.relative)).find(Boolean);
    if (problem) return text(problem, true);
    for (const item of plan.files) await (item.created ? writeNewFile(item.target.file, item.code) : writeAtomic(item.target.file, item.code));
    const props = plan.props.map((prop) => `${prop.name}${prop.optional ? '?' : ''}: ${prop.type}`).join(', ');
    const at = plan.select.map((item) => `${item.file}:${item.line}:${item.col}`).join(', ');
    return text(`${plan.title}: wrote ${plan.component.relative} (props: ${props || 'none'}${plan.variants.length > 0 ? `; variant: ${plan.variants.join(', ')}` : ''}) and used it at ${at}. The run saves this change in its version, like your file edits.`);
  } catch (error) {
    return text(`create_component failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

async function useOf(deps: DirectToolDeps, input: z.output<typeof swapSchema>): Promise<SourceLoc | string> {
  if (input.targetSource) {
    const match = LOC.exec(input.targetSource);
    return match ? { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) } : 'targetSource must be file:line:col.';
  }
  const target = await targetOf(deps, input);
  if (typeof target === 'string') return target;
  const instance = await resolveInstance({ workTree: deps.ctx.direction.workTree, previewOrigin: scopeOf(deps).previewOrigin }, { owners: target.owners ?? [], usedAt: null });
  return instance?.use ?? `${input.targetSelector ?? 'This element'} is not inside a component use the studio can find. Pass targetSource with the file:line:col of the component tag.`;
}

export async function runSwapInstance(deps: DirectToolDeps, args: z.input<typeof swapSchema>): Promise<ToolText> {
  const parsed = swapSchema.safeParse(args);
  if (!parsed.success) return issues('swap_instance', parsed.error);
  const input = parsed.data;
  if ((input.targetSelector === undefined) === (input.targetSource === undefined)) return text('Pass targetSelector or targetSource, not both.', true);
  try {
    const use = await useOf(deps, input);
    if (typeof use === 'string') return text(use, true);
    const scope = scopeOf(deps);
    if (!input.name) {
      const list = await swapCandidates(scope.project, scope.workTree, use);
      const lines = list.candidates.map((item) => `- ${item.name} (${item.file})${item.drop.length > 0 ? ` drops ${item.drop.join(', ')}` : ''}${item.add.length > 0 ? ` adds ${item.add.join(', ')}` : ''}`);
      return text([`Components that can take this ${list.from}:`, ...lines, ...(list.note ? [list.note] : [])].join('\n'));
    }
    const blocked = refusal(deps.ctx, 'swap_instance');
    if (blocked) return text(blocked, true);
    const plan = await planSwap(scope, { use, component: { name: input.name, ...(input.file ? { file: input.file } : {}) } });
    const problem = writeProblem(deps.ctx, plan.target.relative);
    if (problem) return text(problem, true);
    await writeAtomic(plan.target.file, plan.code);
    const at = plan.select[0];
    const dropped = plan.dropped.length > 0 ? ` Dropped: ${plan.dropped.join(', ')}.` : '';
    return text(`${plan.title} at ${plan.target.relative}:${at?.line ?? '?'}:${at?.col ?? '?'}.${dropped} The run saves this change in its version, like your file edits.`);
  } catch (error) {
    return text(`swap_instance failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

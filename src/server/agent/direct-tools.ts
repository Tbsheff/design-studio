import { z } from 'zod';
import { DIRECT_STYLE_PROPERTIES, STRUCTURE_OPS, TOKENS_FILE, type DirectStyleProperty, type SelectionContext, type StructureOp } from '../../shared/contracts.js';
import { appTokensFor, readAppTokensAt } from '../design-system/app-tokens/source.js';
import { plannedCssText } from '../design-system/app-tokens/write.js';
import { SOURCE_DIR } from '../design-system/extract/draft.js';
import { writeFileAtomic } from '../design-system/packs.js';
import { readDesignSystemState } from '../design-system/state.js';
import { invalidateTokenSource } from '../design-system/token-preview.js';
import { plannedTokensText, writeTokensText } from '../design-system/update-tokens.js';
import { DirectEditError, parseDirectEditRequest, planDirectEdit, writeAtomic } from '../direct-edit/index.js';
import { planStructureEdit } from '../direct-edit/structure-apply.js';
import { knownTokenVars } from '../direct-edit/tokens.js';
import { withPagePath } from '../export/source.js';
import { describeElements, textHintsOf } from '../mcp/element.js';
import type { AgentRunContext, PreviewService } from '../types.js';
import { evaluateToolUse } from './permissions.js';

export interface DirectToolDeps {
  preview: PreviewService;
  ctx: AgentRunContext;
}

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const RUN_NOTE = 'The run saves this change in its version, like your file edits.';
const styleValue = z.string().max(200).nullable();
const classNames = z.array(z.string().trim().min(1).max(100)).max(30);

export const editElementShape = {
  selector: z.string().trim().min(1).max(2000).describe('CSS selector of one element on the page, for example "h1" or "[data-name=\'Hero\'] button".'),
  path: z.string().trim().max(300).optional().describe('Page path, for example "about.html". Leave out for the entry page.'),
  style: z.object(Object.fromEntries(DIRECT_STYLE_PROPERTIES.map((prop) => [prop, styleValue.optional()])) as Record<DirectStyleProperty, z.ZodOptional<typeof styleValue>>).strict().optional().describe('CSS properties to set inline. null removes the property.'),
  text: z.string().max(5000).optional().describe('New text of a leaf element.'),
  classes: z.object({ add: classNames.optional(), remove: classNames.optional() }).strict().optional().describe('Tailwind classes to add or remove, with any variant prefix. An added class replaces the class of the same utility and variant (p-6 replaces p-4). Works on a plain class or className string and on string arguments of cn(), clsx() or twMerge().'),
  variant: z.string().trim().max(60).optional().describe('Breakpoint and state for style: "md:", "lg:", "hover:", "focus:", "active:", "dark:" or a mix such as "md:hover:". In Tailwind it writes prefixed classes (md:p-6); in a plain HTML page a media query or :hover rule. Leave out for the base style.'),
  op: z.enum(STRUCTURE_OPS).optional().describe('Structure edit instead: delete, duplicate, wrap (in a flex column frame), unwrap or move (into targetSelector, as its last child).'),
  targetSelector: z.string().trim().min(1).max(2000).optional().describe('For op move: CSS selector of the new parent.'),
};

export const setTokenShape = {
  name: z.string().trim().min(3).max(120).describe('Token CSS variable, for example "--primary", or its path, for example "color.primary".'),
  value: z.string().trim().min(1).max(400).describe('New value, for example "#015A5D" or "var(--color-brand-teal-500)".'),
  theme: z.enum(['light', 'dark']).default('light').describe('light changes the main value, dark the dark value.'),
};

const editElementSchema = z.object(editElementShape).strict();
const setTokenSchema = z.object(setTokenShape).strict();

type EditElementArgs = z.input<typeof editElementSchema>;
type SetTokenArgs = z.input<typeof setTokenSchema>;

function text(message: string): ToolText {
  return { content: [{ type: 'text', text: message }] };
}

function failure(message: string): ToolText {
  return { content: [{ type: 'text', text: message }], isError: true };
}

export function refusal(ctx: AgentRunContext, tool: string): string | null {
  if (ctx.request.plan) return 'Plan mode is on, so files stay as they are. Reply with the plan; the user approves it before the build.';
  if (ctx.request.mode === 'critique') return `${tool} is not available in critique runs.`;
  return null;
}

export function writeProblem(ctx: AgentRunContext, relative: string): string | null {
  const policy = { workTree: ctx.direction.workTree, mode: ctx.request.mode, allowBash: false, allowInstall: false, ...(ctx.project.designSystemFor ? { readOnlyDirs: [SOURCE_DIR] } : {}) };
  const result = evaluateToolUse(policy, 'Write', { file_path: relative });
  return result.behavior === 'deny' ? result.message : null;
}

async function findElements(deps: DirectToolDeps, page: string | undefined, selectors: string[]): Promise<SelectionContext[]> {
  if (!deps.ctx.previewUrl) throw new DirectEditError('invalid_request', 'Preview is not running for this direction, so elements cannot be found. Edit the file instead.');
  const found = await describeElements(deps.preview, withPagePath(deps.ctx.previewUrl, page || undefined), selectors);
  return found.map((element, index) => {
    const selector = selectors[index] ?? '';
    if (!element) throw new DirectEditError('element_not_found', `No element matches ${selector} on the page.`);
    if (!element.source) throw new DirectEditError('element_not_found', `${selector} has no source location (it may come from a component or a script). Edit the file instead.`);
    return element;
  });
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function structureEdit(deps: DirectToolDeps, input: z.output<typeof editElementSchema>, op: StructureOp): Promise<ToolText> {
  const selectors = op === 'move' && input.targetSelector ? [input.selector, input.targetSelector] : [input.selector];
  const [element, parent] = await findElements(deps, input.path, selectors);
  if (!element?.source) return failure(`No element matches ${input.selector}.`);
  const target = { source: element.source, selector: input.selector, tag: element.tag };
  const raw = { op, targets: [target], ...(parent?.source ? { into: { source: parent.source, selector: input.targetSelector, tag: parent.tag } } : {}) };
  const plan = await planStructureEdit(deps.ctx.direction.workTree, raw);
  if (plan.changed.length === 0) return text('Nothing changed.');
  for (const file of plan.changed) {
    const problem = writeProblem(deps.ctx, file.target.relative);
    if (problem) return failure(problem);
  }
  for (const file of plan.changed) await writeAtomic(file.target.file, file.code);
  const select = plan.changed.flatMap((file) => file.select).map((loc) => `${loc.file}:${loc.line}:${loc.col}`);
  return text(`${plan.title} in ${plan.changed.map((file) => file.target.relative).join(', ')}.${select.length > 0 ? ` New location: ${select.join(', ')}.` : ''} ${RUN_NOTE}`);
}

async function styleEdit(deps: DirectToolDeps, input: z.output<typeof editElementSchema>): Promise<ToolText> {
  const [element] = await findElements(deps, input.path, [input.selector]);
  if (!element?.source) return failure(`No element matches ${input.selector}.`);
  const workTree = deps.ctx.direction.workTree;
  const style = Object.fromEntries(Object.entries(input.style ?? {}).filter(([, value]) => value !== undefined));
  const request = parseDirectEditRequest({ source: element.source, selector: input.selector, tag: element.tag, ...(Object.keys(style).length > 0 ? { style } : {}), ...(input.text !== undefined ? { text: input.text, hints: textHintsOf(element) } : {}), ...(input.classes ? { classes: input.classes } : {}), ...(input.variant ? { variant: input.variant } : {}) });
  const origin = deps.ctx.previewUrl ? new URL(deps.ctx.previewUrl).origin : null;
  const plan = await planDirectEdit(workTree, request, await knownTokenVars(workTree), { projectKind: deps.ctx.project.kind, previewOrigin: async () => origin });
  const problem = writeProblem(deps.ctx, plan.target.relative);
  if (problem) return failure(problem);
  if (plan.patch.code === plan.original) return text(`${plan.target.relative}: the values were already set.`);
  await writeAtomic(plan.target.file, plan.patch.code);
  const parts = [...plan.patch.applied.style, ...(plan.patch.applied.classes ? ['classes'] : []), ...(plan.patch.applied.text ? ['text'] : [])];
  const tailwind = plan.patch.tailwind;
  const classNote = tailwind && tailwind.mode !== 'none' ? ` Classes now: ${tailwind.classes.join(' ') || '(none)'}.${tailwind.note ? ` ${tailwind.note}` : ''}` : '';
  const found = plan.patch.textSource;
  if (found) return text(`Edited ${found.what} in ${found.file}:${found.line}, where the text of ${input.selector} comes from.${found.shared ? ` ${found.shared}` : ''} ${RUN_NOTE}`);
  return text(`Edited ${plan.patch.tag} (${parts.join(', ')}) at ${plan.target.relative}:${element.source.line}.${classNote} ${RUN_NOTE}`);
}

export async function runEditElement(deps: DirectToolDeps, args: EditElementArgs): Promise<ToolText> {
  const blocked = refusal(deps.ctx, 'edit_element');
  if (blocked) return failure(blocked);
  const parsed = editElementSchema.safeParse(args);
  if (!parsed.success) return failure(`edit_element: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`);
  const input = parsed.data;
  const hasChange = input.text !== undefined || Object.keys(input.style ?? {}).length > 0 || (input.classes?.add?.length ?? 0) + (input.classes?.remove?.length ?? 0) > 0;
  if (input.op === undefined && !hasChange) return failure('edit_element needs style, text or classes, or op.');
  if (input.op !== undefined && (hasChange || input.variant !== undefined)) return failure('Pass op alone, or style/text/classes without op.');
  if ((input.op === 'move') !== (input.targetSelector !== undefined)) return failure('op move needs targetSelector; other ops take none.');
  try {
    return input.op ? await structureEdit(deps, input, input.op) : await styleEdit(deps, input);
  } catch (error) {
    return failure(`edit_element failed: ${describeError(error)}`);
  }
}

export async function runSetToken(deps: DirectToolDeps, args: SetTokenArgs): Promise<ToolText> {
  const blocked = refusal(deps.ctx, 'set_token');
  if (blocked) return failure(blocked);
  const parsed = setTokenSchema.safeParse(args);
  if (!parsed.success) return failure(`set_token: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`);
  const input = parsed.data;
  const { project, direction } = deps.ctx;
  const workTree = direction.workTree;
  try {
    const state = await readDesignSystemState(project, direction);
    const entry = state.entries.find((item) => item.cssVar === input.name || item.path === input.name);
    if (!entry) return failure(state.entries.length === 0 ? 'This design has no tokens.' : `No token ${input.name}. Read design-system/tokens.json (or the app token CSS file) for the names.`);
    const change = input.theme === 'dark' ? { path: entry.path, darkValue: input.value } : { path: entry.path, value: input.value };
    const app = await appTokensFor(project, direction);
    if (app) {
      const loaded = await readAppTokensAt(workTree, app.file);
      if (!loaded) return failure('The app token file is gone.');
      const problem = writeProblem(deps.ctx, loaded.file);
      if (problem) return failure(problem);
      const next = plannedCssText(loaded, [change]);
      if (next === loaded.text) return text(`${entry.cssVar} is already ${input.value}.`);
      await writeFileAtomic(loaded.absolute, next);
      return text(`Set ${entry.cssVar}${input.theme === 'dark' ? ' (dark)' : ''} to ${input.value} in ${loaded.file}. ${RUN_NOTE}`);
    }
    const problem = writeProblem(deps.ctx, TOKENS_FILE);
    if (problem) return failure(problem);
    const next = await plannedTokensText(workTree, [change]);
    if (next === null) return text(`${entry.cssVar} is already ${input.value}.`);
    await writeTokensText(workTree, next);
    return text(`Set ${entry.cssVar}${input.theme === 'dark' ? ' (dark)' : ''} to ${input.value} in ${TOKENS_FILE}; tokens.css was rebuilt. ${RUN_NOTE}`);
  } catch (error) {
    return failure(`set_token failed: ${describeError(error)}`);
  } finally {
    invalidateTokenSource(workTree);
  }
}

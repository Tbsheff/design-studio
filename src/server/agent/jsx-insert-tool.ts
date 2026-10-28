import { z } from 'zod';
import { JSX_IMPORTS_MAX, JSX_INSERT_POSITIONS, JSX_SNIPPET_MAX } from '../../shared/insert.js';
import { writeAtomic } from '../direct-edit/index.js';
import { planInsertJsx } from '../direct-edit/jsx-insert.js';
import { refusal, writeProblem, type DirectToolDeps } from './direct-tools.js';
import { targetOf } from './insert-tool.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

export const insertJsxShape = {
  jsx: z.string().min(1).max(JSX_SNIPPET_MAX).describe('JSX snippet: one or more elements with library components and token classes, for example <Card><CardHeader><CardTitle>Title</CardTitle></CardHeader></Card>. HTML in an HTML project.'),
  targetSelector: z.string().trim().min(1).max(2000).optional().describe('CSS selector of the target element on the live page.'),
  targetSource: z.string().trim().max(1100).optional().describe('Or the target as file:line:col of its JSX tag, for example "src/App.tsx:12:7".'),
  path: z.string().trim().max(300).optional().describe('Page path. Leave out for the entry page.'),
  position: z.enum(JSX_INSERT_POSITIONS as ['inside', 'before', 'after', 'replace']).default('inside').describe('inside: after the last child. before / after: a sibling. replace: in place of the target.'),
  imports: z
    .record(z.string().regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/), z.string().trim().min(1).max(1000))
    .refine((value) => Object.keys(value).length <= JSX_IMPORTS_MAX)
    .optional()
    .describe('Only when two library components have the same name: name to component file.'),
};

const schema = z.object(insertJsxShape).strict();

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

export async function runInsertJsx(deps: DirectToolDeps, args: z.input<typeof schema>): Promise<ToolText> {
  const blocked = refusal(deps.ctx, 'insert_jsx');
  if (blocked) return text(blocked, true);
  const parsed = schema.safeParse(args);
  if (!parsed.success) return text(`insert_jsx: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`, true);
  const input = parsed.data;
  if ((input.targetSelector === undefined) === (input.targetSource === undefined)) return text('Pass targetSelector or targetSource, not both.', true);
  try {
    const target = await targetOf(deps, input);
    if (typeof target === 'string') return text(target, true);
    const { project, direction, previewUrl } = deps.ctx;
    const previewOrigin = previewUrl && project.kind === 'react' ? new URL(previewUrl).origin : null;
    const plan = await planInsertJsx({ project, workTree: direction.workTree, previewOrigin }, { target, position: input.position, jsx: input.jsx, ...(input.imports ? { imports: input.imports } : {}) });
    const problem = writeProblem(deps.ctx, plan.target.relative);
    if (problem) return text(problem, true);
    await writeAtomic(plan.target.file, plan.code);
    const at = plan.select.map((item) => `${item.file}:${item.line}:${item.col}`).join(', ');
    const added = plan.imports.filter((item) => item.added).map((item) => `${item.name} from "${item.specifier}"`);
    const imported = added.length > 0 ? ` Imports added: ${added.join(', ')}.` : '';
    return text(`${plan.title} at ${at}.${imported} The run saves this change in its version, like your file edits.`);
  } catch (error) {
    return text(`insert_jsx failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

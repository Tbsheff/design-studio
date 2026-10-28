import { z } from 'zod';
import { PROP_NAME, PROP_TEXT_MAX, PROPS_MAX } from '../../shared/props.js';
import { probeOwners } from '../components/owner-probe.js';
import { resolveInstance } from '../components/use-site.js';
import { writeAtomic } from '../direct-edit/index.js';
import { parseSetProps, planSetProps } from '../direct-edit/props.js';
import { withPagePath } from '../export/source.js';
import { refusal, writeProblem, type DirectToolDeps } from './direct-tools.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const LOC = /^(.+):(\d+):(\d+)$/;

export const setPropsShape = {
  selector: z.string().trim().min(1).max(2000).optional().describe('CSS selector of an element inside the component instance on the live page. The nearest component with props (such as <Button>) is changed.'),
  path: z.string().trim().max(300).optional().describe('Page path. Leave out for the entry page.'),
  source: z.string().trim().max(1100).optional().describe('Or the use site as file:line:col of the JSX tag, for example "src/App.tsx:14:9".'),
  props: z.record(z.string().regex(PROP_NAME), z.union([z.string().max(PROP_TEXT_MAX), z.number(), z.boolean(), z.null()])).describe(`1 to ${PROPS_MAX} props. null removes a prop; a value equal to the default removes the attribute.`),
};

const schema = z.object(setPropsShape).strict();

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

async function useSite(deps: DirectToolDeps, input: z.output<typeof schema>): Promise<{ file: string; line: number; col: number } | string> {
  if (input.source) {
    const match = LOC.exec(input.source);
    return match ? { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) } : 'source must be file:line:col.';
  }
  if (!input.selector) return 'Pass selector or source.';
  if (!deps.ctx.previewUrl) return 'Preview is not running for this direction. Pass source instead.';
  const probed = await probeOwners(deps.preview, withPagePath(deps.ctx.previewUrl, input.path || undefined), input.selector);
  if (!probed) return `No element matches ${input.selector} on the page.`;
  const instance = await resolveInstance({ workTree: deps.ctx.direction.workTree, previewOrigin: new URL(deps.ctx.previewUrl).origin }, { owners: probed.owners });
  return instance ? instance.use : `${input.selector} is not inside a component instance with props. Edit the JSX instead.`;
}

export async function runSetProps(deps: DirectToolDeps, args: z.input<typeof schema>): Promise<ToolText> {
  const blocked = refusal(deps.ctx, 'set_props');
  if (blocked) return text(blocked, true);
  const parsed = schema.safeParse(args);
  if (!parsed.success) return text(`set_props: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`, true);
  try {
    const source = await useSite(deps, parsed.data);
    if (typeof source === 'string') return text(source, true);
    const request = parseSetProps({ source, props: parsed.data.props });
    const { target, original, instance, plan } = await planSetProps(deps.ctx.direction.workTree, request);
    const problem = writeProblem(deps.ctx, target.relative);
    if (problem) return text(problem, true);
    if (plan.code === original) return text(`<${instance.tag}> at ${target.relative}:${instance.use.line} already has these props.`);
    await writeAtomic(target.file, plan.code);
    const parts = [...plan.changed.map((name) => `${name}=${JSON.stringify(parsed.data.props[name])}`), ...plan.removed.map((name) => `removed ${name}`)];
    return text(`Set <${instance.tag}> ${parts.join(', ')} at ${target.relative}:${instance.use.line}. The run saves this change in its version, like your file edits.`);
  } catch (error) {
    return text(`set_props failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

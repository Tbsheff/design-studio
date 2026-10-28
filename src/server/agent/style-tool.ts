import { z } from 'zod';
import { SEARCH_PROPERTIES, STYLE_KINDS, STYLE_REPLACE_MAX, STYLE_TOKEN_MAX, matchesOf, replaceSummary, type StyleQuery } from '../../shared/style-search.js';
import { findFrame } from '../canvas/tools.js';
import { writeAtomic } from '../direct-edit/index.js';
import { planStyleReplace } from '../direct-edit/replace.js';
import { scanPageStyles, styleReport, tokenEntriesFor, tokenLookupFor } from '../direct-edit/style-scan.js';
import { DEFAULT_FRAME_STATE } from '../../shared/frame-state.js';
import { isContextFrame, pageUrl } from './run-target.js';
import { canvasFrames, refusal, writeProblem, type DirectToolDeps } from './direct-tools.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const property = z.enum([...STYLE_KINDS, ...SEARCH_PROPERTIES] as [string, ...string[]]).optional().describe('color, font-size, radius, spacing, or one CSS property such as background-color or padding-top. Leave out for all.');
const value = z.string().trim().min(1).max(200).optional().describe('Value to match, for example "#1c1f23" or "14px". Compared with the computed value.');
const scope = {
  frame: z.string().trim().min(1).max(60).optional().describe('Canvas frame id or @label; its page and size are used. Leave out for the frame from <canvas-context> (or the entry page at 1440x900).'),
  property,
  value,
};

export const findStylesShape = { ...scope, className: z.string().trim().min(1).max(120).optional().describe('Only elements with this class.') };
export const replaceStyleShape = { ...scope, token: z.string().trim().min(1).max(STYLE_TOKEN_MAX).describe('A CSS variable ("--primary") or, in a Tailwind project, a theme class ("bg-primary", "text-sm", "rounded-lg", "p-4").') };

const findSchema = z.object(findStylesShape).strict();
const replaceSchema = z.object(replaceStyleShape).strict().refine((input) => input.value !== undefined, 'replace_style needs value');

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

function issues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ');
}

async function pageOf(deps: DirectToolDeps, ref: string | undefined): Promise<{ url: string; viewport: { width: number; height: number } }> {
  if (!deps.ctx.previewUrl) throw new Error('Preview is not running for this direction, so styles cannot be scanned.');
  const target = deps.ctx.target;
  if (target && (!ref || isContextFrame(deps.ctx, ref))) return { url: pageUrl(deps.ctx.previewUrl, target.path, target.state), viewport: { width: target.width, height: target.height } };
  const frames = ref ? await canvasFrames(deps) : [];
  const frame = ref ? findFrame(frames, ref) : null;
  if (ref && !frame && ref !== 'f1') throw new Error(`No frame ${ref} on the canvas.`);
  const state = frame && frame.id === target?.id ? target.state : DEFAULT_FRAME_STATE;
  return { url: pageUrl(deps.ctx.previewUrl, frame?.path ?? '', state), viewport: frame ? { width: frame.width, height: frame.height } : { width: 1440, height: 900 } };
}

function queryOf(input: { property?: string; value?: string; className?: string }): StyleQuery {
  return { ...(input.property ? { property: input.property as StyleQuery['property'] } : {}), ...(input.value ? { value: input.value } : {}), ...(input.className ? { className: input.className } : {}) };
}

export async function runFindStyles(deps: DirectToolDeps, args: z.input<typeof findSchema>): Promise<ToolText> {
  const parsed = findSchema.safeParse(args);
  if (!parsed.success) return text(`find_styles: ${issues(parsed.error)}`, true);
  try {
    const page = await pageOf(deps, parsed.data.frame);
    const result = await scanPageStyles(deps.preview, page.url, page.viewport, queryOf(parsed.data));
    const report = styleReport(result, tokenLookupFor(await tokenEntriesFor(deps.ctx.project, deps.ctx.direction)));
    return text(JSON.stringify(report, null, 2));
  } catch (error) {
    return text(`find_styles failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

export async function runReplaceStyle(deps: DirectToolDeps, args: z.input<typeof replaceSchema>): Promise<ToolText> {
  const blocked = refusal(deps.ctx, 'replace_style');
  if (blocked) return text(blocked, true);
  const parsed = replaceSchema.safeParse(args);
  if (!parsed.success) return text(`replace_style: ${issues(parsed.error)}`, true);
  try {
    const page = await pageOf(deps, parsed.data.frame);
    const matches = matchesOf((await scanPageStyles(deps.preview, page.url, page.viewport, queryOf(parsed.data))).hits).slice(0, STYLE_REPLACE_MAX);
    if (matches.length === 0) return text(`No element with a source location uses ${parsed.data.value ?? 'that value'}.`);
    const plan = await planStyleReplace(deps.ctx.direction.workTree, deps.ctx.project.kind, { matches, token: parsed.data.token });
    for (const file of plan.changed) {
      const problem = writeProblem(deps.ctx, file.target.relative);
      if (problem) return text(problem, true);
    }
    for (const file of plan.changed) await writeAtomic(file.target.file, file.code);
    const files = plan.changed.map((file) => file.target.relative).join(', ');
    const classes = plan.wrote === 'classes' || plan.wrote === 'mixed' ? ` Wrote classes.` : '';
    return text(`${replaceSummary(plan, parsed.data.token)}.${files ? ` Files: ${files}.` : ''}${classes} The run saves this change in its version, like your file edits.`);
  } catch (error) {
    return text(`replace_style failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

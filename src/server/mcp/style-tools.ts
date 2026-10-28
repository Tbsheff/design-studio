import { z } from 'zod';
import type { Project } from '../../shared/contracts.js';
import { SEARCH_PROPERTIES, STYLE_KINDS, STYLE_REPLACE_MAX, STYLE_TOKEN_MAX, matchesOf, replaceSummary, type StyleQuery, type StyleReplaceResult } from '../../shared/style-search.js';
import { findFrame, frameRef } from '../canvas/tools.js';
import { scanPageStyles, styleReport, tokenEntriesFor, tokenLookupFor } from '../direct-edit/style-scan.js';
import { EditError, loadTarget, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, defineTool, directionId, ok, pageUrl, projectId, versionActivity, type Done } from './edit-kit.js';

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
const property = z.enum([...STYLE_KINDS, ...SEARCH_PROPERTIES] as [string, ...string[]]).describe('A kind (color, font-size, radius, spacing) or one CSS property (color, background-color, border-color, font-size, border-radius, padding-top … margin-left, gap). Leave out for all of them.');
const value = z.string().trim().min(1).max(200).describe('Value to match, for example "#1c1f23", "14px" or "0.75rem". It is compared with the computed value, so 1rem finds 16px, and colors compare in one color space with a small delta: #009966 also finds rgb(0, 153, 102) and the lab()/oklch() colors of Tailwind v4.');
const frame = frameRef.optional().describe('Canvas frame id or @label from canvas_list. Its page, size and direction are used. Default f1, the entry page.');
const source = z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict();
const match = z.object({ source, selector: z.string().min(1).max(2000), tag: z.string().max(60).optional(), property: z.enum(SEARCH_PROPERTIES as [string, ...string[]]), repeats: z.number().int().min(1).optional() }).strict();

const findSchema = z.object({ projectId, directionId, frame, property: property.optional(), value: value.optional(), className: z.string().trim().min(1).max(120).optional().describe('Only elements with this class, for example "p-[13px]".') }).strict();

const replaceSchema = z
  .object({
    projectId,
    directionId,
    frame,
    property: property.optional(),
    value: value.optional().describe('Replace every element in the frame with this value. Use this or matches.'),
    matches: z.array(match).min(1).max(STYLE_REPLACE_MAX).optional().describe('The matches from find_styles to change. Use this or value.'),
    token: z.string().trim().min(1).max(STYLE_TOKEN_MAX).describe('The token to write: a CSS variable ("--primary" or "var(--primary)") or, in a Tailwind project, a theme class ("bg-primary", "text-sm", "rounded-lg", "p-4"). In a Tailwind project the server writes classes, not inline style.'),
  })
  .strict()
  .refine((input) => (input.value === undefined) !== (input.matches === undefined), 'pass value or matches, not both');

interface FrameTarget {
  project: Project;
  direction: Project['directions'][number];
  page: string | undefined;
  viewport: { width: number; height: number };
  frameId: string;
}

async function frameTarget(deps: EditDeps, input: { projectId: string; directionId?: string; frame?: string }): Promise<FrameTarget> {
  const ref = input.frame ?? 'f1';
  const loaded = await loadTarget(deps, input.projectId, input.directionId);
  const frames = (await deps.canvas.read(loaded.project)).canvas?.frames ?? [];
  const found = findFrame(frames, ref);
  if (!found && !(frames.length === 0 && ref === 'f1')) throw new EditError(`No frame ${ref} on the canvas. Use canvas_list for the frame ids.`);
  const { project, direction } = found?.directionId && input.directionId === undefined ? await loadTarget(deps, input.projectId, found.directionId) : loaded;
  return { project, direction, page: found?.path || undefined, viewport: found ? { width: found.width, height: found.height } : DEFAULT_VIEWPORT, frameId: found?.id ?? 'f1' };
}

function queryOf(input: { property?: string; value?: string; className?: string }): StyleQuery {
  return { ...(input.property ? { property: input.property as StyleQuery['property'] } : {}), ...(input.value ? { value: input.value } : {}), ...(input.className ? { className: input.className } : {}) };
}

async function scanFrame(deps: EditDeps, target: FrameTarget, query: StyleQuery) {
  const url = await pageUrl(deps, target.project, target.direction, target.page);
  return scanPageStyles(deps.preview, url, target.viewport, query);
}

const findStyles = defineTool(
  'find_styles',
  findSchema,
  {
    title: 'Find styles',
    description: 'List the colors, font sizes, radii and spacing used in one canvas frame, like the Selection colors panel of the studio inspector: each distinct value with its element count, the token or class it comes from, and state token, palette (a Tailwind palette class such as text-slate-500, not a project token), raw or mixed; color rows also give hex. With value (and property) it lists the matching elements as matches with their source file:line:col, the same as "Select all with this value" in the inspector; pass them to replace_style. Inherited values count only on the element that sets them. Read only.',
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const target = await frameTarget(deps, input);
    const result = await scanFrame(deps, target, queryOf(input));
    const report = styleReport(result, tokenLookupFor(await tokenEntriesFor(target.project, target.direction)));
    const note = report.unlocated > 0 ? `${report.unlocated} matching element(s) have no source location and cannot be replaced.` : undefined;
    return { result: ok({ frame: target.frameId, page: target.page ?? '', viewport: target.viewport, ...report, ...(note ? { note } : {}) }) };
  },
);

const replaceStyle = defineTool(
  'replace_style',
  replaceSchema,
  {
    title: 'Replace style with token',
    description: 'Rewrite one style value to a token on many elements at once, with the same code path as "Replace with token…" in the studio inspector: pass the matches from find_styles, or value (and property) to replace it everywhere in the frame. In a Tailwind project it writes theme classes (text-[#1c1f23] becomes text-primary). Elements made by .map(), elements whose className is built in code, and shared elements where only some copies use the value are skipped; the result lists each skip with a count and reason. All changes are one version and one undo step.',
  },
  async (deps, input): Promise<Done> => {
    const target = await frameTarget(deps, input);
    refuseWhileRunning(deps, target.project, target.direction);
    const matches = input.matches ?? matchesOf((await scanFrame(deps, target, queryOf(input))).hits).slice(0, STYLE_REPLACE_MAX);
    if (matches.length === 0) return { result: ok({ replaced: 0, note: `No element in frame ${target.frameId} with a source location uses ${input.value ?? 'that value'}.` }) };
    const body = { replaceStyle: { matches, token: input.token } };
    const result = await studioCall<StyleReplaceResult>(deps, 'POST', `${base(target.project, target.direction.id)}/direct-edit`, body);
    const summary = replaceSummary(result, input.token);
    const output = { replaced: result.replaced, elements: result.sites, files: result.files, wrote: result.wrote, classes: result.classes, value: result.value, skipped: result.skipped, versionId: result.replaced > 0 ? (result.version?.id ?? null) : null, summary };
    return { result: ok(output), ...(result.replaced > 0 ? { activity: versionActivity(target.project, target.direction, summary, result.version) } : {}) };
  },
);

export const STYLE_TOOLS = [findStyles, replaceStyle];

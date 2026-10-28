import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { IMAGE_ALT_MAX, IMAGE_FITS, IMAGE_MODES, imageKindOf } from '../../shared/image.js';
import type { SourceLoc } from '../../shared/contracts.js';
import { probeOwners } from '../components/owner-probe.js';
import { imageFromPath, imageFromUrl, type ImageBytes } from '../direct-edit/image-source.js';
import { parseSetImage, planChanged, planSetImage, writeImagePlan } from '../direct-edit/image.js';
import { describeElements } from '../mcp/element.js';
import { resolveSelectors } from './kit-tools.js';
import { refusal, writeProblem, type DirectToolDeps } from './direct-tools.js';
import { editPageUrl } from './run-target.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const LOC = /^(.+):(\d+):(\d+)$/;

export const SET_IMAGE_AGENT_DESCRIPTION =
  'Place or change an image with the same server code as the MCP set_image tool and the inspector Image section. On an <img> it copies the file into the project (the app public/ folder for Next and Vite, assets/ for HTML) with a content-hashed name and writes src, alt, fit (object-fit) and focal (object-position); on an element with a background image it writes background-image, size and position; on other elements it inserts an <img> inside (or after). path is an image file in the project or an attached image; url must be https, 10 MB at most, an image type. page is the page path. Use it instead of writing image files or src by hand.';

export const setImageShape = {
  selector: z.string().trim().min(1).max(2000).optional().describe('CSS selector or layer id of the element on the live page.'),
  source: z.string().trim().max(1100).optional().describe('Or the element as file:line:col of its tag.'),
  page: z.string().trim().max(300).optional().describe('Page path. Leave out for the page of the frame in <canvas-context> (or the entry page).'),
  path: z.string().trim().min(1).max(1000).optional().describe('Image file: a path in the project, or the path or name of an image the user attached.'),
  url: z.string().trim().url().max(2000).optional().describe('https URL of the image (10 MB at most, image types only).'),
  fit: z.enum(IMAGE_FITS).optional(),
  focal: z.string().trim().max(40).optional().describe('Focal point "x% y%", for example "50% 30%".'),
  alt: z.string().max(IMAGE_ALT_MAX).nullable().optional().describe('Alt text of an <img>; "" marks it as decorative.'),
  mode: z.enum(IMAGE_MODES).optional(),
  position: z.enum(['inside', 'after']).optional().describe('For insert: inside (default) or after the element.'),
};

const schema = z.object(setImageShape).strict();
type Input = z.output<typeof schema>;

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

function imageFile(deps: DirectToolDeps, raw: string): string {
  const attached = deps.ctx.attachments.find((item) => item.path === raw || item.name === raw || item.id === raw);
  if (attached) return attached.path;
  const root = path.resolve(deps.ctx.direction.workTree);
  const file = path.resolve(root, raw);
  if (!file.startsWith(root + path.sep)) throw new Error(`${raw} is outside the project. Pass a file in the project or an attached image.`);
  return file;
}

async function loadImage(deps: DirectToolDeps, input: Input): Promise<ImageBytes | null> {
  if (input.url) return imageFromUrl(input.url);
  return input.path ? imageFromPath(imageFile(deps, input.path)) : null;
}

async function targetFor(deps: DirectToolDeps, input: Input) {
  if (input.source) {
    const match = LOC.exec(input.source);
    if (!match) throw new Error('source must be file:line:col.');
    const source: SourceLoc = { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) };
    const line = (await readFile(path.join(deps.ctx.direction.workTree, source.file), 'utf8').catch(() => '')).split('\n')[source.line - 1] ?? '';
    const tag = /^<([A-Za-z][\w.]*)/.exec(line.slice(source.col - 1))?.[1] ?? 'element';
    return { source, tag: /^(img|Image)$/.test(tag) ? 'img' : tag };
  }
  if (!input.selector) throw new Error('Pass selector or source.');
  if (!deps.ctx.previewUrl) throw new Error('Preview is not running for this direction. Pass source instead.');
  const url = editPageUrl(deps.ctx, input.page);
  const [element] = await describeElements(deps.preview, url, [input.selector]);
  if (!element) throw new Error(`No element matches ${input.selector} on the page.`);
  const probed = await probeOwners(deps.preview, url, input.selector).catch(() => null);
  if (!element.source && !probed?.owners.length) throw new Error(`${input.selector} has no source location. Pass source (file:line:col).`);
  return { source: element.source, tag: element.tag, selector: input.selector, background: imageKindOf(element) === 'background', ...(probed?.owners.length ? { owners: probed.owners } : {}) };
}

async function resolved(deps: DirectToolDeps, input: Input): Promise<Input> {
  const out = await resolveSelectors(deps, { selector: input.selector, path: input.page });
  return { ...input, selector: out.selector, page: out.path };
}

export async function runSetImage(deps: DirectToolDeps, args: z.input<typeof schema>): Promise<ToolText> {
  const blocked = refusal(deps.ctx, 'set_image');
  if (blocked) return text(blocked, true);
  const parsed = schema.safeParse(args);
  if (!parsed.success) return text(`set_image: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`, true);
  if ((parsed.data.selector === undefined) === (parsed.data.source === undefined)) return text('Pass selector or source, not both.', true);
  try {
    const input = await resolved(deps, parsed.data);
    const target = await targetFor(deps, input);
    const request = parseSetImage({ target, mode: input.mode, fit: input.fit, focal: input.focal, alt: input.alt, position: input.position });
    const { project, direction, previewUrl } = deps.ctx;
    const plan = await planSetImage({ project, workTree: direction.workTree, previewOrigin: previewUrl && project.kind === 'react' ? new URL(previewUrl).origin : null }, request, await loadImage(deps, input));
    for (const relative of [plan.target.relative, ...(plan.asset ? [plan.asset.relative] : [])]) {
      const problem = writeProblem(deps.ctx, relative);
      if (problem) return text(problem, true);
    }
    if (!planChanged(plan)) return text(`${plan.title}: the file already has this image.`);
    await writeImagePlan(plan);
    const at = plan.select?.[0];
    const where = at ? `${at.file}:${at.line}:${at.col}` : plan.target.relative;
    return text(`${plan.title} at ${where}${plan.asset ? `, src ${plan.asset.src} (${plan.asset.relative})` : ''}. The run saves this change in its version, like your file edits.`);
  } catch (error) {
    return text(`set_image failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

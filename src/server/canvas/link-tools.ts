import { z } from 'zod';
import type { CanvasFileFrame } from '../../shared/canvas-file.js';
import {
  cleanLinkSelector,
  cleanLinkText,
  isBackTarget,
  isIdSelector,
  LINK_ISSUE_TEXT,
  LINK_SELECTOR_MAX,
  LINK_TRANSITIONS,
  startFrameOf,
  staticLinkIssue,
  textAgrees,
  upsertLink,
  type LinkIssue,
  type LinksFile,
  type LinkTransition,
  type PrototypeLink,
} from '../../shared/links.js';
import type { Direction, Project } from '../../shared/contracts.js';
import { withPagePath } from '../export/source.js';
import type { PreviewService } from '../types.js';
import { findFrame, frameRef, type CanvasToolContext, type ToolText } from './tools.js';

export const BACK_REF = 'back';

export const linkSpecSchema = z
  .object({
    fromFrame: frameRef.describe('Frame id or @label of the frame that has the element.'),
    selector: z.string().trim().min(1).max(LINK_SELECTOR_MAX).describe('CSS selector of the element to click, for example "#sign-in" or "button.primary".'),
    toFrame: frameRef.describe('Frame id or @label to go to on click, or "back" to go back to the frame before.'),
    transition: z.enum(LINK_TRANSITIONS).optional().describe('instant (default), dissolve, slide-left or slide-right.'),
  })
  .strict();

export type LinkSpec = z.output<typeof linkSpecSchema>;

export interface ProbedElement {
  tag: string;
  text: string;
}

export type LinkProbe = (frame: CanvasFileFrame, selectors: string[]) => Promise<(ProbedElement | null)[]>;

export class LinkError extends Error {}

function text(value: unknown): ToolText {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] };
}

function failure(message: string): ToolText {
  return { content: [{ type: 'text', text: message }], isError: true };
}

async function framesOf(ctx: CanvasToolContext): Promise<CanvasFileFrame[]> {
  const frames = (await ctx.canvas.read(ctx.project)).canvas?.frames ?? [];
  return frames.length > 0 ? frames : [{ id: 'f1', width: 1440, height: 900, x: 0, y: 0, order: 0 }];
}

function frameOf(frames: CanvasFileFrame[], ref: string): CanvasFileFrame {
  const frame = findFrame(frames, ref);
  if (!frame) throw new LinkError(`No frame ${ref}. Call canvas_list for the ids and labels.`);
  return frame;
}

function frameTitle(frames: readonly CanvasFileFrame[], id: string): string {
  const frame = frames.find((item) => item.id === id);
  return frame?.label ?? frame?.path ?? (id === 'f1' ? 'the first frame' : id);
}

export function linkTitle(link: PrototypeLink, frames: readonly CanvasFileFrame[]): string {
  const target = isBackTarget(link.to) ? 'Back' : frameTitle(frames, link.to.frame);
  const what = link.from.text ? `“${link.from.text}”` : link.from.selector;
  return `${what} in ${frameTitle(frames, link.from.frame)} → ${target}`;
}

export function probeWithPreview(preview: Pick<PreviewService, 'directionUrl' | 'withPage'>, project: Project, fallback: Direction, describe: (url: string, selectors: string[]) => Promise<({ tag: string; text: string } | null)[]>): LinkProbe {
  return async (frame, selectors) => {
    const direction = project.directions.find((item) => item.id === frame.directionId) ?? fallback;
    const url = withPagePath(await preview.directionUrl(project, direction), frame.path || undefined);
    const found = await describe(url, selectors);
    return found.map((element) => (element ? { tag: element.tag, text: element.text } : null));
  };
}

function elementIssue(link: PrototypeLink, found: ProbedElement | null): LinkIssue | null {
  if (!found) return 'element-missing';
  if (link.from.tag && found.tag !== link.from.tag) return 'element-missing';
  if (!isIdSelector(link.from.selector) && !textAgrees(found.text, link.from.text)) return 'element-missing';
  return null;
}

function describeLink(link: PrototypeLink, frames: readonly CanvasFileFrame[], issue: LinkIssue | null, start: string) {
  return {
    id: link.id,
    fromFrame: link.from.frame,
    page: link.from.path || '(entry page)',
    selector: link.from.selector,
    ...(link.from.text ? { text: link.from.text } : {}),
    toFrame: isBackTarget(link.to) ? BACK_REF : link.to.frame,
    transition: link.transition,
    title: linkTitle(link, frames),
    broken: issue ? LINK_ISSUE_TEXT[issue] : null,
    ...(link.from.frame === start ? { onStartFrame: true } : {}),
  };
}

export async function listLinks(ctx: CanvasToolContext, probe?: LinkProbe): Promise<ToolText> {
  const frames = await framesOf(ctx);
  const file = await ctx.canvas.links.read(ctx.project);
  const issues = new Map<string, LinkIssue | null>(file.links.map((link) => [link.id, staticLinkIssue(link, frames)]));
  let checked = false;
  if (probe) {
    const byFrame = new Map<string, PrototypeLink[]>();
    for (const link of file.links) if (issues.get(link.id) === null) byFrame.set(link.from.frame, [...(byFrame.get(link.from.frame) ?? []), link]);
    for (const [frameId, links] of byFrame) {
      const frame = frames.find((item) => item.id === frameId);
      if (!frame) continue;
      const found = await probe(frame, links.map((link) => link.from.selector)).catch(() => null);
      if (!found) continue;
      checked = true;
      links.forEach((link, index) => issues.set(link.id, elementIssue(link, found[index] ?? null)));
    }
  }
  const start = startFrameOf(file, frames);
  return text({
    startFrame: start,
    links: file.links.map((link) => describeLink(link, frames, issues.get(link.id) ?? null, start)),
    note: file.links.length === 0 ? 'No prototype links yet. add_link makes one; Play in the studio then starts at startFrame.' : checked ? 'Each link was checked against the rendered page.' : undefined,
  });
}

export async function addLink(ctx: CanvasToolContext, spec: LinkSpec, probe?: LinkProbe): Promise<{ result: ToolText; link?: PrototypeLink; title?: string }> {
  if (ctx.plan) return { result: failure('Plan mode is on, so the links stay as they are. Describe the links in the plan.') };
  if (ctx.mode === 'critique') return { result: failure('Links are not available in critique runs.') };
  try {
    const frames = await framesOf(ctx);
    const from = frameOf(frames, spec.fromFrame);
    const back = spec.toFrame.trim().toLowerCase() === BACK_REF;
    const to = back ? null : frameOf(frames, spec.toFrame);
    if (to && to.id === from.id) throw new LinkError('A link goes to another frame. Pick a different toFrame, or "back".');
    const selector = cleanLinkSelector(spec.selector);
    if (!selector) throw new LinkError('selector is empty or too long.');
    let hint: { tag?: string; text?: string } = {};
    if (probe) {
      const [found] = await probe(from, [selector]);
      if (!found) throw new LinkError(`No element matches ${selector} on ${from.path || 'the entry page'} of ${from.id}. Check the selector with get_frame_html.`);
      const label = cleanLinkText(found.text);
      hint = { tag: found.tag, ...(label ? { text: label } : {}) };
    }
    const transition: LinkTransition = spec.transition ?? 'instant';
    let saved: PrototypeLink | null = null;
    const file = await ctx.canvas.links.update(
      ctx.project,
      (current) => {
        const next = upsertLink(current, { from: { frame: from.id, path: from.path ?? '', selector, ...hint }, to: to ? { frame: to.id } : { back: true }, transition });
        saved = next.link;
        return next.file;
      },
      'agent',
    );
    const link = saved as PrototypeLink | null;
    if (!link) throw new LinkError('The link was not saved.');
    const title = linkTitle(link, frames);
    return { result: text({ link: describeLink(link, frames, null, startFrameOf(file, frames)), links: file.links.length }), link, title };
  } catch (error) {
    if (error instanceof LinkError) return { result: failure(error.message) };
    throw error;
  }
}

export async function removeLink(ctx: CanvasToolContext, id: string): Promise<{ result: ToolText; title?: string }> {
  if (ctx.plan) return { result: failure('Plan mode is on, so the links stay as they are.') };
  if (ctx.mode === 'critique') return { result: failure('Links are not available in critique runs.') };
  const frames = await framesOf(ctx);
  let removed: PrototypeLink | null = null;
  await ctx.canvas.links.update(
    ctx.project,
    (file) => {
      removed = file.links.find((link) => link.id === id) ?? null;
      return removed ? { ...file, links: file.links.filter((link) => link.id !== id) } : null;
    },
    'agent',
  );
  const link = removed as PrototypeLink | null;
  if (!link) return { result: failure(`No link ${id}. Call list_links for the ids.`) };
  const title = linkTitle(link, frames);
  return { result: text({ removed: id, title }), title };
}

export async function setStartFrame(ctx: CanvasToolContext, ref: string): Promise<{ result: ToolText; frame?: CanvasFileFrame }> {
  if (ctx.plan) return { result: failure('Plan mode is on, so the links stay as they are.') };
  if (ctx.mode === 'critique') return { result: failure('Links are not available in critique runs.') };
  try {
    const frames = await framesOf(ctx);
    const frame = frameOf(frames, ref);
    await ctx.canvas.links.update(ctx.project, (file): LinksFile => ({ ...file, start: frame.id }), 'agent');
    return { result: text({ startFrame: frame.id, label: frame.label ?? null, note: 'Play in the studio starts at this frame.' }), frame };
  } catch (error) {
    if (error instanceof LinkError) return { result: failure(error.message) };
    throw error;
  }
}

export function frameLabel(frame: CanvasFileFrame): string {
  return frame.label ?? frame.path ?? frame.id;
}

export const editLinksShape = {
  add: z.array(linkSpecSchema).max(20).optional().describe('Links to add (or replace, for the same element).'),
  remove: z.array(z.string().regex(/^l\d{1,5}$/)).max(50).optional().describe('Link ids from list_links to remove.'),
  startFrame: frameRef.optional().describe('Frame id or @label where Play starts.'),
};

export interface EditLinksArgs {
  add?: LinkSpec[];
  remove?: string[];
  startFrame?: string;
}

function firstText(result: ToolText): string {
  return result.content[0]?.text ?? '';
}

export async function editLinks(ctx: CanvasToolContext, args: EditLinksArgs, probe?: LinkProbe): Promise<ToolText> {
  const lines: string[] = [];
  let failed = false;
  for (const spec of args.add ?? []) {
    const done = await addLink(ctx, spec, probe);
    failed ||= done.result.isError === true;
    lines.push(done.result.isError ? `Not linked: ${firstText(done.result)}` : `Linked ${done.title ?? ''} (${done.link?.id ?? ''})`);
  }
  for (const id of args.remove ?? []) {
    const done = await removeLink(ctx, id);
    failed ||= done.result.isError === true;
    lines.push(done.result.isError ? `Not removed: ${firstText(done.result)}` : `Removed ${done.title ?? id}`);
  }
  if (args.startFrame) {
    const done = await setStartFrame(ctx, args.startFrame);
    failed ||= done.result.isError === true;
    lines.push(done.result.isError ? `Start frame not set: ${firstText(done.result)}` : `Play starts at ${done.frame ? frameLabel(done.frame) : args.startFrame}`);
  }
  if (lines.length === 0) return failure('Pass add, remove or startFrame.');
  return { content: [{ type: 'text', text: lines.join('\n') }], ...(failed ? { isError: true } : {}) };
}
